import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';

@Injectable()
export class EventBusRedisShutdownHook implements OnModuleDestroy {
  constructor(@Inject('EVENT_BUS_REDIS') private readonly redis: Redis) {}

  onModuleDestroy(): void {
    void this.redis.quit();
  }
}
