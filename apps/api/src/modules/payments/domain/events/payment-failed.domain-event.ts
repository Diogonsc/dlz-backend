import type { BillingPaymentGateway } from './payment-approved.domain-event';

export class PaymentFailedDomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string | null,
    public readonly gateway: BillingPaymentGateway,
    public readonly gatewayPaymentId: string | null,
    public readonly status: string,
    public readonly detail: string | null,
  ) {}
}
