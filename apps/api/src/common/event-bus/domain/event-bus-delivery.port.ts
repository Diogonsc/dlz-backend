import type { DomainEventBusEnvelope } from './event-bus-message';

/** Handler de um “consumer” lógico (realtime vs billing). */
export interface EventBusStreamDeliveryPort {
  readonly name: string;

  supports(eventType: string): boolean;

  deliver(envelope: DomainEventBusEnvelope): Promise<void>;
}
