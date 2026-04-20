import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepositoryPort } from '../../domain/ports/subscription.repository.port';
import { BillingEventPublisherPort } from '../../domain/ports/billing-event.publisher.port';
import { SubscriptionUpdatedDomainEvent } from '../../domain/events/subscription-updated.domain-event';
import { SubscriptionCanceledDomainEvent } from '../../domain/events/subscription-canceled.domain-event';

/**
 * Orquestração de persistência + evento após leitura de subscrição Stripe (sem depender de tipos Stripe aqui).
 */
@Injectable()
export class StripeTenantPlanSyncApplicationService {
  private readonly logger = new Logger(StripeTenantPlanSyncApplicationService.name);

  constructor(
    private readonly subscriptions: SubscriptionRepositoryPort,
    private readonly billingEvents: BillingEventPublisherPort,
  ) {}

  async applyPlanFromStripePrice(
    stripePriceId: string | undefined,
    email: string,
    tenantId: string | null,
  ): Promise<void> {
    if (!stripePriceId) return;
    const plan = await this.subscriptions.findPlanByStripePriceId(stripePriceId);
    if (!plan) {
      this.logger.warn(`Plan not found for Stripe price ${stripePriceId}`);
      return;
    }

    if (tenantId) {
      await this.subscriptions.updateTenantPlanById(tenantId, plan.slug, 'active');
      this.billingEvents.publishSubscriptionUpdated(
        new SubscriptionUpdatedDomainEvent(tenantId, email || null, plan.slug, 'active', 'stripe'),
      );
    } else if (email) {
      await this.subscriptions.updateTenantsPlanByEmail(email, plan.slug, 'active');
      const tenantIds = await this.subscriptions.findTenantIdsByEmail(email);
      for (const id of tenantIds) {
        this.billingEvents.publishSubscriptionUpdated(
          new SubscriptionUpdatedDomainEvent(id, email, plan.slug, 'active', 'stripe'),
        );
      }
    }

    this.logger.log(`Stripe plan applied: ${plan.slug} → ${tenantId ?? email}`);
  }

  async downgradeEmailToStarter(email: string): Promise<void> {
    const tenantIds = await this.subscriptions.findTenantIdsByEmail(email);
    await this.subscriptions.downgradeTenantsByEmail(email);
    for (const tenantId of tenantIds) {
      this.billingEvents.publishSubscriptionCanceled(
        new SubscriptionCanceledDomainEvent(tenantId, email, 'starter', 'stripe'),
      );
    }
    this.logger.log(`Downgraded to starter: ${email} (${tenantIds.length} tenants)`);
  }
}
