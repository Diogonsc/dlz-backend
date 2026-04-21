import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
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
  AdminProvisionTenantDto,
} from '../dtos/rpcs.dto';
import {
  ApiAuthEndpoint,
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { IdResponseDto } from '../../../../common/dtos/simple-contract.dto';
import { StoreConfigResponseDto } from '../../../stores/dtos/store-response.dto';
import {
  RpcCanCreateResourceResponseDto,
  RpcCreateStoreAdminResponseDto,
  RpcCustomerProfileResponseDto,
  RpcIfoodCredentialPersistedResponseDto,
  RpcIfoodCredentialsSafeResponseDto,
  RpcInactiveCustomerRowDto,
  RpcMpGatewayAdminResponseDto,
  RpcPaymentGatewayPersistedResponseDto,
  RpcPixConfigResponseDto,
  RpcPlanLimitsResponseDto,
  RpcResolveStoreResponseDto,
  RpcResolveTableTokenResponseDto,
} from '../dtos/rpcs-response.dto';

@ApiTags('rpc')
@Controller('rpc')
export class RpcsController {
  constructor(private readonly rpcsService: RpcsService) {}

  @Get('resolve-store')
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'rpcResolveStore',
    summary: 'Resolve tenantId por slug ou host (substitui resolve_store_slug / resolve_store_by_host)',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({
    type: RpcResolveStoreResponseDto,
    description: 'Identificadores da loja resolvida',
  })
  @ApiQuery({
    name: 'slug',
    required: false,
    type: String,
    description: 'Slug público da loja (alterna com host)',
  })
  @ApiQuery({
    name: 'host',
    required: false,
    type: String,
    description: 'Host da requisição (alterna com slug)',
  })
  resolveStore(@Query('slug') slug?: string, @Query('host') host?: string) {
    return this.rpcsService.resolveStore(slug, host);
  }

  @Get('store-config')
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'rpcGetPublicStoreConfig',
    summary: 'Config pública completa da loja (substitui get_public_store_config). Query store_id obrigatória.',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: StoreConfigResponseDto,
    description: 'Config pública serializada da loja',
  })
  @ApiQuery({ name: 'store_id', required: true, type: String, description: 'UUID do tenant/loja' })
  getPublicStoreConfig(@Query('store_id') storeId: string) {
    return this.rpcsService.getPublicStoreConfig(storeId);
  }

  @Get('pix-config')
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'rpcGetStorePixConfig',
    summary: 'Chave Pix da loja (substitui get_store_pix_config). Query store_id obrigatória.',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: RpcPixConfigResponseDto,
    description: 'Chave Pix e instruções de exibição',
  })
  @ApiQuery({ name: 'store_id', required: true, type: String, description: 'UUID do tenant/loja' })
  getPixConfig(@Query('store_id') storeId: string) {
    return this.rpcsService.getStorePixConfig(storeId);
  }

  @Get('table-token/:token')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'rpcResolveTableToken', summary: 'Resolve mesa por QR token (substitui resolve_table_token)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: RpcResolveTableTokenResponseDto,
    description: 'Mesa e contexto da comanda',
  })
  @ApiParam({ name: 'token', required: true, type: String, description: 'Token codificado no QR da mesa' })
  resolveTableToken(@Param('token') token: string) {
    return this.rpcsService.resolveTableToken(token);
  }

  @Get('customer-profile')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'rpcGetCustomerProfile', summary: 'Perfil de cliente por telefone (substitui get_customer_profile)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: RpcCustomerProfileResponseDto,
    description: 'Perfil do cliente (pode ser null quando não existe — corpo JSON null)',
  })
  @ApiQuery({
    name: 'phone',
    required: true,
    type: String,
    description: 'Telefone em formato normalizado (E.164 ou como armazenado)',
  })
  getCustomerProfile(@Query('phone') phone: string) {
    return this.rpcsService.getCustomerProfile(phone);
  }

  @Post('customer-profile')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'rpcUpsertCustomerProfile', summary: 'Salva/atualiza perfil do cliente (substitui upsert_customer_profile)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({
    type: RpcCustomerProfileResponseDto,
    description: 'Perfil atualizado',
  })
  @ApiQuery({ name: 'store_id', required: true, type: String, description: 'UUID do tenant/loja' })
  upsertCustomerProfile(@Query('store_id') tenantId: string, @Body() dto: UpsertCustomerProfileDto) {
    return this.rpcsService.upsertCustomerProfile(tenantId, dto);
  }

  @Post('confirm-delivery/:code')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'rpcConfirmDeliveryReceived',
    summary: 'Confirma recebimento do pedido pelo cliente (substitui confirm_delivery_received)',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    literal: 'boolean',
    description: 'Confirmação de entrega (true se atualizou pedido)',
  })
  @ApiParam({ name: 'code', required: true, type: String, description: 'Código público do pedido' })
  confirmDelivery(@Param('code') code: string) {
    return this.rpcsService.confirmDeliveryReceived(code);
  }

  @Post('finalize-table-payment/:code')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'rpcFinalizeTableOrderPayment',
    summary: 'Finaliza pagamento de comanda de mesa (substitui finalize_table_order_payment)',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    literal: 'boolean',
    description: 'Comanda finalizada (boolean)',
  })
  @ApiParam({ name: 'code', required: true, type: String, description: 'Código da comanda/mesa' })
  finalizeTablePayment(@Param('code') code: string) {
    return this.rpcsService.finalizeTableOrderPayment(code);
  }

  @Get('plan-limits')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'rpcGetTenantPlanLimits', summary: 'Limites de plano do tenant (substitui get_tenant_plan_limits)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcPlanLimitsResponseDto,
    description: 'Limites do plano atual',
  })
  getPlanLimits(@TenantId() tenantId: string) {
    return this.rpcsService.getTenantPlanLimits(tenantId);
  }

  @Get('can-create/:resource')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'rpcCanCreateResource', summary: 'Verifica se pode criar recurso (substitui can_create_resource)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcCanCreateResourceResponseDto,
    description: 'Flags de permissão / quota',
  })
  @ApiParam({
    name: 'resource',
    required: true,
    type: String,
    description: 'Identificador do recurso (ex.: product, category)',
  })
  canCreate(@TenantId() tenantId: string, @Param('resource') resource: string) {
    return this.rpcsService.canCreateResource(tenantId, resource);
  }

  @Post('open-tab')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'rpcGetOrCreateOpenTab',
    summary:
      'Abre ou retorna comanda aberta da mesa (substitui get_or_create_open_tab). Preferir fluxo via OrdersModule/use case em novas integrações.',
    deprecated: true,
  })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: IdResponseDto,
    description: 'Identificador da comanda aberta',
  })
  getOrCreateTab(@TenantId() tenantId: string, @Body() dto: GetOrCreateTabDto) {
    return this.rpcsService.getOrCreateOpenTab(tenantId, dto.tableId).then((id) => ({ id }));
  }

  @Get('inactive-customers')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'rpcGetInactiveCustomers', summary: 'Clientes inativos para winback (substitui get_inactive_customers)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcInactiveCustomerRowDto,
    isArray: true,
    description: 'Lista de clientes inativos',
  })
  inactiveCustomers(@TenantId() tenantId: string) {
    return this.rpcsService.getInactiveCustomers(tenantId);
  }

  @Get('ifood-credentials')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'rpcGetIfoodCredentialsSafe', summary: 'Credenciais iFood sem expor secrets (substitui get_ifood_credentials_safe)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcIfoodCredentialsSafeResponseDto,
    description: 'Credenciais mascaradas',
  })
  getIfoodCredentials(@TenantId() tenantId: string) {
    return this.rpcsService.getIfoodCredentialsSafe(tenantId);
  }

  @Post('ifood-credentials')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'rpcUpsertIfoodCredentials', summary: 'Salva credenciais iFood (substitui upsert_ifood_credentials)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcIfoodCredentialPersistedResponseDto,
    description: 'Credenciais persistidas',
  })
  upsertIfoodCredentials(@TenantId() tenantId: string, @Body() dto: UpsertIfoodCredentialsDto) {
    return this.rpcsService.upsertIfoodCredentials(tenantId, dto);
  }

  @Get('mp-gateway')
  @SkipThrottle({ short: true, long: true, webhook: true, replay: true, auth: true })
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'rpcGetMpGatewayAdmin', summary: 'Credenciais MP mascaradas (substitui get_mercadopago_gateway_admin)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcMpGatewayAdminResponseDto,
    description: 'Credenciais Mercado Pago mascaradas',
  })
  getMpGateway(@TenantId() tenantId: string) {
    return this.rpcsService.getMpGatewayAdmin(tenantId);
  }

  @Post('mp-gateway')
  @SkipThrottle({ short: true, long: true, webhook: true, replay: true, auth: true })
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'rpcUpsertMpGatewayAdmin', summary: 'Salva credenciais MP (substitui upsert_mercadopago_gateway_admin)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcPaymentGatewayPersistedResponseDto,
    description: 'Credenciais atualizadas',
  })
  upsertMpGateway(@TenantId() tenantId: string, @Body() dto: UpsertMpGatewayDto) {
    return this.rpcsService.upsertMpGatewayAdmin(tenantId, dto);
  }

  @Post('create-store-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'rpcCreateStoreAdmin', summary: 'Cria usuário admin de loja (substitui create-store-admin Edge Function)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RpcCreateStoreAdminResponseDto,
    description: 'Usuário admin criado',
  })
  createStoreAdmin(@CurrentUser() user: { id: string }, @Body() dto: CreateStoreAdminDto) {
    return this.rpcsService.createStoreAdmin(user.id, dto);
  }

  @Post('admin-provision-tenant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiAuthEndpoint()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'rpcAdminProvisionTenant',
    summary: 'Cria tenant vinculado a um userId (fluxo painel owner / Nova Loja)',
  })
  @ApiStandardErrorResponses({ conflict: true })
  @ApiJsonCreatedResponse({ description: 'Tenant criado com store_config' })
  adminProvisionTenant(@CurrentUser() user: { id: string }, @Body() dto: AdminProvisionTenantDto) {
    return this.rpcsService.adminProvisionTenant(user.id, dto);
  }
}
