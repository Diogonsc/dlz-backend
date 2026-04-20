import { Module } from '@nestjs/common';
import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Controller, Get, Post, Body, Headers, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class IfoodService {
  private readonly logger = new Logger(IfoodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Auth iFood ─────────────────────────────────────────────────────────────

  async getAuthUrl(tenantId: string) {
    const clientId = this.config.get<string>('IFOOD_CLIENT_ID', '');
    const redirectUri = `${this.config.get('API_URL')}/api/v1/ifood/callback`;
    const state = Buffer.from(tenantId).toString('base64url');
    const url = `https://merchant-api.ifood.com.br/oauth/v1/oauth-code?clientId=${clientId}&redirectUri=${redirectUri}&state=${state}`;
    return { url };
  }

  async handleCallback(code: string, state: string) {
    const tenantId = Buffer.from(state, 'base64url').toString();
    const clientId = this.config.get<string>('IFOOD_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('IFOOD_CLIENT_SECRET', '');

    const res = await fetch('https://merchant-api.ifood.com.br/oauth/v1/access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grantType: 'authorization_code',
        clientId,
        clientSecret,
        authorizationCode: code,
        authorizationCodeVerifier: '',
      }),
    });

    if (!res.ok) throw new UnauthorizedException('iFood auth failed');
    const data = await res.json() as any;

    await this.prisma.ifoodCredential.upsert({
      where: { tenantId },
      create: {
        tenantId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: new Date(Date.now() + data.expiresIn * 1000),
        isActive: true,
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: new Date(Date.now() + data.expiresIn * 1000),
        isActive: true,
      },
    });

    return { ok: true };
  }

  async getStatus(tenantId: string) {
    const cred = await this.prisma.ifoodCredential.findUnique({ where: { tenantId } });
    if (!cred) return { connected: false };
    return {
      connected: cred.isActive,
      merchantId: cred.merchantId,
      expiresAt: cred.expiresAt,
    };
  }

  async disconnect(tenantId: string) {
    await this.prisma.ifoodCredential.update({
      where: { tenantId },
      data: { isActive: false, accessToken: null, refreshToken: null },
    });
    return { ok: true };
  }

  // ── Webhook iFood ──────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string | null, payload: any) {
    // Verifica assinatura HMAC
    await this.verifySignature(rawBody, signature, payload.merchantId);

    const eventType = payload.fullCode ?? payload.code ?? 'UNKNOWN';
    this.logger.log(`iFood webhook: ${eventType} order=${payload.orderId}`);

    if (['PLC', 'CFM', 'REC', 'DSP', 'CON'].includes(eventType.split('.')[1] ?? '')) {
      await this.syncOrder(payload);
    }

    return { received: true };
  }

  private async syncOrder(payload: any) {
    const cred = await this.prisma.ifoodCredential.findFirst({
      where: { merchantId: payload.merchantId, isActive: true },
    });
    if (!cred) return;

    // Busca detalhes do pedido no iFood
    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${payload.orderId}`, {
      headers: { Authorization: `Bearer ${cred.accessToken}` },
    });
    if (!res.ok) return;
    const ifoodOrder = await res.json() as any;

    // Mapeia status iFood → DLZ
    const statusMap: Record<string, any> = {
      PLACED: 'pending',
      CONFIRMED: 'preparing',
      READY_TO_PICKUP: 'preparing',
      DISPATCHED: 'delivery',
      CONCLUDED: 'delivered',
    };
    const status = statusMap[ifoodOrder.orderStatus] ?? 'pending';

    // Upsert no banco local
    const orderCode = `IFD-${ifoodOrder.id?.slice(-8).toUpperCase()}`;
    await this.prisma.order.upsert({
      where: { orderCode },
      create: {
        tenantId: cred.tenantId,
        orderCode,
        customerName: ifoodOrder.customer?.name ?? 'Cliente iFood',
        customerPhone: ifoodOrder.customer?.phone ?? '',
        address: ifoodOrder.delivery?.deliveryAddress?.formattedAddress ?? '',
        payment: 'card',
        items: ifoodOrder.items ?? [],
        subtotal: ifoodOrder.orderAmount ?? 0,
        deliveryFee: ifoodOrder.deliveryFee ?? 0,
        total: (ifoodOrder.orderAmount ?? 0) + (ifoodOrder.deliveryFee ?? 0),
        status,
        orderSource: 'ifood',
      },
      update: { status },
    });
  }

  private async verifySignature(rawBody: Buffer, signature: string | null, merchantId?: string) {
    if (!merchantId || !signature) return; // sem cred → ignora
    const cred = await this.prisma.ifoodCredential.findFirst({ where: { merchantId } });
    if (!cred) return;
    const secret = this.config.get<string>('IFOOD_CLIENT_SECRET', '');
    if (!secret) return;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature.replace(/^0x/, ''), 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('iFood signature inválida');
    }
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('ifood')
@Controller('ifood')
class IfoodController {
  constructor(private readonly ifoodService: IfoodService) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inicia fluxo OAuth iFood' })
  getAuthUrl(@TenantId() tenantId: string) {
    return this.ifoodService.getAuthUrl(tenantId);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback OAuth iFood' })
  callback(@Req() req: any) {
    const { code, state } = req.query;
    return this.ifoodService.handleCallback(code, state);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da integração iFood' })
  status(@TenantId() tenantId: string) {
    return this.ifoodService.getStatus(tenantId);
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desconecta integração iFood' })
  disconnect(@TenantId() tenantId: string) {
    return this.ifoodService.disconnect(tenantId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook iFood' })
  webhook(@Req() req: any, @Headers('x-ifood-signature') sig: string, @Body() payload: any) {
    const rawBody = (req as any).rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.ifoodService.handleWebhook(rawBody, sig, payload);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({ controllers: [IfoodController], providers: [IfoodService] })
export class IfoodModule {}

// ── Patch: adiciona sync manual ao IfoodModule ────────────────────────────────
// O endpoint POST /ifood/sync-order substitui a Edge Function ifood-order-sync
// chamada em useOrders.ts quando o lojista muda status de pedido iFood.
//
// Para ativar, adicione ao IfoodModule.providers: [IfoodSyncService]
// e importe { IfoodSyncService } de './ifood-sync.service'
// e adicione ao controller:
//
// @Post('sync-order')
// @UseGuards(JwtAuthGuard)
// @HttpCode(HttpStatus.OK)
// syncOrder(@CurrentUser() user: any, @Body() body: { order_id: string; new_status: string; previous_status?: string }) {
//   return this.ifoodSyncService.syncOrderStatus(body.order_id, body.new_status, user.id);
// }
