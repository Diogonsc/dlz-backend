import { SkipThrottle } from '@nestjs/throttler';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PaymentGatewaysService } from '../../application/services/payment-gateways.service';
import { UpsertGatewayDto } from '../dtos/upsert-gateway.dto';
import {
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { RpcPaymentGatewayPersistedResponseDto } from '../../../rpcs/presentation/dtos/rpcs-response.dto';
import {
  MpCheckoutAvailabilityResponseDto,
  ResumeCaktoCheckoutResponseDto,
  StripeUserSubscriptionCheckResponseDto,
} from '../dtos/payment-gateways-response.dto';

@ApiTags('payment-gateways')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('payment-gateways')
export class PaymentGatewaysController {
  constructor(private readonly service: PaymentGatewaysService) {}

  @Get('mp/availability')
  @ApiOperation({
    operationId: 'paymentGatewaysMpAvailability',
    summary: 'Verifica disponibilidade Mercado Pago para vitrine',
    description: 'Usa o tenant do JWT para checar se o checkout MP está habilitado.',
  })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: MpCheckoutAvailabilityResponseDto, description: 'Disponibilidade e flags de checkout' })
  mpAvailability(@TenantId() tenantId: string) {
    return this.service.getMpCheckoutAvailability(tenantId);
  }

  @Get('mp')
  @ApiOperation({ operationId: 'paymentGatewaysGetMp', summary: 'Busca credenciais Mercado Pago da loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcPaymentGatewayPersistedResponseDto,
    description: 'Registro do gateway (pode ser `null` se não configurado)',
  })
  getGateway(@TenantId() tenantId: string) {
    return this.service.getGateway(tenantId);
  }

  @Post('mp')
  @ApiOperation({ operationId: 'paymentGatewaysUpsertMp', summary: 'Salva/atualiza credenciais Mercado Pago' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: RpcPaymentGatewayPersistedResponseDto, description: 'Gateway persistido' })
  upsertGateway(@TenantId() tenantId: string, @Body() dto: UpsertGatewayDto) {
    return this.service.upsertGateway(tenantId, 'mercado_pago', dto);
  }

  @Get('stripe/subscription')
  @ApiOperation({ operationId: 'paymentGatewaysStripeSubscription', summary: 'Verifica assinatura Stripe ativa do usuário' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: StripeUserSubscriptionCheckResponseDto, description: 'Estado da assinatura Stripe' })
  checkSubscription(@CurrentUser() user: { email: string }) {
    return this.service.checkStripeSubscription(user.email);
  }

  @Post('resume-checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'paymentGatewaysResumeCaktoCheckout', summary: 'Retoma checkout Cakto para tenant pending_payment' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: ResumeCaktoCheckoutResponseDto, description: 'URL ou instruções de retomada' })
  resumeCheckout(@CurrentUser() user: { id: string }) {
    return this.service.resumeCheckout(user.id);
  }
}
