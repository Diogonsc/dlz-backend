import { HandleMercadoPagoWebhookUseCase } from './handle-mercadopago-webhook.use-case';
import { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import { PaymentsRepositoryPort } from '../../domain/ports/payments.repository.port';
import { TenantPaymentConfigRepositoryPort } from '../../domain/ports/tenant-payment-config.repository.port';
import { WebhookIdempotencyPort } from '../../domain/ports/webhook-idempotency.port';
import { ReliabilityLoggerService } from '../../../../common/observability/reliability-logger.service';
import { WebhookSecurityService } from '../services/webhook-security.service';

describe('HandleMercadoPagoWebhookUseCase', () => {
  it('processa webhook aprovado e grava evento na outbox dentro da transação', async () => {
    const tx = {
      outboxEvent: { create: jest.fn().mockResolvedValue(null) },
    } as any;

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (client: any) => Promise<unknown>) => fn(tx)),
    } as any;

    const paymentGateway: jest.Mocked<PaymentGatewayPort> = {
      createPayment: jest.fn(),
      getPayment: jest.fn().mockResolvedValue({
        gateway: 'mercado_pago',
        gatewayPaymentId: 'pay-1',
        status: 'approved',
        externalId: 'order-1',
        detail: null,
        metadata: { tenantId: 'tenant-1', orderId: 'order-1' },
      }),
    };

    const payments: jest.Mocked<PaymentsRepositoryPort> = {
      findOrderByIdForGateway: jest.fn().mockResolvedValue({ id: 'order-1', tenantId: 'tenant-1' }),
      updateOrderMercadoPagoStatus: jest.fn().mockResolvedValue(1),
    };
    const tenantPaymentConfig: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
      getMercadoPagoAccessToken: jest.fn(),
      hasMercadoPagoConfig: jest.fn(),
      findActiveMercadoPagoTenants: jest.fn(),
      getMercadoPagoWebhookSecret: jest.fn().mockResolvedValue('secret'),
    };

    const webhooks: jest.Mocked<WebhookIdempotencyPort> = {
      tryClaim: jest.fn().mockResolvedValue(true),
      releaseClaim: jest.fn(),
    };

    const reliability: jest.Mocked<ReliabilityLoggerService> = {
      log: jest.fn(),
    } as unknown as jest.Mocked<ReliabilityLoggerService>;
    const webhookSecurity: jest.Mocked<WebhookSecurityService> = {
      validate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<WebhookSecurityService>;

    const useCase = new HandleMercadoPagoWebhookUseCase(
      paymentGateway,
      payments,
      tenantPaymentConfig,
      prisma,
      webhooks,
      reliability,
      webhookSecurity,
    );

    const out = await useCase.execute(
      { type: 'payment', data: { id: 'pay-1' } },
      { tenantId: 'tenant-1', orderId: 'order-1' },
    );

    expect(out).toEqual({ received: true });
    expect(webhooks.tryClaim).toHaveBeenCalledWith('mercadopago', 'mp:pay-1:approved', tx);
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'payment.approved',
          tenantId: 'tenant-1',
          status: 'pending',
        }),
      }),
    );
  });
});
