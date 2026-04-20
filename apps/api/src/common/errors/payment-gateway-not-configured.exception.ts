import { HttpStatus } from '@nestjs/common';
import { AppDomainException } from './app-domain.exception';

export class PaymentGatewayNotConfiguredException extends AppDomainException {
  constructor(provider: string, tenantId: string) {
    super(
      'PAYMENT_GATEWAY_NOT_CONFIGURED',
      `Gateway ${provider} não configurado para o tenant`,
      HttpStatus.BAD_REQUEST,
      { provider, tenantId },
    );
  }
}
