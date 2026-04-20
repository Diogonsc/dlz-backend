import { z } from 'zod';

const booleanLike = z
  .string()
  .transform((v) => v.toLowerCase())
  .refine(
    (v) => ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(v),
    'invalid boolean value',
  )
  .transform((v) => ['true', '1', 'yes', 'on'].includes(v));

const optionalPositiveInt = (label: string) =>
  z
    .string()
    .optional()
    .refine((v) => v == null || (Number.isFinite(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v))), {
      message: `${label} must be > 0`,
    });

const optionalNonNegativeInt = (label: string) =>
  z
    .string()
    .optional()
    .refine((v) => v == null || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number.isInteger(Number(v))), {
      message: `${label} must be >= 0`,
    });

const optionalMinInt = (label: string, min: number, message: string) =>
  z
    .string()
    .optional()
    .refine((v) => v == null || (Number.isFinite(Number(v)) && Number(v) >= min && Number.isInteger(Number(v))), {
      message: `${label} ${message}`,
    });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  API_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CAKTO_WEBHOOK_SECRET: z.string().optional(),

  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  WINBACK_CONCURRENCY: optionalPositiveInt('WINBACK_CONCURRENCY'),
  WINBACK_RATE_LIMIT_PER_TENANT_PER_MINUTE: optionalPositiveInt('WINBACK_RATE_LIMIT_PER_TENANT_PER_MINUTE'),
  WINBACK_RATE_LIMIT_DELAY_MS: optionalPositiveInt('WINBACK_RATE_LIMIT_DELAY_MS'),

  PAYMENT_GATEWAY_HEALTH_CRON_ENABLED: booleanLike.optional(),
  PAYMENT_GATEWAY_HEALTH_CRON_LIMIT: optionalPositiveInt('PAYMENT_GATEWAY_HEALTH_CRON_LIMIT'),
  PAYMENT_GATEWAY_HEALTH_CRON_CONCURRENCY: optionalPositiveInt('PAYMENT_GATEWAY_HEALTH_CRON_CONCURRENCY'),
  PAYMENT_GATEWAY_HEALTH_CRON_JITTER_MS: optionalNonNegativeInt('PAYMENT_GATEWAY_HEALTH_CRON_JITTER_MS'),
  PAYMENT_GATEWAY_HEALTH_CRON_LOCK_TTL_MS: optionalMinInt(
    'PAYMENT_GATEWAY_HEALTH_CRON_LOCK_TTL_MS',
    1000,
    'must be >= 1000ms',
  ),
  PAYMENT_GATEWAY_HEALTH_CACHE_TTL_SECONDS: optionalMinInt(
    'PAYMENT_GATEWAY_HEALTH_CACHE_TTL_SECONDS',
    10,
    'must be >= 10s',
  ),
});

export type AppEnv = z.infer<typeof envSchema>;
