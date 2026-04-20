import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { SubscriptionRepositoryPort } from '../../domain/ports/subscription.repository.port';
import { BillingEventPublisherPort } from '../../domain/ports/billing-event.publisher.port';
import { WebhookIdempotencyPort } from '../../domain/ports/webhook-idempotency.port';
import { verifyCaktoWebhookSignature } from '../../domain/services/cakto-signature.domain-service';
import {
  CAKTO_ACTIVATE_EVENTS,
  CAKTO_DEACTIVATE_EVENTS,
  resolveCaktoPlanSlug,
} from '../../domain/value-objects/cakto-plan-map.vo';
import { SubscriptionUpdatedDomainEvent } from '../../domain/events/subscription-updated.domain-event';
import { SubscriptionCanceledDomainEvent } from '../../domain/events/subscription-canceled.domain-event';
import type { CaktoWebhookCommand } from '../commands/cakto-webhook.command';
import { ReliabilityLoggerService } from '../../../../common/observability/reliability-logger.service';
import { WebhookSecurityService } from '../services/webhook-security.service';
import { APP_CONFIG } from '../../../../config/app-config.module';
import type { AppConfig } from '../../../../config/app.config';
import { Inject } from '@nestjs/common';

@Injectable()
export class HandleCaktoWebhookUseCase {
  private readonly logger = new Logger(HandleCaktoWebhookUseCase.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly subscriptions: SubscriptionRepositoryPort,
    private readonly billingEvents: BillingEventPublisherPort,
    private readonly webhooks: WebhookIdempotencyPort,
    private readonly reliability: ReliabilityLoggerService,
    private readonly webhookSecurity: WebhookSecurityService,
  ) {}

  async execute(cmd: CaktoWebhookCommand): Promise<{ received: boolean }> {
    const secret = this.config.cakto.webhookSecret;
    await this.webhookSecurity.validate({
      provider: 'cakto',
      rawBody: cmd.rawBody,
      signature: cmd.signature,
      timestamp: cmd.timestamp,
      nonce: cmd.nonce,
      secret,
    });
    try {
      verifyCaktoWebhookSignature(cmd.rawBody, cmd.signature, secret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'CAKTO_SIGNATURE_MISSING' || msg === 'CAKTO_SIGNATURE_INVALID') {
        throw new UnauthorizedException(msg === 'CAKTO_SIGNATURE_MISSING' ? 'Assinatura Cakto ausente' : 'Assinatura Cakto inválida');
      }
      throw e;
    }

    const externalId = `cakto:${createHash('sha256').update(cmd.rawBody).digest('hex')}`;
    const claimed = await this.webhooks.tryClaim('cakto', externalId);
    if (!claimed) {
      this.reliability.log('duplicate_ignored', {
        source: 'cakto',
        externalId,
        tenantId: null,
      });
      return { received: true };
    }

    try {
      const planSlug = resolveCaktoPlanSlug(cmd.payload);
      const email = cmd.payload.customer?.email?.trim().toLowerCase();

      this.logger.log(`Cakto event: ${cmd.payload.event} → plan: ${planSlug} → email: ${email}`);

      if (CAKTO_ACTIVATE_EVENTS.has(cmd.payload.event) && planSlug && email) {
        const plan = await this.subscriptions.findPlanBySlug(planSlug);
        if (plan) {
          await this.subscriptions.updateTenantsPlanByEmail(email, planSlug, 'active');
          const tenantIds = await this.subscriptions.findTenantIdsByEmail(email);
          for (const tenantId of tenantIds) {
            this.billingEvents.publishSubscriptionUpdated(
              new SubscriptionUpdatedDomainEvent(tenantId, email, planSlug, 'active', 'cakto'),
            );
          }
        }
      }

      if (CAKTO_DEACTIVATE_EVENTS.has(cmd.payload.event) && email) {
        const tenantIds = await this.subscriptions.findTenantIdsByEmail(email);
        await this.subscriptions.downgradeTenantsByEmail(email);
        for (const tenantId of tenantIds) {
          this.billingEvents.publishSubscriptionCanceled(
            new SubscriptionCanceledDomainEvent(tenantId, email, 'starter', 'cakto'),
          );
        }
      }

      this.reliability.log('webhook_processed', {
        source: 'cakto',
        externalId,
        tenantId: null,
        event: cmd.payload.event,
      });

      return { received: true };
    } catch (e) {
      await this.webhooks.releaseClaim('cakto', externalId);
      throw e;
    }
  }
}
