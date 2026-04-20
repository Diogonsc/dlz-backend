import type { PaymentApprovedDomainEvent } from '../../domain/events/payment-approved.domain-event';
import type { PaymentFailedDomainEvent } from '../../domain/events/payment-failed.domain-event';
import type { SubscriptionUpdatedDomainEvent } from '../../domain/events/subscription-updated.domain-event';
import type { SubscriptionCanceledDomainEvent } from '../../domain/events/subscription-canceled.domain-event';

/** Correlation HTTP propagada para o envelope Socket (rastreio ponta a ponta). */
export type BillingEnvelopeCorrelation = { correlationId?: string | null };

/** Contrato único para o frontend (Socket.io + futuros consumidores). */
export type BillingRealtimeEnvelope =
  | PaymentApprovedRealtimeEnvelope
  | PaymentFailedRealtimeEnvelope
  | SubscriptionUpdatedRealtimeEnvelope
  | SubscriptionCanceledRealtimeEnvelope;

export type PaymentApprovedRealtimeEnvelope = BillingEnvelopeCorrelation & {
  type: 'payment.approved';
  data: PaymentApprovedRealtimeData;
  timestamp: string;
};

export type PaymentFailedRealtimeEnvelope = BillingEnvelopeCorrelation & {
  type: 'payment.failed';
  data: PaymentFailedRealtimeData;
  timestamp: string;
};

export type SubscriptionUpdatedRealtimeEnvelope = BillingEnvelopeCorrelation & {
  type: 'subscription.updated';
  data: SubscriptionUpdatedRealtimeData;
  timestamp: string;
};

export type SubscriptionCanceledRealtimeEnvelope = BillingEnvelopeCorrelation & {
  type: 'subscription.canceled';
  data: SubscriptionCanceledRealtimeData;
  timestamp: string;
};

export type PaymentApprovedRealtimeData = {
  tenantId: string;
  orderId: string;
  gateway: string;
  gatewayPaymentId: string;
  status: string;
  detail: string | null;
};

export type PaymentFailedRealtimeData = {
  tenantId: string;
  orderId: string | null;
  gateway: string;
  gatewayPaymentId: string | null;
  status: string;
  detail: string | null;
};

export type SubscriptionUpdatedRealtimeData = {
  tenantId: string;
  planSlug: string;
  tenantStatus: string;
  source: string;
};

export type SubscriptionCanceledRealtimeData = {
  tenantId: string;
  planSlug: string;
  tenantStatus: string;
  source: string;
};

function isoNow(): string {
  return new Date().toISOString();
}

export function withBillingCorrelationId<T extends BillingRealtimeEnvelope>(
  envelope: T,
  correlationId: string | null | undefined,
): T {
  if (correlationId == null || correlationId === '') return envelope;
  return { ...envelope, correlationId };
}

export function toPaymentApprovedRealtimeEnvelope(
  event: PaymentApprovedDomainEvent,
): PaymentApprovedRealtimeEnvelope {
  return {
    type: 'payment.approved',
    data: {
      tenantId: event.tenantId,
      orderId: event.orderId,
      gateway: event.gateway,
      gatewayPaymentId: event.gatewayPaymentId,
      status: event.status,
      detail: event.detail,
    },
    timestamp: isoNow(),
  };
}

export function toPaymentFailedRealtimeEnvelope(
  event: PaymentFailedDomainEvent,
): PaymentFailedRealtimeEnvelope {
  return {
    type: 'payment.failed',
    data: {
      tenantId: event.tenantId,
      orderId: event.orderId,
      gateway: event.gateway,
      gatewayPaymentId: event.gatewayPaymentId,
      status: event.status,
      detail: event.detail,
    },
    timestamp: isoNow(),
  };
}

export function toSubscriptionUpdatedRealtimeEnvelope(
  event: SubscriptionUpdatedDomainEvent,
): SubscriptionUpdatedRealtimeEnvelope | null {
  if (!event.tenantId) return null;
  return {
    type: 'subscription.updated',
    data: {
      tenantId: event.tenantId,
      planSlug: event.planSlug,
      tenantStatus: event.tenantStatus,
      source: event.source,
    },
    timestamp: isoNow(),
  };
}

export function toSubscriptionCanceledRealtimeEnvelope(
  event: SubscriptionCanceledDomainEvent,
): SubscriptionCanceledRealtimeEnvelope {
  return {
    type: 'subscription.canceled',
    data: {
      tenantId: event.tenantId,
      planSlug: event.planSlug,
      tenantStatus: 'inactive',
      source: event.source,
    },
    timestamp: isoNow(),
  };
}
