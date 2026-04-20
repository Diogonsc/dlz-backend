/** Envelope publicado no broker (Redis Stream) e consumido pelos workers. */
export type DomainEventBusEnvelope = {
  /** Mesmo id da linha `outbox_events` (dedupe entre réplicas). */
  eventId: string;
  type: string;
  tenantId: string | null;
  payload: unknown;
  traceparent?: string | null;
};
