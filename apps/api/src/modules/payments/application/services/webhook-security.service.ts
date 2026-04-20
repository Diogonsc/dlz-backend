import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';

const MAX_SKEW_SECONDS = 300;
const NONCE_TTL_MS = 300_000;

type Provider = 'mercado_pago' | 'cakto';

@Injectable()
export class WebhookSecurityService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly structured: StructuredLoggerService,
  ) {}

  async validate(input: {
    provider: Provider;
    tenantId?: string;
    rawBody: Buffer;
    signature?: string | null;
    timestamp?: string | null;
    nonce?: string | null;
    secret: string;
  }): Promise<void> {
    const signature = this.clean(input.signature);
    const timestamp = this.clean(input.timestamp);
    const nonce = this.clean(input.nonce);
    if (!signature || !timestamp || !nonce) {
      throw new UnauthorizedException('Webhook signature headers ausentes');
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      throw new UnauthorizedException('Webhook timestamp inválido');
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > MAX_SKEW_SECONDS) {
      throw new UnauthorizedException('Webhook timestamp fora da janela permitida');
    }

    const nonceKey = `webhook:${input.provider}:${input.tenantId ?? 'global'}:nonce:${nonce}`;
    const seen = await this.cache.get<boolean>(nonceKey);
    if (seen) {
      throw new UnauthorizedException('Webhook nonce duplicado');
    }

    const base = `${timestamp}.${nonce}.${input.rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', input.secret).update(base).digest('hex');
    const provided = signature.replace(/^sha256=/i, '').toLowerCase();

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(provided, 'utf8');
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      this.structured.warn({
        type: 'security',
        action: 'webhook_hmac_invalid',
        provider: input.provider,
        tenantId: input.tenantId ?? null,
      });
      throw new UnauthorizedException('Webhook assinatura inválida');
    }

    await this.cache.set(nonceKey, true, NONCE_TTL_MS);
  }

  private clean(v?: string | null): string | null {
    if (!v) return null;
    const out = v.trim();
    return out.length > 0 ? out : null;
  }
}
