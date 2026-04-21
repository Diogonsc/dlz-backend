import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { APP_CONFIG } from '../../../../config/app-config.module';
import type { AppConfig } from '../../../../config/app.config';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { runInObservabilityContext } from '../../../../common/observability/request-context.storage';
import { SendWinbackMessageUseCase } from '../../application/use-cases/send-winback-message.use-case';
import { TerminalExternalError, TransientExternalError } from '../../domain/errors/notification.errors';

const WINBACK_PROCESSOR_CONCURRENCY = Number.parseInt(process.env.WINBACK_CONCURRENCY ?? '5', 10);

/** Token para Redis opcional em testes; em produção o processor instancia Redis a partir de APP_CONFIG. */
export const WINBACK_NOTIFICATIONS_REDIS = 'WINBACK_NOTIFICATIONS_REDIS';

@Injectable()
@Processor('winback-notifications', {
  concurrency: Number.isFinite(WINBACK_PROCESSOR_CONCURRENCY) && WINBACK_PROCESSOR_CONCURRENCY > 0
    ? WINBACK_PROCESSOR_CONCURRENCY
    : 5,
})
export class WinbackNotificationsProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly redis: Pick<Redis, 'incr' | 'expire' | 'quit'>;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly sendWinback: SendWinbackMessageUseCase,
    private readonly structured: StructuredLoggerService,
    @Optional() @Inject(WINBACK_NOTIFICATIONS_REDIS) redisClient?: Pick<Redis, 'incr' | 'expire' | 'quit'>,
  ) {
    super();
    this.redis = redisClient ?? new Redis(this.config.redis.url, { maxRetriesPerRequest: null });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async process(job: Job): Promise<void> {
    const rawTenantId = job.data.tenantId;
    const correlationId = job.data.correlationId ? String(job.data.correlationId) : `winback-job-${job.id}`;
    if (typeof rawTenantId !== 'string' || rawTenantId.trim().length === 0) {
      this.structured.warn({
        type: 'winback',
        action: 'failed',
        tenantId: null,
        userId: null,
        correlationId,
        reason: 'invalid_tenant',
      });
      throw new TerminalExternalError('winback', 'invalid_tenant_id');
    }
    const tenantId = rawTenantId.trim();
    const userId = job.data.userId ? String(job.data.userId) : null;
    const rateKey = `winback:rate:${tenantId}`;
    const currentCount = await this.redis.incr(rateKey);
    if (currentCount === 1) {
      await this.redis.expire(rateKey, 60);
    }

    const limit = this.config.winback.rateLimitPerTenantPerMinute;
    if (currentCount > limit) {
      const baseDelayMs = this.config.winback.rateLimitDelayMs;
      const jitterMs = Math.floor(Math.random() * Math.min(5000, baseDelayMs));
      if (jitterMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, jitterMs));
      }
      this.structured.warn({
        type: 'winback',
        action: 'retry',
        tenantId,
        userId,
        correlationId,
        reason: 'rate_limit',
        delayMs: baseDelayMs + jitterMs,
      });
      throw new TransientExternalError('winback', 'rate_limited');
    }

    this.structured.log({
      type: 'winback',
      action: 'processing',
      tenantId,
      userId,
      correlationId,
    });
    await runInObservabilityContext(
      {
        correlationId,
        tenantId,
        userId,
      },
      async () => {
        await this.sendWinback.execute({
          tenantId,
          phone: String(job.data.phone),
          segment: String(job.data.segment ?? 'manual'),
          campaign: String(job.data.campaign ?? 'winback_manual'),
          triggerType: job.data.triggerType ? String(job.data.triggerType) : undefined,
          userId,
          customerName: job.data.customerName ? String(job.data.customerName) : null,
          storeName: job.data.storeName ? String(job.data.storeName) : null,
        });
      },
    );
  }
}
