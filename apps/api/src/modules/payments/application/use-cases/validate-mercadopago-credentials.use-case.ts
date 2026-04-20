import { Injectable } from '@nestjs/common';
import { PaymentGatewayHealthService } from '../../../../common/cache/payment-gateway-health.service';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';

@Injectable()
export class ValidateMercadoPagoCredentialsUseCase {
  constructor(
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly healthCache: PaymentGatewayHealthService,
    private readonly structured: StructuredLoggerService,
  ) {}

  async execute(tenantId: string): Promise<boolean> {
    const cached = await this.healthCache.getMercadoPagoHealth(tenantId);
    if (cached !== null) {
      this.structured.log({
        type: 'payment_gateway_health',
        tenantId,
        provider: 'mercado_pago',
        status: cached ? 'valid' : 'invalid',
        cached: true,
      });
      return cached;
    }

    const validator = this.paymentGateway.validateCredentials;
    if (!validator) {
      this.structured.warn({
        type: 'payment_gateway_health',
        tenantId,
        provider: 'mercado_pago',
        status: 'invalid',
        cached: false,
        reason: 'validate_credentials_not_implemented',
      });
      await this.healthCache.setMercadoPagoHealth(tenantId, false);
      return false;
    }

    try {
      const result = await validator.call(this.paymentGateway, { tenantId });
      await this.healthCache.setMercadoPagoHealth(tenantId, result.valid);
      this.structured.log({
        type: 'payment_gateway_health',
        tenantId,
        provider: 'mercado_pago',
        status: result.valid ? 'valid' : 'invalid',
        cached: false,
      });
      return result.valid;
    } catch (err) {
      this.structured.warn({
        type: 'payment_gateway_health',
        tenantId,
        provider: 'mercado_pago',
        status: 'invalid',
        cached: false,
        errorMessage: err instanceof Error ? err.message : 'unknown',
      });
      return false;
    }
  }
}
