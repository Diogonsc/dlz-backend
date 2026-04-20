import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayNotConfiguredException } from '../../../../common/errors/payment-gateway-not-configured.exception';
import { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import { TenantPaymentConfigRepositoryPort } from '../../domain/ports/tenant-payment-config.repository.port';
import type { CreateMercadoPagoPreferenceCommand } from '../commands/create-mercadopago-preference.command';
import { ValidateMercadoPagoCredentialsUseCase } from './validate-mercadopago-credentials.use-case';

@Injectable()
export class CreateMercadoPagoPreferenceUseCase {
  constructor(
    private readonly tenantPaymentConfigRepo: TenantPaymentConfigRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly config: ConfigService,
    private readonly validateCredentialsUseCase: ValidateMercadoPagoCredentialsUseCase,
  ) {}

  async execute(cmd: CreateMercadoPagoPreferenceCommand): Promise<{
    preferenceId: string;
    initPoint: string | null;
    sandboxInitPoint: string | null;
  }> {
    const hasConfig = await this.tenantPaymentConfigRepo.hasMercadoPagoConfig(cmd.tenantId);
    if (!hasConfig) {
      throw new PaymentGatewayNotConfiguredException('mercado_pago', cmd.tenantId);
    }
    void this.validateCredentialsUseCase.execute(cmd.tenantId).catch(() => undefined);

    const apiUrl = this.config.get<string>('API_URL', '');
    const webhookUrl = `${apiUrl}/api/v1/payments/mercadopago/webhook?tenantId=${encodeURIComponent(cmd.tenantId)}&orderId=${encodeURIComponent(cmd.orderId ?? '')}`;
    const total = cmd.items.reduce((acc, item) => acc + Number(item.unit_price) * Number(item.quantity), 0);

    const result = await this.paymentGateway.createPayment({
      tenantId: cmd.tenantId,
      externalId: cmd.orderId ?? cmd.tenantId,
      description: cmd.items[0]?.title ?? 'Pedido DLZ',
      amount: total,
      webhookUrl,
      customerName: cmd.customerName,
      customerEmail: cmd.customerEmail,
      customerPhone: cmd.customerPhone,
      items: cmd.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    });

    return {
      preferenceId: result.gatewayPaymentId,
      initPoint: result.checkoutUrl,
      sandboxInitPoint: result.sandboxCheckoutUrl,
    };
  }
}
