import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { StripeBillingGatewayPort } from '../../domain/ports/stripe-billing.gateway.port';
import { StripeTenantPlanSyncApplicationService } from '../services/stripe-tenant-plan-sync.application-service';
import { SubscriptionRepositoryPort } from '../../domain/ports/subscription.repository.port';
import { BillingEventPublisherPort } from '../../domain/ports/billing-event.publisher.port';
import { WebhookIdempotencyPort } from '../../domain/ports/webhook-idempotency.port';
import { PaymentFailedDomainEvent } from '../../domain/events/payment-failed.domain-event';
import { ReliabilityLoggerService } from '../../../../common/observability/reliability-logger.service';

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly config: ConfigService,
    private readonly stripe: StripeBillingGatewayPort,
    private readonly planSync: StripeTenantPlanSyncApplicationService,
    private readonly subscriptions: SubscriptionRepositoryPort,
    private readonly billingEvents: BillingEventPublisherPort,
    private readonly webhooks: WebhookIdempotencyPort,
    private readonly reliability: ReliabilityLoggerService,
  ) {}

  async execute(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: Stripe.Event;
    try {
      event = this.stripe.verifyWebhookSignature(rawBody, signature, secret) as Stripe.Event;
    } catch {
      throw new UnauthorizedException('Assinatura Stripe inválida');
    }

    const externalId = event.id;
    const claimed = await this.webhooks.tryClaim('stripe', externalId);
    if (!claimed) {
      this.reliability.log('duplicate_ignored', {
        source: 'stripe',
        externalId,
        tenantId: null,
      });
      return { received: true };
    }

    this.logger.log(`Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const tenantId = session.metadata?.tenant_id ?? session.client_reference_id ?? null;
          const email = session.customer_details?.email ?? '';
          if (session.subscription) {
            const sub = await this.stripe.retrieveSubscription(session.subscription as string);
            await this.planSync.applyPlanFromStripePrice(sub.priceId, email, tenantId);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          if (sub.status === 'active' || sub.status === 'trialing') {
            const email = await this.stripe.retrieveCustomerEmail(sub.customer as string);
            if (email) {
              const priceId = sub.items.data[0]?.price?.id;
              await this.planSync.applyPlanFromStripePrice(priceId, email, null);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const email = await this.stripe.retrieveCustomerEmail(sub.customer as string);
          if (email) await this.planSync.downgradeEmailToStarter(email);
          break;
        }

        case 'invoice.payment_failed': {
          const inv = event.data.object as Stripe.Invoice;
          const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
          if (!customerId) break;
          const email = await this.stripe.retrieveCustomerEmail(customerId);
          if (!email) break;
          const tenantIds = await this.subscriptions.findTenantIdsByEmail(email);
          const detail =
            inv.last_finalization_error && typeof inv.last_finalization_error === 'object'
              ? JSON.stringify(inv.last_finalization_error)
              : null;
          for (const tenantId of tenantIds) {
            this.billingEvents.publishPaymentFailed(
              new PaymentFailedDomainEvent(
                tenantId,
                null,
                'stripe',
                typeof inv.id === 'string' ? inv.id : null,
                'invoice.payment_failed',
                detail,
              ),
            );
          }
          break;
        }

        default:
          break;
      }

      this.reliability.log('webhook_processed', {
        source: 'stripe',
        externalId,
        tenantId: null,
        eventType: event.type,
      });

      return { received: true };
    } catch (e) {
      await this.webhooks.releaseClaim('stripe', externalId);
      throw e;
    }
  }
}
