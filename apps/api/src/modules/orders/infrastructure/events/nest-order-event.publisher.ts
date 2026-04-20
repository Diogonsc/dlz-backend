import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderEventPublisherPort } from '../../domain/ports/order-event.publisher.port';
import type { OrderCreatedDomainEvent } from '../../domain/events/order-created.domain-event';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';

@Injectable()
export class NestOrderEventPublisher extends OrderEventPublisherPort {
  constructor(
    private readonly events: EventEmitter2,
    private readonly structured: StructuredLoggerService,
  ) {
    super();
  }

  private correlationId(): string | null {
    return getObservabilityContext()?.correlationId ?? null;
  }

  publishOrderCreated(event: OrderCreatedDomainEvent): void {
    const correlationId = this.correlationId();
    this.events.emit('order.created', {
      order: event.payload,
      tenantId: event.tenantId,
      correlationId,
    });
    this.structured.log({
      type: 'event',
      eventName: 'order.created',
      tenantId: event.tenantId,
      correlationId,
    });
  }

  publishOrderStatusChanged(order: unknown, tenantId: string): void {
    const correlationId = this.correlationId();
    this.events.emit('order.status_changed', { order, tenantId, correlationId });
    this.structured.log({
      type: 'event',
      eventName: 'order.status_changed',
      tenantId,
      correlationId,
    });
  }
}
