import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { AppConfig } from '../../config/app.config';
import { APP_CONFIG } from '../../config/app-config.module';

@Injectable()
export class PaymentGatewayHealthService {
  private readonly cacheTtlMs: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    const ttlSeconds = Number(this.config.paymentGatewayHealth.cacheTtlSeconds ?? 300);
    this.cacheTtlMs = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : 300_000;
  }

  private getMercadoPagoHealthKey(tenantId: string): string {
    return `tenant:${tenantId}:mp:health`;
  }

  async getMercadoPagoHealth(tenantId: string): Promise<boolean | null> {
    const key = this.getMercadoPagoHealthKey(tenantId);
    const cached = await this.cache.get<boolean | null>(key);
    return typeof cached === 'boolean' ? cached : null;
  }

  async setMercadoPagoHealth(tenantId: string, value: boolean): Promise<void> {
    const key = this.getMercadoPagoHealthKey(tenantId);
    await this.cache.set(key, value, this.cacheTtlMs);
  }
}
