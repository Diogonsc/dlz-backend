import { envSchema, type AppEnv } from './env.schema';

const parseNumber = (value: string | undefined, fallback: number, min = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `\n❌ Variáveis de ambiente inválidas:\n${formatted}\n\n` +
        `Crie um arquivo \`.env\` na raiz do monorepo (copie de \`.env.example\`) ou em \`apps/api/\`. ` +
        `JWT_SECRET e JWT_REFRESH_SECRET precisam ter pelo menos 32 caracteres.\n`,
    );
  }

  return result.data;
}

export const appConfig = (env: AppEnv) => {
  const nodeEnv = env.NODE_ENV ?? 'development';
  return {
    nodeEnv,
    port: env.PORT,
    apiUrl: env.API_URL,
    frontendUrl: env.FRONTEND_URL,
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    throttler: {
      shortTtl: 60000,
      shortLimit: nodeEnv === 'production' ? 1000 : 100,
      longTtl: 60000,
      longLimit: nodeEnv === 'production' ? 5000 : 1000,
      webhookTtl: 60000,
      webhookLimit: nodeEnv === 'production' ? 240 : 1200,
      replayTtl: 60000,
      replayLimit: nodeEnv === 'production' ? 5 : 20,
      authTtl: 60000,
      authLimit: nodeEnv === 'production' ? 8 : 40,
    },
    cache: {
      ttl: 60 * 1000,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN ?? '15m',
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
    cakto: {
      webhookSecret: env.CAKTO_WEBHOOK_SECRET ?? '',
    },
    whatsapp: {
      token: env.WHATSAPP_TOKEN,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      verifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    },
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      whatsappNumber: env.TWILIO_WHATSAPP_NUMBER,
      mock: false,
    },
    winback: {
      concurrency: parseNumber(env.WINBACK_CONCURRENCY, 5, 1),
      rateLimitPerTenantPerMinute: parseNumber(env.WINBACK_RATE_LIMIT_PER_TENANT_PER_MINUTE, 30, 1),
      rateLimitDelayMs: parseNumber(env.WINBACK_RATE_LIMIT_DELAY_MS, 30000, 1000),
    },
    eventBus: {
      /** `redis`: outbox → Stream, consumers → EventEmitter. `emitter`: só EventEmitter (rollback). `dual`: Stream + EventEmitter (consumer in-process desligado). */
      mode: process.env.EVENT_BUS_MODE === 'emitter' ? 'emitter' : process.env.EVENT_BUS_MODE === 'dual' ? 'dual' : 'redis',
      streamKey: process.env.EVENT_BUS_STREAM ?? 'dlz:event-bus:domain',
      groupName: process.env.EVENT_BUS_GROUP ?? 'dlz-domain-bus',
      consumerEnabled: process.env.EVENT_BUS_CONSUMER !== 'false',
      dlqStreamKey: process.env.EVENT_BUS_DLQ_STREAM ?? 'dlz:event-bus:dlq',
      maxDeliveryAttempts: Math.max(
        1,
        Number.parseInt(process.env.EVENT_BUS_MAX_DELIVERY_ATTEMPTS ?? '8', 10) || 8,
      ),
      pendingClaimIdleMs: Math.max(
        1000,
        Number.parseInt(process.env.EVENT_BUS_PENDING_CLAIM_IDLE_MS ?? '60000', 10) || 60_000,
      ),
      pendingClaimBatch: Math.max(
        1,
        Number.parseInt(process.env.EVENT_BUS_PENDING_CLAIM_BATCH ?? '64', 10) || 64,
      ),
      consumerTransport: process.env.EVENT_BUS_CONSUMER_TRANSPORT === 'bull' ? 'bull' : 'inline',
      streamReaderEnabled: process.env.EVENT_BUS_STREAM_READER !== 'false',
      dispatchWorkerEnabled: process.env.EVENT_BUS_DISPATCH_WORKER !== 'false',
      alertBacklogThreshold: Math.max(
        1,
        Number.parseInt(process.env.EVENT_BUS_ALERT_BACKLOG ?? '5000', 10) || 5000,
      ),
      alertStuckPendingMs: Math.max(
        5000,
        Number.parseInt(process.env.EVENT_BUS_ALERT_STUCK_MS ?? '120000', 10) || 120_000,
      ),
      adminToken: process.env.EVENT_BUS_ADMIN_TOKEN ?? '',
    },
    paymentGatewayHealth: {
      enabled: env.PAYMENT_GATEWAY_HEALTH_CRON_ENABLED ?? nodeEnv === 'production',
      limit: parseNumber(env.PAYMENT_GATEWAY_HEALTH_CRON_LIMIT, 100, 1),
      concurrency: parseNumber(env.PAYMENT_GATEWAY_HEALTH_CRON_CONCURRENCY, 5, 1),
      jitterMs: parseNumber(env.PAYMENT_GATEWAY_HEALTH_CRON_JITTER_MS, 2000, 0),
      lockTtlMs: parseNumber(env.PAYMENT_GATEWAY_HEALTH_CRON_LOCK_TTL_MS, 240000, 1000),
      cacheTtlSeconds: parseNumber(env.PAYMENT_GATEWAY_HEALTH_CACHE_TTL_SECONDS, 300, 1),
    },
    storage: {
      endpoint: (env.STORAGE_ENDPOINT ?? '').trim(),
      bucket: (env.STORAGE_BUCKET ?? 'dlz-assets').trim(),
      accessKeyId: (env.STORAGE_ACCESS_KEY ?? '').trim(),
      secretAccessKey: (env.STORAGE_SECRET_KEY ?? '').trim(),
      publicUrl: (env.STORAGE_PUBLIC_URL ?? '').replace(/\/$/, ''),
      region: (env.STORAGE_REGION ?? 'auto').trim() || 'auto',
      backend: (env.STORAGE_BACKEND ?? '').trim().toLowerCase(),
      localDir: (env.LOCAL_STORAGE_DIR ?? '').trim(),
    },
  };
};

export type AppConfig = ReturnType<typeof appConfig>;

export const appConfigFactory = () => appConfig(validateEnv(process.env));

// Appended: gap-fix env additions
// vercel, twilio, snapshots — add to validateEnv and appConfig manually

export const extendedConfig = () => ({
  vercel: {
    token: process.env.VERCEL_TOKEN,
    projectId: process.env.VERCEL_PROJECT_ID,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    mock: process.env.TWILIO_MOCK === 'true',
  },
  snapshots: {
    secret: process.env.MONTHLY_SNAPSHOTS_SECRET,
  },
});
