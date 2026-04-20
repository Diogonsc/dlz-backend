import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EventBusPort } from './domain/event-bus.port';
import { RedisStreamsEventBus } from './infrastructure/redis-streams.event-bus';
import { EventBusDedupService } from './infrastructure/redis-event-bus-dedup.service';
import { EventBusMetricsService } from './infrastructure/event-bus-metrics.service';
import { EventBusStreamDeliveryService } from './infrastructure/event-bus-stream-delivery.service';
import { EventBusStreamConsumer } from './infrastructure/event-bus-stream.consumer';
import { EventBusPendingRecoveryService } from './infrastructure/event-bus-pending-recovery.service';
import { EventBusAlertsService } from './infrastructure/event-bus-alerts.service';
import { EventBusDlqReplayService } from './infrastructure/event-bus-dlq-replay.service';
import { EventBusDispatchProcessor } from './infrastructure/event-bus-dispatch.processor';
import { EventBusRedisShutdownHook } from './infrastructure/event-bus-redis.shutdown';
import { RealtimeEventBusHandler } from './handlers/realtime-event-bus.handler';
import { BillingEventBusHandler } from './handlers/billing-event-bus.handler';
import { FallbackEventBusHandler } from './handlers/fallback-event-bus.handler';
import { EventBusPrometheusController } from './presentation/event-bus-prometheus.controller';
import { EventBusInternalController } from './presentation/event-bus-internal.controller';
import { EVENT_BUS_DISPATCH_QUEUE } from './event-bus.constants';
import { InternalAuthGuard } from './guards/internal-auth.guard';
import { InternalReplayGuard } from './guards/internal-replay.guard';
import { InternalMetricsGuard } from './guards/internal-metrics.guard';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: EVENT_BUS_DISPATCH_QUEUE,
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: 200,
        removeOnFail: 400,
      },
    }),
  ],
  controllers: [EventBusPrometheusController, EventBusInternalController],
  providers: [
    {
      provide: 'EVENT_BUS_REDIS',
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL'), { maxRetriesPerRequest: null }),
      inject: [ConfigService],
    },
    EventBusDedupService,
    EventBusMetricsService,
    RealtimeEventBusHandler,
    BillingEventBusHandler,
    FallbackEventBusHandler,
    EventBusStreamDeliveryService,
    RedisStreamsEventBus,
    { provide: EventBusPort, useExisting: RedisStreamsEventBus },
    EventBusStreamConsumer,
    EventBusPendingRecoveryService,
    EventBusAlertsService,
    EventBusDlqReplayService,
    EventBusDispatchProcessor,
    EventBusRedisShutdownHook,
    InternalAuthGuard,
    InternalReplayGuard,
    InternalMetricsGuard,
  ],
  exports: [EventBusPort],
})
export class EventBusModule {}
