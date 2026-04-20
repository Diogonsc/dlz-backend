import type { DomainEventBusEnvelope } from './event-bus-message';

/**
 * Porta de publicação do event bus distribuído.
 * Implementações típicas: Redis Streams, NATS JetStream, Kafka.
 */
export abstract class EventBusPort {
  abstract publish(envelope: DomainEventBusEnvelope): Promise<void>;
}
