import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EventBusStreamDeliveryPort } from '../domain/event-bus-delivery.port';
import type { DomainEventBusEnvelope } from '../domain/event-bus-message';

const REALTIME_TYPES = new Set([
  'order.created',
  'order.status_changed',
  'tab.created',
  'tab.updated',
]);

const BILLING_TYPES = new Set([
  'payment.approved',
  'payment.failed',
  'subscription.updated',
  'subscription.canceled',
]);

/** Tipos não mapeados: mantém compatibilidade emitindo no bus local. */
@Injectable()
export class FallbackEventBusHandler implements EventBusStreamDeliveryPort {
  readonly name = 'fallback';

  constructor(private readonly events: EventEmitter2) {}

  supports(eventType: string): boolean {
    return !REALTIME_TYPES.has(eventType) && !BILLING_TYPES.has(eventType);
  }

  async deliver(envelope: DomainEventBusEnvelope): Promise<void> {
    this.events.emit(envelope.type, envelope.payload);
  }
}
