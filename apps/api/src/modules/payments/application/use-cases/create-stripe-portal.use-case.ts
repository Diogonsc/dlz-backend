import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeBillingGatewayPort } from '../../domain/ports/stripe-billing.gateway.port';

export type CreateStripePortalCommand = { tenantId: string; customerEmail: string };

@Injectable()
export class CreateStripePortalUseCase {
  constructor(
    private readonly stripe: StripeBillingGatewayPort,
    private readonly config: ConfigService,
  ) {}

  async execute(cmd: CreateStripePortalCommand): Promise<{ url: string | null }> {
    const frontend = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    return this.stripe.createBillingPortalSession({
      customerEmail: cmd.customerEmail,
      returnUrl: `${frontend}/paineladmin/configuracoes`,
    });
  }
}
