import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { EventBusPort } from '../domain/event-bus.port';
import { EventBusDedupService } from './redis-event-bus-dedup.service';
import { getEventBusSettings } from '../event-bus.settings';
import { fieldsToRecord, parseEnvelope } from './event-bus-stream-parse';

@Injectable()
export class EventBusDlqReplayService {
  private readonly logger = new Logger(EventBusDlqReplayService.name);

  constructor(
    @Inject('EVENT_BUS_REDIS') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly eventBus: EventBusPort,
    private readonly dedup: EventBusDedupService,
  ) {}

  /**
   * Re-publica eventos da DLQ para o stream principal (novo id de stream; mesmo `eventId` de negócio).
   * Remove da DLQ apenas após publicação bem-sucedida.
   */
  async replayBatch(limit: number, tenantId?: string): Promise<{ replayed: number; errors: string[] }> {
    const s = getEventBusSettings(this.config);
    const dlq = s.dlqStreamKey;
    const lim = Math.min(500, Math.max(1, limit));

    const entries = (await this.redis.xrange(dlq, '-', '+', 'COUNT', lim)) as [string, string[]][];

    const errors: string[] = [];
    let replayed = 0;

    for (const [dlqMessageId, fieldsArr] of entries) {
      try {
        const rec = fieldsToRecord(fieldsArr);
        const envelope = parseEnvelope(dlqMessageId, rec);
        if (tenantId && envelope.tenantId !== tenantId) {
          continue;
        }
        await this.dedup.releaseClaim(envelope.eventId);
        await this.eventBus.publish({
          eventId: envelope.eventId,
          type: envelope.type,
          tenantId: envelope.tenantId,
          payload: envelope.payload,
        });
        await this.redis.xdel(dlq, dlqMessageId);
        replayed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${dlqMessageId}: ${msg}`);
        this.logger.warn(`Replay DLQ falhou id=${dlqMessageId}: ${msg}`);
      }
    }

    return { replayed, errors };
  }
}
