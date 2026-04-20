export type BillingPaymentGateway = 'stripe' | 'mercado_pago' | 'cakto';

export type OnlinePaymentStatusPayload = 'pending' | 'approved' | 'rejected' | 'refunded';

export class PaymentApprovedDomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly gateway: BillingPaymentGateway,
    public readonly gatewayPaymentId: string,
    public readonly status: OnlinePaymentStatusPayload,
    public readonly detail: string | null,
  ) {}
}
