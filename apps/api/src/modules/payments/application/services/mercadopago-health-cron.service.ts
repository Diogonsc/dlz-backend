import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { hostname } from 'node:os';
import Redis from 'ioredis';
import type { AppConfig } from '../../../../config/app.config';
import { APP_CONFIG } from '../../../../config/app-config.module';
import { PaymentGatewayHealthService } from '../../../../common/cache/payment-gateway-health.service';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { TenantPaymentConfigRepositoryPort } from '../../domain/ports/tenant-payment-config.repository.port';
import { ValidateMercadoPagoCredentialsUseCase } from '../use-cases/validate-mercadopago-credentials.use-case';

@Injectable()
export class MercadoPagoHealthCronService implements OnModuleDestroy {
  private readonly redis: Pick<Redis, 'set' | 'quit'>;
  private readonly instanceId: string;
  private readonly lockKey = 'payment_gateway_health_cron:lock';
  private readonly healthConfig: {
    enabled: boolean;
    limit: number;
    concurrency: number;
    jitterMs: number;
    lockTtlMs: number;
    cacheTtlSeconds: number;
  };

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly tenantPaymentConfigRepo: TenantPaymentConfigRepositoryPort,
    private readonly healthService: PaymentGatewayHealthService,
    private readonly validateUseCase: ValidateMercadoPagoCredentialsUseCase,
    private readonly structured: StructuredLoggerService,
    /** Só para testes; em runtime o Nest injeta `undefined` e usamos `new Redis(...)`. */
    @Optional()
    @Inject('MERCADOPAGO_HEALTH_CRON_REDIS')
    redisClient?: Pick<Redis, 'set' | 'quit'>,
  ) {
    const redisCfg = this.config.redis;
    this.redis = redisClient ?? new Redis(redisCfg.url, { maxRetriesPerRequest: null });
    this.healthConfig = this.config.paymentGatewayHealth;
    const host = hostname();
    this.instanceId = `${host}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  @Cron('*/5 * * * *')
  async warmMercadoPagoHealthCache(): Promise<void> {
    const cfg = this.healthConfig;
    if (!cfg.enabled) {
      return;
    }

    let acquired: string | null = null;
    try {
      acquired = await this.redis.set(this.lockKey, this.instanceId, 'PX', cfg.lockTtlMs, 'NX');
    } catch (err) {
      this.structured.warn({
        type: 'payment_gateway_health_cron',
        action: 'lock_error',
        provider: 'mercado_pago',
        errorMessage: err instanceof Error ? err.message : 'unknown',
      });
      return;
    }
    if (!acquired) {
      this.structured.log({
        type: 'payment_gateway_health_cron',
        action: 'skipped_not_leader',
        provider: 'mercado_pago',
      });
      return;
    }

    if (cfg.jitterMs > 0) {
      const delay = Math.floor(Math.random() * cfg.jitterMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const limit = cfg.limit;
    const concurrency = cfg.concurrency;
    const tenantIds = await this.tenantPaymentConfigRepo.findActiveMercadoPagoTenants(limit);

    let processed = 0;
    let skippedCached = 0;
    let errors = 0;

    this.structured.log({
      type: 'payment_gateway_health_cron',
      action: 'start',
      provider: 'mercado_pago',
      selected: tenantIds.length,
      config: {
        limit,
        concurrency,
        jitterMs: cfg.jitterMs,
        lockTtlMs: cfg.lockTtlMs,
      },
    });

    for (let idx = 0; idx < tenantIds.length; idx += concurrency) {
      const batch = tenantIds.slice(idx, idx + concurrency);
      await Promise.all(
        batch.map(async (tenantId) => {
          try {
            const cached = await this.healthService.getMercadoPagoHealth(tenantId);
            if (cached !== null) {
              skippedCached++;
              return;
            }

            await this.validateUseCase.execute(tenantId);
            processed++;
          } catch (err) {
            errors++;
            this.structured.warn({
              type: 'payment_gateway_health_cron',
              action: 'tenant_error',
              provider: 'mercado_pago',
              tenantId,
              errorMessage: err instanceof Error ? err.message : 'unknown',
            });
          }
        }),
      );
    }

    this.structured.log({
      type: 'payment_gateway_health_cron',
      action: 'finish',
      provider: 'mercado_pago',
      processed,
      skipped_cached: skippedCached,
      errors,
    });
  }
}
