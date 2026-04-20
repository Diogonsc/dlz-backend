import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { getEventBusSettings } from '../event-bus.settings';
import { PrismaService } from '@dlz/prisma';

const MAX_SAMPLES = 2000;

@Injectable()
export class EventBusMetricsService {
  private readonly samples: number[] = [];

  constructor(
    @Inject('EVENT_BUS_REDIS') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  recordProcessingMs(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      return;
    }
    this.samples.push(ms);
    if (this.samples.length > MAX_SAMPLES) {
      this.samples.splice(0, this.samples.length - MAX_SAMPLES);
    }
  }

  private avgMs(): number | null {
    if (this.samples.length === 0) {
      return null;
    }
    const sum = this.samples.reduce((a, b) => a + b, 0);
    return sum / this.samples.length;
  }

  /** Formato texto Prometheus (gauge + contadores simples). */
  async buildPrometheusText(): Promise<string> {
    const s = getEventBusSettings(this.config);
    const lines: string[] = [];
    const streams = Array.from(new Set([s.streamKeys.orders, s.streamKeys.billing, s.streamKeys.realtime, s.streamKeys.fallback]));
    const dlq = s.dlqStreamKey;
    const group = s.groupName;

    let streamLen = 0;
    let dlqLen = 0;
    let pendingTotal = 0;
    const perStream: Array<{ stream: string; len: number }> = [];
    for (const stream of streams) {
      try {
        const len = await this.redis.xlen(stream);
        perStream.push({ stream, len });
      } catch {
        perStream.push({ stream, len: -1 });
      }
    }
    streamLen = perStream.reduce((acc, i) => acc + Math.max(0, i.len), 0);
    try {
      dlqLen = await this.redis.xlen(dlq);
    } catch {
      dlqLen = -1;
    }
    try {
      for (const stream of streams) {
        pendingTotal += parsePendingTotal(await this.redis.xpending(stream, group));
      }
    } catch {
      pendingTotal = -1;
    }

    const avg = this.avgMs();

    lines.push('# HELP event_bus_stream_messages_total Approximate length of the domain stream (XLEN).');
    lines.push('# TYPE event_bus_stream_messages_total gauge');
    lines.push(`event_bus_stream_messages_total{stream="all"} ${streamLen}`);
    for (const item of perStream) {
      lines.push(`event_bus_stream_messages_total{stream="${escapeLabel(item.stream)}"} ${item.len}`);
    }

    lines.push('# HELP event_bus_dlq_messages_total Approximate length of the DLQ stream (XLEN).');
    lines.push('# TYPE event_bus_dlq_messages_total gauge');
    lines.push(`event_bus_dlq_messages_total{stream="${escapeLabel(dlq)}"} ${dlqLen}`);

    lines.push('# HELP event_bus_consumer_pending_total Entries pending ACK in the consumer group.');
    lines.push('# TYPE event_bus_consumer_pending_total gauge');
    lines.push(`event_bus_consumer_pending_total{group="${escapeLabel(group)}"} ${pendingTotal}`);

    lines.push('# HELP event_bus_process_duration_ms_avg Moving average of successful handler duration (ms).');
    lines.push('# TYPE event_bus_process_duration_ms_avg gauge');
    lines.push(`event_bus_process_duration_ms_avg{group="${escapeLabel(group)}"} ${avg ?? 0}`);

    lines.push('# HELP event_bus_process_samples_total Number of samples in the moving average window.');
    lines.push('# TYPE event_bus_process_samples_total gauge');
    lines.push(`event_bus_process_samples_total{group="${escapeLabel(group)}"} ${this.samples.length}`);

    const [outboxPendingTotal, outboxFailuresTotal, oldestPending] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: 'pending' } }),
      this.prisma.outboxEvent.count({ where: { status: 'failed' } }),
      this.prisma.outboxEvent.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);
    const lagSeconds = oldestPending ? Math.max(0, (Date.now() - oldestPending.createdAt.getTime()) / 1000) : 0;

    lines.push('# HELP outbox_pending_total Pending outbox events.');
    lines.push('# TYPE outbox_pending_total gauge');
    lines.push(`outbox_pending_total ${outboxPendingTotal}`);

    lines.push('# HELP outbox_dispatch_lag_seconds Lag from oldest pending outbox event.');
    lines.push('# TYPE outbox_dispatch_lag_seconds gauge');
    lines.push(`outbox_dispatch_lag_seconds ${lagSeconds.toFixed(3)}`);

    lines.push('# HELP outbox_failures_total Failed outbox events.');
    lines.push('# TYPE outbox_failures_total gauge');
    lines.push(`outbox_failures_total ${outboxFailuresTotal}`);

    return `${lines.join('\n')}\n`;
  }

  async snapshotForAlerts(): Promise<{
    streamLen: number;
    dlqLen: number;
    pendingTotal: number;
    pendingDetails: { messageId: string; consumer: string; idleMs: number; deliveries: number }[];
  }> {
    const s = getEventBusSettings(this.config);
    const group = s.groupName;
    const dlq = s.dlqStreamKey;
    const streams = Array.from(new Set([s.streamKeys.orders, s.streamKeys.billing, s.streamKeys.realtime, s.streamKeys.fallback]));

    const lens = await Promise.all(streams.map((streamName) => this.redis.xlen(streamName).catch(() => -1)));
    const streamLen = lens.reduce((acc, n) => acc + Math.max(0, n), 0);
    const dlqLen = await this.redis.xlen(dlq).catch(() => -1);
    let pendingTotal = 0;
    const pendingDetails: { messageId: string; consumer: string; idleMs: number; deliveries: number }[] = [];

    try {
      for (const streamName of streams) {
        pendingTotal += parsePendingTotal(await this.redis.xpending(streamName, group));
      }
      const rawList = await this.redis
        .xpending(streams[0], group, '-', '+', 50)
        .catch(() => [] as unknown[]);
      if (Array.isArray(rawList)) {
        for (const row of rawList) {
          if (!Array.isArray(row) || row.length < 4) {
            continue;
          }
          pendingDetails.push({
            messageId: String(row[0]),
            consumer: String(row[1]),
            idleMs: Number(row[2]),
            deliveries: Number(row[3]),
          });
        }
      }
    } catch {
      pendingTotal = -1;
    }

    return { streamLen, dlqLen, pendingTotal, pendingDetails };
  }
}

function parsePendingTotal(pend: unknown): number {
  if (pend == null) {
    return 0;
  }
  if (Array.isArray(pend) && pend.length > 0 && typeof pend[0] === 'number') {
    return pend[0] as number;
  }
  if (typeof pend === 'object' && pend !== null && 'pending' in pend) {
    return Number((pend as { pending?: number }).pending ?? 0);
  }
  return 0;
}

function escapeLabel(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
