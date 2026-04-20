import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RpcsService } from '../../application/services/rpcs.service';
import {
  CreateStoreAdminDto,
  GetOrCreateTabDto,
  UpsertCustomerProfileDto,
  UpsertIfoodCredentialsDto,
  UpsertMpGatewayDto,
} from '../dtos/rpcs.dto';

@ApiTags('rpc')
@Controller('rpc')
export class RpcsController {
  constructor(private readonly rpcsService: RpcsService) {}

  @Get('resolve-store')
  @ApiOperation({ summary: 'Resolve tenantId por slug ou host (substitui resolve_store_slug / resolve_store_by_host)' })
  resolveStore(@Query('slug') slug?: string, @Query('host') host?: string) {
    return this.rpcsService.resolveStore(slug, host);
  }

  @Get('store-config')
  @ApiOperation({ summary: 'Config pública completa da loja (substitui get_public_store_config). Query store_id obrigatória.' })
  getPublicStoreConfig(@Query('store_id') storeId: string) {
    return this.rpcsService.getPublicStoreConfig(storeId);
  }

  @Get('pix-config')
  @ApiOperation({ summary: 'Chave Pix da loja (substitui get_store_pix_config). Query store_id obrigatória.' })
  getPixConfig(@Query('store_id') storeId: string) {
    return this.rpcsService.getStorePixConfig(storeId);
  }

  @Get('table-token/:token')
  @ApiOperation({ summary: 'Resolve mesa por QR token (substitui resolve_table_token)' })
  resolveTableToken(@Param('token') token: string) {
    return this.rpcsService.resolveTableToken(token);
  }

  @Get('customer-profile')
  @ApiOperation({ summary: 'Perfil de cliente por telefone (substitui get_customer_profile)' })
  getCustomerProfile(@Query('phone') phone: string) {
    return this.rpcsService.getCustomerProfile(phone);
  }

  @Post('customer-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Salva/atualiza perfil do cliente (substitui upsert_customer_profile)' })
  upsertCustomerProfile(@Query('store_id') tenantId: string, @Body() dto: UpsertCustomerProfileDto) {
    return this.rpcsService.upsertCustomerProfile(tenantId, dto);
  }

  @Post('confirm-delivery/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma recebimento do pedido pelo cliente (substitui confirm_delivery_received)' })
  confirmDelivery(@Param('code') code: string) {
    return this.rpcsService.confirmDeliveryReceived(code);
  }

  @Post('finalize-table-payment/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finaliza pagamento de comanda de mesa (substitui finalize_table_order_payment)' })
  finalizeTablePayment(@Param('code') code: string) {
    return this.rpcsService.finalizeTableOrderPayment(code);
  }

  @Get('plan-limits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Limites de plano do tenant (substitui get_tenant_plan_limits)' })
  getPlanLimits(@TenantId() tenantId: string) {
    return this.rpcsService.getTenantPlanLimits(tenantId);
  }

  @Get('can-create/:resource')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verifica se pode criar recurso (substitui can_create_resource)' })
  canCreate(@TenantId() tenantId: string, @Param('resource') resource: string) {
    return this.rpcsService.canCreateResource(tenantId, resource);
  }

  @Post('open-tab')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Abre ou retorna comanda aberta da mesa (substitui get_or_create_open_tab). Preferir fluxo via OrdersModule/use case em novas integrações.',
    deprecated: true,
  })
  getOrCreateTab(@TenantId() tenantId: string, @Body() dto: GetOrCreateTabDto) {
    return this.rpcsService.getOrCreateOpenTab(tenantId, dto.tableId).then((id) => ({ id }));
  }

  @Get('inactive-customers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clientes inativos para winback (substitui get_inactive_customers)' })
  inactiveCustomers(@TenantId() tenantId: string) {
    return this.rpcsService.getInactiveCustomers(tenantId);
  }

  @Get('ifood-credentials')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Credenciais iFood sem expor secrets (substitui get_ifood_credentials_safe)' })
  getIfoodCredentials(@TenantId() tenantId: string) {
    return this.rpcsService.getIfoodCredentialsSafe(tenantId);
  }

  @Post('ifood-credentials')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Salva credenciais iFood (substitui upsert_ifood_credentials)' })
  upsertIfoodCredentials(@TenantId() tenantId: string, @Body() dto: UpsertIfoodCredentialsDto) {
    return this.rpcsService.upsertIfoodCredentials(tenantId, dto);
  }

  @Get('mp-gateway')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Credenciais MP mascaradas (substitui get_mercadopago_gateway_admin)' })
  getMpGateway(@TenantId() tenantId: string) {
    return this.rpcsService.getMpGatewayAdmin(tenantId);
  }

  @Post('mp-gateway')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Salva credenciais MP (substitui upsert_mercadopago_gateway_admin)' })
  upsertMpGateway(@TenantId() tenantId: string, @Body() dto: UpsertMpGatewayDto) {
    return this.rpcsService.upsertMpGatewayAdmin(tenantId, dto);
  }

  @Post('create-store-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria usuário admin de loja (substitui create-store-admin Edge Function)' })
  createStoreAdmin(@CurrentUser() user: any, @Body() dto: CreateStoreAdminDto) {
    return this.rpcsService.createStoreAdmin(user.id, dto);
  }
}
