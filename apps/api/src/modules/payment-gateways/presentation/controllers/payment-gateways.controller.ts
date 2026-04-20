import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PaymentGatewaysService } from '../../application/services/payment-gateways.service';
import { UpsertGatewayDto } from '../dtos/upsert-gateway.dto';

@ApiTags('payment-gateways')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment-gateways')
export class PaymentGatewaysController {
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
