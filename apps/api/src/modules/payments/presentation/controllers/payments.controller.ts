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
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
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
import {
  ApiAuthEndpoint,
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
  ApiTooManyRequestsResponse,
} from '../../../../common/swagger/http-responses.decorators';
import {
  CaktoWebhookPayloadDto,
  MercadoPagoWebhookPayloadDto,
  StripeWebhookEventPayloadDto,
} from '../dtos/payment-webhooks.dto';
import { StripeWebhookAckResponseDto } from '../../../../common/dtos/simple-contract.dto';
import {
  BillingSubscriptionSummaryResponseDto,
  MercadoPagoPreferenceResponseDto,
  StripeUrlNullableResponseDto,
} from '../dtos/payment-response.dto';

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
  @ApiAuthEndpoint()
  @ApiOperation({
    operationId: 'getBillingSubscriptionSummary',
    summary: 'Resumo de plano/assinatura do tenant (envelope padrão; não altera rotas legadas de checkout)',
  })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: BillingSubscriptionSummaryResponseDto,
    description: 'Resumo de billing (estrutura interna do caso de uso)',
  })
  billingSummary(@TenantId() tenantId: string) {
    return this.getTenantSubscriptionSummaryUc.execute(tenantId);
  }

  @Post('stripe/checkout')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'createStripeCheckout', summary: 'Cria sessão Stripe Checkout para assinatura' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: StripeUrlNullableResponseDto,
    description: 'URL ou payload retornado pelo Stripe Checkout',
  })
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
  @ApiAuthEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'createStripeBillingPortal', summary: 'Abre portal de assinatura Stripe (gerenciar/cancelar)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: StripeUrlNullableResponseDto,
    description: 'URL do portal Stripe',
  })
  createStripePortal(@TenantId() tenantId: string, @CurrentUser() user: { email: string }) {
    return this.createStripePortalUc.execute({ tenantId, customerEmail: user.email });
  }

  @Post('stripe/webhook')
  @Throttle({ webhook: { limit: 240, ttl: 60000 } })
  @ApiTooManyRequestsResponse('Limite de webhooks Stripe por minuto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'stripeWebhook',
    summary: 'Webhook Stripe (usa raw body + stripe-signature)',
    description:
      'O corpo deve ser o JSON bruto enviado pelo Stripe. A assinatura `Stripe-Signature` é obrigatória.',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({
    type: StripeWebhookAckResponseDto,
    description: 'Confirmação de processamento (ex.: { received: true })',
  })
  @ApiHeader({ name: 'stripe-signature', required: true, description: 'Cabeçalho de verificação HMAC do Stripe' })
  @ApiBody({
    required: false,
    type: StripeWebhookEventPayloadDto,
    description:
      'Documentação ilustrativa; em produção o Fastify expõe `rawBody` para validação criptográfica.',
  })
  async stripeWebhook(
    @Req() req: RawBodyRequest<object>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as { rawBody?: Buffer }).rawBody ?? Buffer.from('');
    return this.handleStripeWebhookUc.execute(rawBody, signature);
  }

  @Post('cakto/webhook')
  @Throttle({ webhook: { limit: 240, ttl: 60000 } })
  @ApiTooManyRequestsResponse('Limite de webhooks Cakto por minuto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'caktoWebhook', summary: 'Webhook Cakto (assinaturas / checkout)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({
    type: StripeWebhookAckResponseDto,
    description: 'Resultado do processamento do evento Cakto',
  })
  @ApiBody({ type: CaktoWebhookPayloadDto, description: 'Payload JSON do webhook (campos variam por evento)' })
  @ApiHeader({ name: 'x-cakto-signature', required: false })
  @ApiHeader({ name: 'x-signature', required: false, description: 'HMAC alternativo' })
  @ApiHeader({ name: 'x-timestamp', required: false })
  @ApiHeader({ name: 'x-nonce', required: false })
  async caktoWebhook(
    @Req() req: RawBodyRequest<object>,
    @Headers('x-cakto-signature') signature: string | null,
    @Headers('x-signature') hmacSignature: string | null,
    @Headers('x-timestamp') timestamp: string | null,
    @Headers('x-nonce') nonce: string | null,
    @Body() payload: object,
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
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'createMercadoPagoPreference', summary: 'Cria preferência MercadoPago (Checkout Pro)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: MercadoPagoPreferenceResponseDto,
    description: 'Preferência MP (init_point / sandbox_init_point, etc.)',
  })
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
  @ApiTooManyRequestsResponse('Limite de webhooks Mercado Pago por minuto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'mercadopagoWebhook', summary: 'Webhook Mercado Pago' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({
    type: StripeWebhookAckResponseDto,
    description: 'Ack do processamento do webhook',
  })
  @ApiBody({ type: MercadoPagoWebhookPayloadDto, description: 'JSON do webhook (estrutura varia por tópico)' })
  @ApiHeader({ name: 'x-signature', required: false })
  @ApiHeader({ name: 'x-timestamp', required: false })
  @ApiHeader({ name: 'x-nonce', required: false })
  @ApiQuery({
    name: 'tenantId',
    required: false,
    type: String,
    description: 'Tenant correlacionado (quando enviado na URL de callback)',
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    type: String,
    description: 'Pedido correlacionado (quando enviado na URL de callback)',
  })
  mercadopagoWebhook(
    @Req() req: RawBodyRequest<object>,
    @Body() payload: object,
    @Headers('x-signature') signature: string | null,
    @Headers('x-timestamp') timestamp: string | null,
    @Headers('x-nonce') nonce: string | null,
    @Query('tenantId') tenantId?: string,
    @Query('orderId') orderId?: string,
  ) {
    const rawBody = (req as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.handleMercadoPagoWebhookUc.execute(
      payload as never,
      { tenantId, orderId },
      { rawBody, signature, timestamp, nonce },
    );
  }
}
