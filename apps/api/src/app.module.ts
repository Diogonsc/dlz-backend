import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { createKeyv } from '@keyv/redis';
import { appConfigFactory, validateEnv } from './config/app.config';
import type { AppConfig } from './config/app.config';
import { APP_CONFIG, AppConfigModule } from './config/app-config.module';
import { PrismaModule } from '@dlz/prisma';
import { ObservabilityModule } from './common/observability/observability.module';
import { EventBusModule } from './common/event-bus/event-bus.module';
import { OutboxModule } from './common/outbox/outbox.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

// ── Fase 0 ────────────────────────────────────────────────────────────────────
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';

// ── Fase 1 ────────────────────────────────────────────────────────────────────
import { StoresModule } from './modules/stores/stores.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';

// ── Fase 2 ────────────────────────────────────────────────────────────────────
import { OrdersModule } from './modules/orders/orders.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { PlansModule } from './modules/plans/plans.module';

// ── Fase 3 ────────────────────────────────────────────────────────────────────
import { PaymentsModule } from './modules/payments/payments.module';

// ── Fase 4 ────────────────────────────────────────────────────────────────────
import { RealtimeModule } from './modules/realtime/realtime.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { PushModule } from './modules/push/push.module';

// ── Fase 5 ────────────────────────────────────────────────────────────────────
import { CrmModule } from './modules/crm/crm.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IfoodModule } from './modules/ifood/ifood.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { StorageModule } from './modules/storage/storage.module';

// ── Fase 6 ────────────────────────────────────────────────────────────────────
import { MigrationModule } from './modules/migration/migration.module';

// ── Gaps v2 ───────────────────────────────────────────────────────────────────
import { SignupModule } from './modules/signup/signup.module';
import { OtpModule } from './modules/otp/otp.module';
import { DomainsModule } from './modules/domains/domains.module';
import { PwaModule } from './modules/pwa/pwa.module';
import { PaymentGatewaysModule } from './modules/payment-gateways/payment-gateways.module';
import { WhatsappContactsModule } from './modules/whatsapp-contacts/whatsapp-contacts.module';

// ── RPCs críticas ─────────────────────────────────────────────────────────────
import { RpcsModule } from './modules/rpcs/rpcs.module';

// ── PDV & Gaps v3 (análise final) ─────────────────────────────────────────────
import { TablesModule } from './modules/tables/tables.module';
import { TabsModule } from './modules/tabs/tabs.module';
import { CashModule } from './modules/cash/cash.module';
import { WinbackModule } from './modules/winback/winback.module';

/** Caminhos absolutos para `.env` — `pnpm dev` na raiz do monorepo não usa `apps/api` como cwd. */
function resolveEnvFilePaths(): string[] {
  const apiRoot = join(__dirname, '..');
  const repoRoot = join(__dirname, '..', '..', '..');
  const cwd = process.cwd();
  return [
    join(repoRoot, '.env'),
    join(repoRoot, '.env.local'),
    join(apiRoot, '.env'),
    join(apiRoot, '.env.local'),
    join(cwd, '.env'),
    join(cwd, '.env.local'),
  ];
}

@Module({
  imports: [
    ObservabilityModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfigFactory],
      validate: validateEnv,
      envFilePath: resolveEnvFilePaths(),
    }),
    AppConfigModule,
    EventBusModule,
    OutboxModule,
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        throttlers: [
          { name: 'short', ttl: config.throttler.shortTtl, limit: config.throttler.shortLimit },
          { name: 'long', ttl: config.throttler.longTtl, limit: config.throttler.longLimit },
          { name: 'webhook', ttl: config.throttler.webhookTtl, limit: config.throttler.webhookLimit },
          { name: 'replay', ttl: config.throttler.replayTtl, limit: config.throttler.replayLimit },
          { name: 'auth', ttl: config.throttler.authTtl, limit: config.throttler.authLimit },
        ],
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        stores: [createKeyv(config.redis.url)],
        ttl: config.cache.ttl,
      }),
    }),
    BullModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        connection: { url: config.redis.url },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    PrismaModule,

    // Fase 0
    HealthModule, AuthModule, UsersModule, TenantsModule,

    // Fase 1
    StoresModule, CategoriesModule, ProductsModule,

    // Fase 2
    OrdersModule, CouponsModule, PlansModule,

    // Fase 3
    PaymentsModule,

    // Fase 4
    RealtimeModule, WhatsAppModule, PushModule,

    // Fase 5
    CrmModule, AnalyticsModule, IfoodModule, JobsModule, StorageModule,

    // Fase 6
    MigrationModule,

    // Gaps v2
    SignupModule, OtpModule, DomainsModule, PwaModule,
    PaymentGatewaysModule, WhatsappContactsModule,

    // RPCs críticas
    RpcsModule,

    // PDV & Gaps v3
    TablesModule, TabsModule, CashModule, WinbackModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
