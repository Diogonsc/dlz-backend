import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { EventBusPort } from '../domain/event-bus.port';
import type { DomainEventBusEnvelope } from '../domain/event-bus-message';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { getEventBusSettings } from '../event-bus.settings';
import { getObservabilityContext } from '../../observability/request-context.storage';

@Injectable()
export class RedisStreamsEventBus extends EventBusPort {
  private readonly logger = new Logger(RedisStreamsEventBus.name);

  constructor(
    @Inject('EVENT_BUS_REDIS') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly structured: StructuredLoggerService,
  ) {
    super();
  }

  private streamKey(eventType: string): string {
    const s = getEventBusSettings(this.config);
    if (eventType.startsWith('order.')) return s.streamKeys.orders;
    if (eventType.startsWith('payment.') || eventType.startsWith('subscription.') || eventType.startsWith('billing.')) {
      return s.streamKeys.billing;
    }
    if (eventType.startsWith('realtime.') || eventType.startsWith('tab.')) return s.streamKeys.realtime;
    return s.streamKeys.fallback;
  }

  async publish(envelope: DomainEventBusEnvelope): Promise<void> {
    if (!envelope.tenantId) {
      throw new Error(`EVENTBUS_TENANT_REQUIRED type=${envelope.type}`);
    }
    const traceparent = envelope.traceparent ?? getObservabilityContext()?.traceparent ?? null;
    const streamKey = this.streamKey(envelope.type);
    const payloadJson = JSON.stringify(envelope.payload ?? null);
    const id = await this.redis.xadd(
      streamKey,
      '*',
      'eventId',
      envelope.eventId,
      'type',
      envelope.type,
      'tenantId',
      envelope.tenantId,
      'traceparent',
      traceparent ?? '',
      'payload',
      payloadJson,
    );
    this.structured.log({
      type: 'event_bus',
      action: 'published',
      eventId: envelope.eventId,
      tenantId: envelope.tenantId ?? null,
      traceId: getObservabilityContext()?.traceId ?? null,
      streamKey,
      streamMessageId: id,
    });
    if (!id) {
      this.logger.warn(`XADD retornou vazio para eventId=${envelope.eventId}`);
    }
  }
}
