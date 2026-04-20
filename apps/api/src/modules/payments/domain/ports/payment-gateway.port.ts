export type PaymentGateway = 'stripe' | 'mercado_pago' | 'cakto';

export type CreatePaymentItemInput = {
  title: string;
  quantity: number;
  unitPrice: number;
};

export type CreatePaymentInput = {
  tenantId: string;
  externalId: string;
  description: string;
  amount: number;
  webhookUrl: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: CreatePaymentItemInput[];
};

export type CreatePaymentOutput = {
  gateway: PaymentGateway;
  gatewayPaymentId: string;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
};

export type GetPaymentInput = {
  tenantId: string;
  gatewayPaymentId: string | number;
};

export type GetPaymentOutput = {
  gateway: PaymentGateway;
  gatewayPaymentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  externalId: string | null;
  detail: string | null;
  metadata: { tenantId?: string; orderId?: string };
};

export abstract class PaymentGatewayPort {
  abstract createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput>;

  abstract getPayment(input: GetPaymentInput): Promise<GetPaymentOutput | null>;

  validateCredentials?(input: { tenantId: string }): Promise<{ valid: boolean }>;
}
