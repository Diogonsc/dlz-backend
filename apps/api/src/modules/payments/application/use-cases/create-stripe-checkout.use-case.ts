import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeBillingGatewayPort } from '../../domain/ports/stripe-billing.gateway.port';
import { SubscriptionRepositoryPort } from '../../domain/ports/subscription.repository.port';
import type { CreateStripeCheckoutCommand } from '../commands/create-stripe-checkout.command';

@Injectable()
export class CreateStripeCheckoutUseCase {
  constructor(
    private readonly stripe: StripeBillingGatewayPort,
    private readonly subscriptions: SubscriptionRepositoryPort,
    private readonly config: ConfigService,
  ) {}

  async execute(cmd: CreateStripeCheckoutCommand): Promise<{ url: string | null }> {
    const found = await this.subscriptions.findPlanByStripePriceId(cmd.priceId);
    if (!found) throw new BadRequestException('Plano não encontrado');

    const frontend = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    return this.stripe.createSubscriptionCheckout({
      priceId: cmd.priceId,
      tenantId: cmd.tenantId,
      customerEmail: cmd.customerEmail,
      successUrl: `${frontend}/paineladmin?checkout=success`,
      cancelUrl: `${frontend}/cadastro?checkout=cancel`,
    });
  }
}
