import type { OrderCreatedDomainEvent } from '../events/order-created.domain-event';

export abstract class OrderEventPublisherPort {
  abstract publishOrderCreated(event: OrderCreatedDomainEvent): void;

  abstract publishOrderStatusChanged(order: unknown, tenantId: string): void;
}
