import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  StripeBillingGatewayPort,
  type StripeCheckoutSessionResult,
  type StripeSubscriptionSnapshot,
} from '../../domain/ports/stripe-billing.gateway.port';

@Injectable()
export class StripeBillingGateway extends StripeBillingGatewayPort {
  private readonly client: Stripe;

  constructor(private readonly config: ConfigService) {
    super();
    this.client = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2025-08-27.basil' as any,
    });
  }

  async createSubscriptionCheckout(input: {
    priceId: string;
    tenantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<StripeCheckoutSessionResult> {
    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: input.customerEmail,
      line_items: [{ price: input.priceId, quantity: 1 }],
      metadata: { tenant_id: input.tenantId },
      client_reference_id: input.tenantId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { url: session.url };
  }

  async createBillingPortalSession(input: {
    customerEmail: string;
    returnUrl: string;
  }): Promise<StripeCheckoutSessionResult> {
    const customers = await this.client.customers.list({ email: input.customerEmail, limit: 1 });
    if (!customers.data.length) throw new NotFoundException('Cliente Stripe não encontrado');

    const session = await this.client.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): unknown {
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }

  async retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionSnapshot> {
    const sub = await this.client.subscriptions.retrieve(subscriptionId);
    const priceId = sub.items.data[0]?.price?.id;
    return {
      priceId,
      status: sub.status,
      customerEmail: null,
    };
  }

  async retrieveCustomerEmail(customerId: string): Promise<string | null> {
    const customer = await this.client.customers.retrieve(customerId);
    if (customer.deleted || !('email' in customer)) return null;
    return customer.email ?? null;
  }
}
