import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { getEventBusSettings } from '../event-bus.settings';
import { EventBusStreamDeliveryService } from './event-bus-stream-delivery.service';

/**
 * Recupera mensagens pending há muito tempo (consumidor morto / crash)
 * via XAUTOCLAIM e reprocessa com a mesma pipeline de entrega.
 */
@Injectable()
export class EventBusPendingRecoveryService {
  private readonly logger = new Logger(EventBusPendingRecoveryService.name);

  constructor(
    @Inject('EVENT_BUS_REDIS') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly delivery: EventBusStreamDeliveryService,
    private readonly structured: StructuredLoggerService,
  ) {}

  @Cron('*/20 * * * * *')
  async reclaimStalePending(): Promise<void> {
    const s = getEventBusSettings(this.config);
    if (s.mode !== 'redis' || !s.consumerEnabled) {
      return;
    }

    const streams = Array.from(new Set([s.streamKeys.orders, s.streamKeys.billing, s.streamKeys.realtime, s.streamKeys.fallback]));
    const group = s.groupName;
    const consumerName = `autoclaim-${process.pid}`;
    const minIdle = s.pendingClaimIdleMs;
    const batch = s.pendingClaimBatch;

    try {
      let processed = 0;
      for (const stream of streams) {
        const raw = (await this.redis.call(
          'XAUTOCLAIM',
          stream,
          group,
          consumerName,
          String(minIdle),
          '0-0',
          'COUNT',
          String(batch),
        )) as unknown;

        if (!Array.isArray(raw) || raw.length < 2) {
          continue;
        }

        const messages = raw[1] as unknown;
        if (!Array.isArray(messages) || messages.length === 0) {
          continue;
        }

        for (const entry of messages) {
          if (!Array.isArray(entry) || entry.length < 2) {
            continue;
          }
          const messageId = String(entry[0]);
          const fieldsArr = entry[1] as string[];
          if (!Array.isArray(fieldsArr)) {
            continue;
          }
          await this.delivery.processOne(stream, group, messageId, fieldsArr);
          processed++;
        }
      }

      if (processed > 0) {
        this.structured.log({
          type: 'event_bus',
          action: 'retry',
          phase: 'xautoclaim',
          eventId: '',
          tenantId: null,
          reclaimed: processed,
          idleMs: minIdle,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`XAUTOCLAIM: ${msg}`);
      this.structured.log({
        type: 'event_bus',
        action: 'retry',
        phase: 'xautoclaim_error',
        eventId: '',
        tenantId: null,
        error: msg,
      });
    }
  }
}
