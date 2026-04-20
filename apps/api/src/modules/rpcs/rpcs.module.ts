import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { GetOrCreateOpenTabUseCase } from '../orders/application/use-cases/get-or-create-open-tab.use-case';
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser, TenantId } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { normalizePhone, slugify } from '@dlz/shared';

// ── DTOs ─────────────────────────────────────────────────────────────────────

class UpsertCustomerProfileDto {
  @IsString() phone: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() address?: string;
}

class UpsertIfoodCredentialsDto {
  @IsString() clientId: string;
  @IsString() merchantId: string;
  @IsBoolean() enabled: boolean;
  @IsOptional() @IsString() clientSecret?: string;
}

class UpsertMpGatewayDto {
  @IsOptional() @IsString() publicKey?: string;
  @IsOptional() @IsString() accessToken?: string;
  @IsOptional() @IsString() webhookSecret?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() environment?: string;
  @IsOptional() enabledMethods?: Record<string, boolean>;
}

class CreateStoreAdminDto {
  @IsString() email: string;
  @IsString() password: string;
  @IsOptional() @IsString() name?: string;
}

class GetOrCreateTabDto {
  @IsUUID() tableId: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class RpcsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getOrCreateOpenTabUseCase: GetOrCreateOpenTabUseCase,
  ) {}

  // ── resolve_store_slug / resolve_store_by_host ─────────────────────────────

  async resolveStore(slug?: string, host?: string) {
    if (host) {
      // Tenta subdomain (e.g. burger-house.dlz.app.br → burger-house)
      const subdomain = host.split('.')[0];
      const byHost = await this.prisma.tenant.findFirst({
        where: {
          OR: [
            { storeConfig: { customDomain: host } },
            { subdomain },
          ],
          status: { in: ['active', 'trial'] },
        },
        select: { id: true, subdomain: true, status: true, trialEndsAt: true },
      });
      if (byHost) return { id: byHost.id };
    }

    if (slug) {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          OR: [
            { id: slug },
            { url: { contains: slug } },
            { subdomain: slug.toLowerCase() },
          ],
          status: { in: ['active', 'trial'] },
        },
        select: { id: true },
      });
      if (!tenant) throw new NotFoundException('Loja não encontrada');
      return { id: tenant.id };
    }

    throw new BadRequestException('slug ou host obrigatório');
  }

  // ── get_public_store_config ────────────────────────────────────────────────

  async getPublicStoreConfig(tenantId?: string) {
    const store = await this.prisma.storeConfig.findFirst({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: {
          select: {
            id: true, status: true, plan: true, trialEndsAt: true,
            themePrimary: true, themeAccent: true,
          },
        },
      },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return store;
  }

  // ── get_store_pix_config ───────────────────────────────────────────────────

  async getStorePixConfig(tenantId: string) {
    const store = await this.prisma.storeConfig.findUnique({
      where: { tenantId },
      select: { pixKey: true, pixKeyType: true },
    });
    if (!store) throw new NotFoundException('Config não encontrada');
    return store;
  }

  // ── get_tenant_plan_limits ─────────────────────────────────────────────────

  async getTenantPlanLimits(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, planId: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    // Mapeia agency → business (compatibilidade com plan_limits do Supabase)
    const planKey = tenant.plan === 'agency' ? 'business' : tenant.plan;

    const limit = await this.prisma.planLimit.findUnique({
      where: { plan: planKey },
    });

    if (!limit) {
      return { plan: planKey, maxProducts: 30, maxCategories: 10, maxCoupons: 3 };
    }
    return { plan: planKey, maxProducts: limit.maxProducts, maxCategories: limit.maxCategories, maxCoupons: limit.maxCoupons };
  }

  // ── can_create_resource ────────────────────────────────────────────────────

  async canCreateResource(tenantId: string, resource: string): Promise<{ allowed: boolean; current: number; max: number }> {
    const limits = await this.getTenantPlanLimits(tenantId);

    const counts: Record<string, () => Promise<number>> = {
      products: () => this.prisma.product.count({ where: { tenantId } }),
      categories: () => this.prisma.category.count({ where: { tenantId } }),
      coupons: () => this.prisma.coupon.count({ where: { tenantId } }),
    };

    const maxMap: Record<string, number> = {
      products: limits.maxProducts,
      categories: limits.maxCategories,
      coupons: limits.maxCoupons,
    };

    const countFn = counts[resource];
    if (!countFn) throw new BadRequestException(`Recurso inválido: ${resource}`);

    const current = await countFn();
    const max = maxMap[resource] ?? -1;
    const allowed = max < 0 || current < max;

    return { allowed, current, max };
  }

  // ── get_customer_profile / upsert_customer_profile ────────────────────────

  async getCustomerProfile(phone: string) {
    const normalized = normalizePhone(phone);
    const profile = await this.prisma.customerProfile.findFirst({
      where: { phoneNormalized: normalized },
    });
    return profile ?? null;
  }

  async upsertCustomerProfile(tenantId: string, dto: UpsertCustomerProfileDto) {
    const normalized = normalizePhone(dto.phone);
    return this.prisma.customerProfile.upsert({
      where: { tenantId_phoneNormalized: { tenantId, phoneNormalized: normalized } },
      create: {
        tenantId,
        phone: dto.phone,
        phoneNormalized: normalized,
        name: dto.name ?? '',
        email: dto.email,
      },
      update: {
        name: dto.name,
        email: dto.email,
      },
    });
  }

  // ── confirm_delivery_received ──────────────────────────────────────────────

  async confirmDeliveryReceived(orderCode: string): Promise<boolean> {
    const result = await this.prisma.order.updateMany({
      where: {
        orderCode: orderCode.toUpperCase(),
        orderSource: 'delivery',
        status: 'delivery',
      },
      data: { status: 'delivered' },
    });
    return result.count > 0;
  }

  // ── resolve_table_token ────────────────────────────────────────────────────

  async resolveTableToken(token: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { qrCodeToken: token },
      include: { tenant: { select: { id: true, status: true } } },
    });
    if (!table || table.status === 'inactive') throw new NotFoundException('Mesa não encontrada');
    return table;
  }

  // ── get_or_create_open_tab ────────────────────────────────────────────────

  async getOrCreateOpenTab(tenantId: string, tableId: string): Promise<string> {
    return this.getOrCreateOpenTabUseCase.execute(tenantId, tableId);
  }

  // ── finalize_table_order_payment ───────────────────────────────────────────

  async finalizeTableOrderPayment(orderCode: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode: orderCode.toUpperCase() },
      select: { tableId: true, tenantId: true, orderSource: true },
    });
    if (!order?.tableId || order.orderSource !== 'table') return false;

    await this.prisma.order.update({
      where: { orderCode: orderCode.toUpperCase() },
      data: { status: 'delivered' },
    });

    // Fecha tab se não há pedidos abertos na mesa
    const openOrders = await this.prisma.order.count({
      where: { tableId: order.tableId, status: { notIn: ['delivered', 'cancelled'] } },
    });
    if (openOrders === 0) {
      await this.prisma.tab.updateMany({
        where: { tableId: order.tableId, status: 'open' },
        data: { status: 'closed', closedAt: new Date() },
      });
    }
    return true;
  }

  // ── get_inactive_customers ─────────────────────────────────────────────────

  async getInactiveCustomers(tenantId: string) {
    const now = new Date();
    const cutoff15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const recentWinback30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Pega pedidos agrupados por cliente com última compra > 15 dias
    const orders = await this.prisma.order.findMany({
      where: { tenantId, createdAt: { lt: cutoff15 } },
      select: { customerPhone: true, customerName: true, total: true, createdAt: true },
    });

    // Agrupa por telefone
    const map = new Map<string, { name: string; lastOrder: Date; total: number; count: number; lastTotal: number }>();
    for (const o of orders) {
      const existing = map.get(o.customerPhone);
      if (!existing || o.createdAt > existing.lastOrder) {
        map.set(o.customerPhone, {
          name: o.customerName,
          lastOrder: o.createdAt,
          total: (existing?.total ?? 0) + Number(o.total),
          count: (existing?.count ?? 0) + 1,
          lastTotal: Number(o.total),
        });
      }
    }

    // Filtra quem já recebeu winback recentemente
    const recentLogs = await this.prisma.winbackLog.findMany({
      where: { tenantId, sentAt: { gt: recentWinback30 } },
      select: { customerPhone: true },
    });
    const excluded = new Set(
      recentLogs.map((l: (typeof recentLogs)[number]) => l.customerPhone),
    );

    const result = [];
    for (const [phone, data] of map) {
      if (excluded.has(phone)) continue;
      const daysSince = Math.floor((now.getTime() - data.lastOrder.getTime()) / (1000 * 60 * 60 * 24));
      let segment = '';
      if (daysSince >= 15 && daysSince < 30) segment = 'at_risk';
      else if (daysSince >= 30 && daysSince < 60) segment = 'inactive';
      else if (daysSince >= 60) segment = 'lost';
      else continue;

      result.push({
        store_id: tenantId,
        customer_phone: phone,
        customer_name: data.name,
        days_since_last_order: daysSince,
        segment,
        total_spent: data.total,
        total_orders: data.count,
        last_order_total: data.lastTotal,
      });
    }

    return result;
  }

  // ── iFood credentials ──────────────────────────────────────────────────────

  async getIfoodCredentialsSafe(tenantId: string) {
    const cred = await this.prisma.ifoodCredential.findUnique({
      where: { tenantId },
      select: { clientId: true, merchantId: true, enabled: true },
    });
    return cred ?? { clientId: '', merchantId: '', enabled: false };
  }

  async upsertIfoodCredentials(tenantId: string, dto: UpsertIfoodCredentialsDto) {
    const existing = await this.prisma.ifoodCredential.findUnique({ where: { tenantId } });

    if (!existing && (!dto.clientSecret || !dto.clientSecret.trim())) {
      throw new BadRequestException('client_secret obrigatório no primeiro cadastro');
    }

    return this.prisma.ifoodCredential.upsert({
      where: { tenantId },
      create: {
        tenantId,
        clientId: dto.clientId,
        clientSecret: dto.clientSecret ?? '',
        merchantId: dto.merchantId,
        enabled: dto.enabled,
      },
      update: {
        clientId: dto.clientId,
        merchantId: dto.merchantId,
        enabled: dto.enabled,
        ...(dto.clientSecret?.trim() ? { clientSecret: dto.clientSecret } : {}),
      },
    });
  }

  // ── MercadoPago gateway admin ──────────────────────────────────────────────

  async getMpGatewayAdmin(tenantId: string) {
    const gw = await this.prisma.paymentGateway.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'mercado_pago' } },
    });
    if (!gw) {
      return {
        found: false, publicKey: '', hasAccessToken: false,
        hasWebhookSecret: false, accessTokenMasked: '',
        webhookSecretMasked: '', isActive: false,
        environment: 'sandbox', enabledMethods: { credit_card: true, debit_card: true, pix: true },
      };
    }
    const mask = (s: string) => s.length > 8 ? `${s.slice(0, 4)}...${s.slice(-4)}` : '****';
    return {
      found: true,
      publicKey: gw.publicKey,
      hasAccessToken: !!gw.accessToken?.trim(),
      hasWebhookSecret: !!gw.webhookSecret?.trim(),
      accessTokenMasked: gw.accessToken?.trim() ? mask(gw.accessToken) : '',
      webhookSecretMasked: gw.webhookSecret?.trim() ? mask(gw.webhookSecret) : '',
      isActive: gw.isActive,
      environment: gw.environment,
      enabledMethods: gw.enabledMethods,
    };
  }

  async upsertMpGatewayAdmin(tenantId: string, dto: UpsertMpGatewayDto) {
    return this.prisma.paymentGateway.upsert({
      where: { tenantId_provider: { tenantId, provider: 'mercado_pago' } },
      create: { tenantId, provider: 'mercado_pago', ...dto },
      update: dto,
    });
  }

  // ── create-store-admin (SaaS dashboard) ───────────────────────────────────

  async createStoreAdmin(callerUserId: string, dto: CreateStoreAdminDto) {
    const callerRole = await this.prisma.userRole.findFirst({
      where: { userId: callerUserId, role: { in: ['admin', 'platform_owner'] } },
    });
    if (!callerRole) throw new BadRequestException('Sem permissão de administrador');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        profile: { create: { displayName: dto.name ?? dto.email } },
        roles: { create: { role: 'admin' } },
      },
      select: { id: true, email: true },
    });

    return { id: user.id, email: user.email, mustChangePassword: true };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('rpc')
