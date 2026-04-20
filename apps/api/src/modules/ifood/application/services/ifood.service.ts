import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { IfoodAuthAction } from '../../domain/types/ifood-auth-action.type';

@Injectable()
export class IfoodService {
  private readonly logger = new Logger(IfoodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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
    const data = (await res.json()) as any;

    await this.prisma.ifoodCredential.upsert({
      where: { tenantId },
      create: {
        tenantId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: new Date(Date.now() + data.expiresIn * 1000),
        enabled: true,
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: new Date(Date.now() + data.expiresIn * 1000),
        enabled: true,
      },
    });

    return { ok: true };
  }

  async getStatus(tenantId: string) {
    const cred = await this.prisma.ifoodCredential.findUnique({ where: { tenantId } });
    if (!cred) return { connected: false };
    return {
      connected: cred.enabled,
      merchantId: cred.merchantId,
      tokenExpiresAt: cred.tokenExpiresAt,
      /** @deprecated Preferir tokenExpiresAt */
      expiresAt: cred.tokenExpiresAt,
    };
  }

  async disconnect(tenantId: string) {
    await this.prisma.ifoodCredential.updateMany({
      where: { tenantId },
      data: { enabled: false, accessToken: null, refreshToken: null },
    });
    return { ok: true };
  }

  async authAction(tenantId: string, action: IfoodAuthAction) {
    if (action !== 'refresh' && action !== 'test') {
      throw new BadRequestException('Ação inválida. Use "refresh" ou "test".');
    }

    const cred = await this.prisma.ifoodCredential.findUnique({ where: { tenantId } });
    if (!cred || !cred.enabled) {
      throw new NotFoundException('Integração iFood não configurada para este tenant');
    }

    if (action === 'refresh') {
      if (!cred.refreshToken) {
        throw new BadRequestException('Refresh token não disponível para este tenant');
      }

      const clientId = this.config.get<string>('IFOOD_CLIENT_ID', '');
      const clientSecret = this.config.get<string>('IFOOD_CLIENT_SECRET', '');
      const response = await fetch('https://merchant-api.ifood.com.br/oauth/v1/access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grantType: 'refresh_token',
          clientId,
          clientSecret,
          refreshToken: cred.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.warn(`Falha ao atualizar token iFood tenant=${tenantId}: ${errorBody}`);
        throw new UnauthorizedException('Falha ao atualizar token iFood');
      }

      const data = (await response.json()) as any;
      await this.prisma.ifoodCredential.update({
        where: { tenantId },
        data: {
          accessToken: data.accessToken ?? cred.accessToken,
          refreshToken: data.refreshToken ?? cred.refreshToken,
          tokenExpiresAt: data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : cred.tokenExpiresAt,
          enabled: true,
        },
      });

      return { ok: true, action: 'refresh' };
    }

    const testResponse = await fetch('https://merchant-api.ifood.com.br/merchant/v1.0/merchants', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cred.accessToken}`,
      },
    });

    if (!testResponse.ok) {
      const body = await testResponse.text();
      this.logger.warn(`Teste de token iFood falhou tenant=${tenantId}: ${body}`);
      return { ok: false, action: 'test', statusCode: testResponse.status };
    }

    return { ok: true, action: 'test', statusCode: testResponse.status };
  }

  async handleWebhook(rawBody: Buffer, signature: string | null, payload: any) {
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
      where: { merchantId: payload.merchantId, enabled: true },
    });
    if (!cred) return;

    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${payload.orderId}`, {
      headers: { Authorization: `Bearer ${cred.accessToken}` },
    });
    if (!res.ok) return;
    const ifoodOrder = (await res.json()) as any;

    const statusMap: Record<string, any> = {
      PLACED: 'pending',
      CONFIRMED: 'preparing',
      READY_TO_PICKUP: 'preparing',
      DISPATCHED: 'delivery',
      CONCLUDED: 'delivered',
    };
    const status = statusMap[ifoodOrder.orderStatus] ?? 'pending';

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
    if (!merchantId || !signature) return;
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
