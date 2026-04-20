/** Porta para operações Stripe (checkout, portal, webhooks, leitura de subscrição). */
export type StripeCheckoutSessionResult = { url: string | null };

export type StripeSubscriptionSnapshot = {
  priceId: string | undefined;
  status: string;
  customerEmail: string | null;
};

export abstract class StripeBillingGatewayPort {
  abstract createSubscriptionCheckout(input: {
    priceId: string;
    tenantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<StripeCheckoutSessionResult>;

  abstract createBillingPortalSession(input: {
    customerEmail: string;
    returnUrl: string;
  }): Promise<StripeCheckoutSessionResult>;

  abstract verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): unknown;

  abstract retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionSnapshot>;

  abstract retrieveCustomerEmail(customerId: string): Promise<string | null>;
}
