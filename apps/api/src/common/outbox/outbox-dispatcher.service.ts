import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@dlz/prisma';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { EventBusPort } from '../event-bus/domain/event-bus.port';
import { getEventBusSettings } from '../event-bus/event-bus.settings';
import { getObservabilityContext } from '../observability/request-context.storage';

const MAX_ATTEMPTS = 12;
const STALE_DISPATCHING_MS = 120_000;
const BATCH_PER_TICK = 28;

@Injectable()
export class OutboxDispatcherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly structured: StructuredLoggerService,
    private readonly eventBus: EventBusPort,
    private readonly config: ConfigService,
  ) {}

  private eventBusMode(): 'redis' | 'emitter' | 'dual' {
    return getEventBusSettings(this.config).mode;
  }

  private async publishOutboxEvent(row: {
    id: string;
    type: string;
    tenantId: string | null;
    payload: unknown;
  }): Promise<void> {
    const mode = this.eventBusMode();
    const traceparentFromPayload =
      typeof row.payload === 'object' && row.payload !== null && 'traceparent' in row.payload
        ? String((row.payload as { traceparent?: unknown }).traceparent ?? '')
        : null;
    const envelope = {
      eventId: row.id,
      type: row.type,
      tenantId: row.tenantId,
      payload: row.payload,
      traceparent: traceparentFromPayload || (getObservabilityContext()?.traceparent ?? null),
    };
    if (mode === 'redis' || mode === 'dual') {
      await this.eventBus.publish(envelope);
    }
    if (mode === 'emitter' || mode === 'dual') {
      this.events.emit(row.type, row.payload);
    }
  }

  private backoffMs(attempts: number): number {
    if (attempts <= 0) return 0;
    return Math.min(60_000, 1000 * Math.pow(2, attempts - 1));
  }

  /** Libera linhas presas em `dispatching` após crash do worker. */
  private async recoverStaleDispatching(): Promise<void> {
    const threshold = new Date(Date.now() - STALE_DISPATCHING_MS);
    await this.prisma.outboxEvent.updateMany({
      where: {
        status: 'dispatching',
        updatedAt: { lt: threshold },
      },
      data: {
        status: 'pending',
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Claim atómico pending → dispatching, publica no event bus (Redis Stream por defeito)
   * e/ou EventEmitter conforme `eventBus.mode`, depois marca processed.
   * Falha: incrementa attempts, backoff por `updatedAt`, ou `failed` após MAX_ATTEMPTS.
   */
  private async dispatchNext(): Promise<boolean> {
    const candidates = await this.prisma.outboxEvent.findMany({
      where: { status: 'pending', attempts: { lt: MAX_ATTEMPTS } },
      orderBy: { createdAt: 'asc' },
      take: 80,
    });

    const now = Date.now();
    for (const row of candidates) {
      const wait = this.backoffMs(row.attempts);
      if (wait > 0 && row.updatedAt.getTime() + wait > now) {
        continue;
      }

      const claimed = await this.prisma.outboxEvent.updateMany({
        where: { id: row.id, status: 'pending' },
        data: { status: 'dispatching' },
      });
      if (claimed.count !== 1) {
        continue;
      }

      const current = await this.prisma.outboxEvent.findUniqueOrThrow({ where: { id: row.id } });

      try {
        await this.publishOutboxEvent({
          id: current.id,
          type: current.type,
          tenantId: current.tenantId,
          payload: current.payload,
        });
        await this.prisma.outboxEvent.update({
          where: { id: current.id },
          data: { status: 'processed', processedAt: new Date() },
        });
        this.structured.log({
          type: 'outbox',
          action: 'processed',
          eventId: current.id,
          tenantId: current.tenantId ?? null,
        });
        return true;
      } catch (err) {
        const nextAttempts = current.attempts + 1;
        const terminal = nextAttempts >= MAX_ATTEMPTS;
        await this.prisma.outboxEvent.update({
          where: { id: current.id },
          data: {
            status: terminal ? 'failed' : 'pending',
            attempts: nextAttempts,
          },
        });
        this.structured.log({
          type: 'outbox',
          action: terminal ? 'failed' : 'retry',
          eventId: current.id,
          tenantId: current.tenantId ?? null,
          error: err instanceof Error ? err.message : String(err),
        });
        return true;
      }
    }

    return false;
  }

  @Cron('*/5 * * * * *')
  async flushOutbox(): Promise<void> {
    await this.recoverStaleDispatching();
    for (let i = 0; i < BATCH_PER_TICK; i++) {
      const progressed = await this.dispatchNext();
      if (!progressed) {
        break;
      }
    }
  }
}
