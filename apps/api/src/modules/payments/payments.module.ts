import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { SubscriptionRepositoryPort } from './domain/ports/subscription.repository.port';
import { PaymentsRepositoryPort } from './domain/ports/payments.repository.port';
import { StripeBillingGatewayPort } from './domain/ports/stripe-billing.gateway.port';
import { PaymentGatewayPort } from './domain/ports/payment-gateway.port';
import { BillingEventPublisherPort } from './domain/ports/billing-event.publisher.port';
import { WebhookIdempotencyPort } from './domain/ports/webhook-idempotency.port';
import { TenantPaymentConfigRepositoryPort } from './domain/ports/tenant-payment-config.repository.port';
import { PrismaSubscriptionRepository } from './infrastructure/persistence/prisma-subscription.repository';
import { PrismaOrderPaymentsRepository } from './infrastructure/persistence/prisma-order-payments.repository';
import { PrismaWebhookIdempotencyRepository } from './infrastructure/persistence/prisma-webhook-idempotency.repository';
import { PrismaTenantPaymentConfigRepository } from './infrastructure/persistence/prisma-tenant-payment-config.repository';
import { StripeBillingGateway } from './infrastructure/gateways/stripe-billing.gateway';
import { MercadoPagoGateway } from './infrastructure/gateways/mercadopago/mercadopago.gateway';
import { NestBillingEventPublisher } from './infrastructure/events/nest-billing-event.publisher';
import {
  PAYMENT_RELIABILITY_QUEUE,
  PaymentReliabilityProcessor,
} from './infrastructure/queues/payment-reliability.processor';
import { StripeTenantPlanSyncApplicationService } from './application/services/stripe-tenant-plan-sync.application-service';
import { MercadoPagoHealthCronService } from './application/services/mercadopago-health-cron.service';
import { CreateStripeCheckoutUseCase } from './application/use-cases/create-stripe-checkout.use-case';
import { CreateStripePortalUseCase } from './application/use-cases/create-stripe-portal.use-case';
import { CreateMercadoPagoPreferenceUseCase } from './application/use-cases/create-mercadopago-preference.use-case';
import { ValidateMercadoPagoCredentialsUseCase } from './application/use-cases/validate-mercadopago-credentials.use-case';
import { WebhookSecurityService } from './application/services/webhook-security.service';
import { HandleStripeWebhookUseCase } from './application/use-cases/handle-stripe-webhook.use-case';
import { HandleCaktoWebhookUseCase } from './application/use-cases/handle-cakto-webhook.use-case';
import { HandleMercadoPagoWebhookUseCase } from './application/use-cases/handle-mercadopago-webhook.use-case';
import { GetTenantSubscriptionSummaryUseCase } from './application/use-cases/get-tenant-subscription-summary.use-case';
import { PaymentGatewayHealthService } from '../../common/cache/payment-gateway-health.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PAYMENT_RELIABILITY_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 4000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
  ],
  controllers: [PaymentsController],
  providers: [
    { provide: SubscriptionRepositoryPort, useClass: PrismaSubscriptionRepository },
    { provide: PaymentsRepositoryPort, useClass: PrismaOrderPaymentsRepository },
    { provide: StripeBillingGatewayPort, useClass: StripeBillingGateway },
    { provide: PaymentGatewayPort, useClass: MercadoPagoGateway },
    { provide: TenantPaymentConfigRepositoryPort, useClass: PrismaTenantPaymentConfigRepository },
    { provide: BillingEventPublisherPort, useClass: NestBillingEventPublisher },
    { provide: WebhookIdempotencyPort, useClass: PrismaWebhookIdempotencyRepository },
    PaymentReliabilityProcessor,
    StripeTenantPlanSyncApplicationService,
    MercadoPagoHealthCronService,
    WebhookSecurityService,
    PaymentGatewayHealthService,
    CreateStripeCheckoutUseCase,
    CreateStripePortalUseCase,
    CreateMercadoPagoPreferenceUseCase,
    ValidateMercadoPagoCredentialsUseCase,
    HandleStripeWebhookUseCase,
    HandleCaktoWebhookUseCase,
    HandleMercadoPagoWebhookUseCase,
    GetTenantSubscriptionSummaryUseCase,
  ],
  exports: [
    SubscriptionRepositoryPort,
    PaymentsRepositoryPort,
    CreateMercadoPagoPreferenceUseCase,
    HandleMercadoPagoWebhookUseCase,
  ],
})
export class PaymentsModule {}
