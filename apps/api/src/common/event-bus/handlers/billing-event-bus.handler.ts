import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EventBusStreamDeliveryPort } from '../domain/event-bus-delivery.port';
import type { DomainEventBusEnvelope } from '../domain/event-bus-message';

const BILLING_TYPES = new Set([
  'payment.approved',
  'payment.failed',
  'subscription.updated',
  'subscription.canceled',
]);

/**
 * Consumer lógico de billing: reencaminha ao EventEmitter (listeners existentes, ex. RealtimeGateway).
 * Ponto de extensão futuro (faturas, webhooks internos) sem acoplar ao outbox.
 */
@Injectable()
export class BillingEventBusHandler implements EventBusStreamDeliveryPort {
  readonly name = 'billing';

  constructor(private readonly events: EventEmitter2) {}

  supports(eventType: string): boolean {
    return BILLING_TYPES.has(eventType);
  }

  async deliver(envelope: DomainEventBusEnvelope): Promise<void> {
    this.events.emit(envelope.type, envelope.payload);
  }
}
