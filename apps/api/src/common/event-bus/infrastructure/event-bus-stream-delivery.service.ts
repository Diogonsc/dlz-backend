import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { EventBusDedupService } from './redis-event-bus-dedup.service';
import { EventBusMetricsService } from './event-bus-metrics.service';
import type { DomainEventBusEnvelope } from '../domain/event-bus-message';
import type { EventBusStreamDeliveryPort } from '../domain/event-bus-delivery.port';
import { RealtimeEventBusHandler } from '../handlers/realtime-event-bus.handler';
import { BillingEventBusHandler } from '../handlers/billing-event-bus.handler';
import { FallbackEventBusHandler } from '../handlers/fallback-event-bus.handler';
import { getEventBusSettings } from '../event-bus.settings';
import { fieldsToRecord, parseEnvelope } from './event-bus-stream-parse';
import { runInObservabilityContext, traceIdFromTraceparent } from '../../observability/request-context.storage';

@Injectable()
export class EventBusStreamDeliveryService {
  private readonly logger = new Logger(EventBusStreamDeliveryService.name);
  private readonly handlers: EventBusStreamDeliveryPort[];

  constructor(
    @Inject('EVENT_BUS_REDIS') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly structured: StructuredLoggerService,
    private readonly dedup: EventBusDedupService,
    private readonly metrics: EventBusMetricsService,
    realtime: RealtimeEventBusHandler,
    billing: BillingEventBusHandler,
    fallback: FallbackEventBusHandler,
  ) {
    this.handlers = [realtime, billing, fallback];
  }

  private failKey(group: string, messageId: string): string {
    return `eventbus:delivery_fail:${group}:${messageId}`;
  }

  private async appendDlq(input: {
    envelope: DomainEventBusEnvelope;
    sourceStream: string;
    sourceMessageId: string;
    attempts: number;
    lastError: string;
  }): Promise<void> {
    const dlq = getEventBusSettings(this.config).dlqStreamKey;
    const err = input.lastError.slice(0, 4000);
    await this.redis.xadd(
      dlq,
      '*',
      'eventId',
      input.envelope.eventId,
      'type',
      input.envelope.type,
      'tenantId',
      input.envelope.tenantId ?? '',
      'traceparent',
      input.envelope.traceparent ?? '',
      'payload',
      JSON.stringify(input.envelope.payload ?? null),
      'sourceStream',
      input.sourceStream,
      'sourceMessageId',
      input.sourceMessageId,
      'attempts',
      String(input.attempts),
      'lastError',
      err,
      'movedAt',
      new Date().toISOString(),
    );
  }

  /**
   * Entrega uma mensagem do stream (novas leituras, XAUTOCLAIM ou job Bull).
   */
  async processOne(
    stream: string,
    group: string,
    messageId: string,
    fieldsArr: string[],
  ): Promise<void> {
    const s = getEventBusSettings(this.config);
    const rec = fieldsToRecord(fieldsArr);
    const envelope = parseEnvelope(messageId, rec);
    if (!envelope.tenantId) {
      await this.redis.xack(stream, group, messageId);
      this.structured.warn({
        type: 'event_bus',
        action: 'consumed',
        eventId: envelope.eventId,
        tenantId: null,
        skipped: true,
        reason: 'tenant_missing',
        eventType: envelope.type,
      });
      return;
    }
    const fk = this.failKey(group, messageId);

    const shouldProcess = await this.dedup.tryClaimOnce(envelope.eventId);
    if (!shouldProcess) {
      await this.redis.xack(stream, group, messageId);
      await this.redis.del(fk);
      return;
    }

    const t0 = Date.now();
    try {
      for (const h of this.handlers) {
        if (h.supports(envelope.type)) {
          await runInObservabilityContext(
            {
              correlationId: envelope.eventId,
              tenantId: envelope.tenantId,
              traceparent: envelope.traceparent ?? null,
              traceId: traceIdFromTraceparent(envelope.traceparent ?? null),
            },
            () => h.deliver(envelope),
          );
          const ms = Date.now() - t0;
          this.metrics.recordProcessingMs(ms);
          this.structured.log({
            type: 'event_bus',
            action: 'consumed',
            eventId: envelope.eventId,
            tenantId: envelope.tenantId ?? null,
            traceId: traceIdFromTraceparent(envelope.traceparent ?? null),
            handler: h.name,
            eventType: envelope.type,
          });
          await this.redis.xack(stream, group, messageId);
          await this.redis.del(fk);
          return;
        }
      }

      this.structured.warn({
        type: 'event_bus',
        action: 'consumed',
        eventId: envelope.eventId,
        tenantId: envelope.tenantId ?? null,
        skipped: true,
        reason: 'no_handler',
        eventType: envelope.type,
      });
      await this.dedup.releaseClaim(envelope.eventId);
      await this.redis.xack(stream, group, messageId);
      await this.redis.del(fk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const n = await this.redis.incr(fk);
      await this.redis.expire(fk, 86_400);

      if (n === s.maxDeliveryAttempts - 1) {
        this.structured.warn({
          type: 'event_bus',
          action: 'alert',
          signal: 'delivery_near_dlq',
          eventId: envelope.eventId,
          tenantId: envelope.tenantId ?? null,
          deliveryAttempt: n,
          maxDeliveryAttempts: s.maxDeliveryAttempts,
          error: msg,
        });
      }

      if (n >= s.maxDeliveryAttempts) {
        try {
          await this.appendDlq({
            envelope,
            sourceStream: stream,
            sourceMessageId: messageId,
            attempts: n,
            lastError: msg,
          });
        } catch (dlqErr) {
          this.logger.error(
            `Falha ao gravar DLQ eventId=${envelope.eventId}: ${dlqErr instanceof Error ? dlqErr.message : dlqErr}`,
          );
        }
        await this.redis.xack(stream, group, messageId);
        await this.dedup.releaseClaim(envelope.eventId);
        await this.redis.del(fk);
        this.structured.log({
          type: 'event_bus',
          action: 'dlq',
          eventId: envelope.eventId,
          tenantId: envelope.tenantId ?? null,
          attempts: n,
          error: msg,
        });
        return;
      }

      await this.dedup.releaseClaim(envelope.eventId);
      this.structured.log({
        type: 'event_bus',
        action: 'retry',
        eventId: envelope.eventId,
        tenantId: envelope.tenantId ?? null,
        deliveryAttempt: n,
        error: msg,
      });
    }
  }
}
