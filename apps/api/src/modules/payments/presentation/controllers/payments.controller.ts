import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Req,
  RawBodyRequest,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { RequireTenantGuard } from '../../../../common/guards/require-tenant.guard';
import { CreateCheckoutDto } from '../dtos/create-checkout.dto';
import { CreateMpPreferenceDto } from '../dtos/create-mp-preference.dto';
import { CreateStripeCheckoutUseCase } from '../../application/use-cases/create-stripe-checkout.use-case';
import { CreateStripePortalUseCase } from '../../application/use-cases/create-stripe-portal.use-case';
import { CreateMercadoPagoPreferenceUseCase } from '../../application/use-cases/create-mercadopago-preference.use-case';
import { HandleStripeWebhookUseCase } from '../../application/use-cases/handle-stripe-webhook.use-case';
import { HandleCaktoWebhookUseCase } from '../../application/use-cases/handle-cakto-webhook.use-case';
import { HandleMercadoPagoWebhookUseCase } from '../../application/use-cases/handle-mercadopago-webhook.use-case';
import { GetTenantSubscriptionSummaryUseCase } from '../../application/use-cases/get-tenant-subscription-summary.use-case';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createStripeCheckoutUc: CreateStripeCheckoutUseCase,
    private readonly createStripePortalUc: CreateStripePortalUseCase,
    private readonly createMpPreferenceUc: CreateMercadoPagoPreferenceUseCase,
    private readonly handleStripeWebhookUc: HandleStripeWebhookUseCase,
    private readonly handleCaktoWebhookUc: HandleCaktoWebhookUseCase,
    private readonly handleMercadoPagoWebhookUc: HandleMercadoPagoWebhookUseCase,
    private readonly getTenantSubscriptionSummaryUc: GetTenantSubscriptionSummaryUseCase,
  ) {}

  @Get('billing/summary')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resumo de plano/assinatura do tenant (envelope padrão; não altera rotas legadas de checkout)',
  })
  billingSummary(@TenantId() tenantId: string) {
    return this.getTenantSubscriptionSummaryUc.execute(tenantId);
  }

  @Post('stripe/checkout')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria sessão Stripe Checkout para assinatura' })
  createStripeCheckout(
    @Body() dto: CreateCheckoutDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: { email: string },
  ) {
    return this.createStripeCheckoutUc.execute({
      priceId: dto.priceId,
      tenantId,
      customerEmail: user.email,
    });
  }

  @Post('stripe/portal')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abre portal de assinatura Stripe (gerenciar/cancelar)' })
  createStripePortal(@TenantId() tenantId: string, @CurrentUser() user: { email: string }) {
    return this.createStripePortalUc.execute({ tenantId, customerEmail: user.email });
  }

  @Post('stripe/webhook')
  @Throttle({ webhook: { limit: 240, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Stripe (raw body obrigatório)' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Record<string, unknown>>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as { rawBody?: Buffer }).rawBody ?? Buffer.from('');
    return this.handleStripeWebhookUc.execute(rawBody, signature);
  }

  @Post('cakto/webhook')
  @Throttle({ webhook: { limit: 240, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Cakto' })
  async caktoWebhook(
    @Req() req: RawBodyRequest<Record<string, unknown>>,
    @Headers('x-cakto-signature') signature: string | null,
    @Headers('x-signature') hmacSignature: string | null,
    @Headers('x-timestamp') timestamp: string | null,
    @Headers('x-nonce') nonce: string | null,
    @Body() payload: Record<string, unknown>,
  ) {
    const rawBody = (req as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.handleCaktoWebhookUc.execute({
      rawBody,
      signature: hmacSignature ?? signature,
      timestamp,
      nonce,
      payload: payload as never,
    });
  }

  @Post('mercadopago/preference')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria preferência MercadoPago (Checkout Pro)' })
  createMpPreference(@TenantId() tenantId: string, @Body() dto: CreateMpPreferenceDto) {
    return this.createMpPreferenceUc.execute({
      tenantId,
      items: dto.items,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      returnUrl: dto.returnUrl,
      orderId: dto.orderId,
    });
  }

  @Post('mercadopago/webhook')
  @Throttle({ webhook: { limit: 240, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook MercadoPago' })
  mercadopagoWebhook(
    @Req() req: RawBodyRequest<Record<string, unknown>>,
    @Body() payload: Record<string, unknown>,
    @Headers('x-signature') signature: string | null,
    @Headers('x-timestamp') timestamp: string | null,
    @Headers('x-nonce') nonce: string | null,
    @Query('tenantId') tenantId?: string,
    @Query('orderId') orderId?: string,
  ) {
    const rawBody = (req as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.handleMercadoPagoWebhookUc.execute(
      payload,
      { tenantId, orderId },
      { rawBody, signature, timestamp, nonce },
    );
  }
}
