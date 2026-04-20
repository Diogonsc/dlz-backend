import type { OrderRealtimePayload } from './order-realtime-payload';

/**
 * Evento de domínio (não confundir com transporte Socket.io).
 * O publisher de infraestrutura pode mapear isto para EventEmitter, Kafka, etc.
 */
export class OrderCreatedDomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly orderCode: string,
    public readonly total: number,
    public readonly payload: OrderRealtimePayload,
  ) {}
}