@Controller('rpc')
export class RpcsController {
  constructor(private readonly rpcsService: RpcsService) {}

  // ── Públicos ───────────────────────────────────────────────────────────────

  @Get('resolve-store')
  @ApiOperation({ summary: 'Resolve tenantId por slug ou host (substitui resolve_store_slug / resolve_store_by_host)' })
  resolveStore(@Query('slug') slug?: string, @Query('host') host?: string) {
    return this.rpcsService.resolveStore(slug, host);
  }

  @Get('store-config')
  @ApiOperation({ summary: 'Config pública completa da loja (substitui get_public_store_config)' })
  getPublicStoreConfig(@Query('store_id') storeId?: string) {
    return this.rpcsService.getPublicStoreConfig(storeId);
  }

  @Get('pix-config')
  @ApiOperation({ summary: 'Chave Pix da loja (substitui get_store_pix_config)' })
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

  // ── Autenticados ───────────────────────────────────────────────────────────

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

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Post('create-store-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria usuário admin de loja (substitui create-store-admin Edge Function)' })
  createStoreAdmin(@CurrentUser() user: any, @Body() dto: CreateStoreAdminDto) {
    return this.rpcsService.createStoreAdmin(user.id, dto);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  imports: [OrdersModule],
  controllers: [RpcsController],
  providers: [RpcsService],
  exports: [RpcsService],
})
export class RpcsModule {}
