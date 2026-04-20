import { Injectable } from '@nestjs/common';
import { Payment, Preference } from 'mercadopago';
import { getObservabilityContext } from '../../../../../common/observability/request-context.storage';
import { StructuredLoggerService } from '../../../../../common/observability/structured-logger.service';
import {
  PaymentGatewayPort,
  type CreatePaymentInput,
  type CreatePaymentOutput,
  type GetPaymentInput,
  type GetPaymentOutput,
} from '../../../domain/ports/payment-gateway.port';
import { TenantPaymentConfigRepositoryPort } from '../../../domain/ports/tenant-payment-config.repository.port';
import { MercadoPagoClientFactory } from './mercadopago.client';
import { mapMercadoPagoStatus } from './mappers/mp-status.mapper';

@Injectable()
export class MercadoPagoGateway extends PaymentGatewayPort {
  constructor(
    private readonly tenantPaymentConfig: TenantPaymentConfigRepositoryPort,
    private readonly structured: StructuredLoggerService,
  ) {
    super();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const t0 = Date.now();
    const accessToken = await this.tenantPaymentConfig.getMercadoPagoAccessToken(input.tenantId);
    const client = MercadoPagoClientFactory.create(accessToken);
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: (input.items?.length ? input.items : [{ title: input.description, quantity: 1, unitPrice: input.amount }]).map(
          (item) => ({
            title: item.title,
            quantity: item.quantity,
            unit_price: Number(item.unitPrice.toFixed(2)),
            currency_id: 'BRL',
          }),
        ),
        external_reference: input.externalId,
        notification_url: input.webhookUrl,
        payer: {
          first_name: input.customerName?.split(' ')[0]?.slice(0, 50),
          email: input.customerEmail,
        },
        metadata: {
          tenant_id: input.tenantId,
          order_id: input.externalId,
        },
      },
    });

    this.structured.log({
      type: 'external_call',
      provider: 'mercado_pago',
      action: 'create_payment',
      tenantId: input.tenantId,
      correlationId: getObservabilityContext()?.correlationId ?? null,
      durationMs: Date.now() - t0,
    });

    return {
      gateway: 'mercado_pago',
      gatewayPaymentId: String(response.id),
      checkoutUrl: response.init_point ?? null,
      sandboxCheckoutUrl: response.sandbox_init_point ?? null,
    };
  }

  async validateCredentials({ tenantId }: { tenantId: string }): Promise<{ valid: boolean }> {
    const accessToken = await this.tenantPaymentConfig.getMercadoPagoAccessToken(tenantId);
    const client = MercadoPagoClientFactory.create(accessToken);

    try {
      const paymentApi = new Payment(client);
      await paymentApi.get({ id: '0' });
      return { valid: true };
    } catch (err) {
      this.structured.warn({
        type: 'external_call',
        provider: 'mercado_pago',
        action: 'validate_credentials_failed',
        tenantId,
        errorMessage: err instanceof Error ? err.message : 'unknown',
      });
      return { valid: false };
    }
  }

  async getPayment(input: GetPaymentInput): Promise<GetPaymentOutput | null> {
    const t0 = Date.now();
    const accessToken = await this.tenantPaymentConfig.getMercadoPagoAccessToken(input.tenantId);
    const client = MercadoPagoClientFactory.create(accessToken);
    const paymentApi = new Payment(client);
    const response = await paymentApi.get({ id: String(input.gatewayPaymentId) });

    this.structured.log({
      type: 'external_call',
      provider: 'mercado_pago',
      action: 'get_payment',
      tenantId: input.tenantId,
      correlationId: getObservabilityContext()?.correlationId ?? null,
      durationMs: Date.now() - t0,
    });

    if (!response?.id) return null;

    return {
      gateway: 'mercado_pago',
      gatewayPaymentId: String(response.id),
      status: mapMercadoPagoStatus(String(response.status ?? 'pending')),
      externalId: response.external_reference ? String(response.external_reference) : null,
      detail: response.status_detail ? String(response.status_detail) : null,
      metadata: {
        tenantId: response.metadata?.tenant_id ? String(response.metadata.tenant_id) : undefined,
        orderId: response.metadata?.order_id ? String(response.metadata.order_id) : undefined,
      },
    };
  }
}
