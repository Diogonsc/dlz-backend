import { Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Controller, Get, Post, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import Stripe from 'stripe';

// ── DTOs ─────────────────────────────────────────────────────────────────────

class UpsertGatewayDto {
  @IsOptional() @IsString() publicKey?: string;
  @IsOptional() @IsString() accessToken?: string;
  @IsOptional() @IsString() webhookSecret?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() environment?: 'sandbox' | 'production';
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class PaymentGatewaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Payment Gateways por tenant ────────────────────────────────────────────

  async getGateway(tenantId: string, provider = 'mercado_pago') {
    return this.prisma.paymentGateway.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });
  }

  async upsertGateway(tenantId: string, provider: string, dto: UpsertGatewayDto) {
    return this.prisma.paymentGateway.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      create: { tenantId, provider, ...dto },
      update: dto,
    });
  }

  // Endpoint público: vitrine sabe se MP está disponível (sem expor tokens)
  async getMpCheckoutAvailability(tenantId: string) {
    const gateway = await this.prisma.paymentGateway.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'mercado_pago' } },
    });

    const available =
      !!gateway?.isActive &&
      !!gateway?.accessToken?.trim() &&
      !!gateway?.publicKey?.trim();

    return {
      available,
      environment: gateway?.environment ?? 'sandbox',
      enabledMethods: gateway?.enabledMethods ?? { credit_card: true, debit_card: true, pix: true },
    };
  }

  // ── Check Stripe Subscription ──────────────────────────────────────────────

  async checkStripeSubscription(email: string) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    if (!stripeKey) return { subscribed: false };

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' as any });

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return { subscribed: false };

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (!subscriptions.data.length) return { subscribed: false };

    const sub = subscriptions.data[0];
    return {
      subscribed: true,
      productId: sub.items.data[0]?.price?.product,
      priceId: sub.items.data[0]?.price?.id,
      subscriptionEnd: new Date(sub.current_period_end * 1000).toISOString(),
    };
  }

  // ── Resume Checkout ────────────────────────────────────────────────────────

  async resumeCheckout(userId: string) {
    const CAKTO: Record<string, string> = {
      starter: 'https://pay.cakto.com.br/i2idsg2_826963',
      pro: 'https://pay.cakto.com.br/ja8fqo7_826966',
      agency: 'https://pay.cakto.com.br/koi46f5_826967',
    };

    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      include: { planRef: true },
    });

    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    if (tenant.status !== 'pending_payment') {
      return { active: true, message: 'Loja já está ativa' };
    }

    const slug = tenant.planRef?.slug ?? tenant.plan;
    const checkoutUrl = CAKTO[slug];
    if (!checkoutUrl) throw new NotFoundException('URL de checkout não encontrada');

    return { checkoutUrl, tenantId: tenant.id };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('payment-gateways')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment-gateways')
class PaymentGatewaysController {
  constructor(private readonly service: PaymentGatewaysService) {}

  @Get('mp/availability')
  @ApiOperation({ summary: 'Verifica disponibilidade MercadoPago para vitrine (público via tenantId)' })
  mpAvailability(@TenantId() tenantId: string) {
    return this.service.getMpCheckoutAvailability(tenantId);
  }

  @Get('mp')
  @ApiOperation({ summary: 'Busca credenciais MercadoPago da loja' })
  getGateway(@TenantId() tenantId: string) {
    return this.service.getGateway(tenantId);
  }

  @Post('mp')
  @ApiOperation({ summary: 'Salva/atualiza credenciais MercadoPago' })
  upsertGateway(@TenantId() tenantId: string, @Body() dto: UpsertGatewayDto) {
    return this.service.upsertGateway(tenantId, 'mercado_pago', dto);
  }

  @Get('stripe/subscription')
  @ApiOperation({ summary: 'Verifica assinatura Stripe ativa do usuário' })
  checkSubscription(@CurrentUser() user: any) {
    return this.service.checkStripeSubscription(user.email);
  }

  @Post('resume-checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retoma checkout Cakto para tenant pending_payment' })
  resumeCheckout(@CurrentUser() user: any) {
    return this.service.resumeCheckout(user.id);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  controllers: [PaymentGatewaysController],
  providers: [PaymentGatewaysService],
  exports: [PaymentGatewaysService],
})
export class PaymentGatewaysModule {}
