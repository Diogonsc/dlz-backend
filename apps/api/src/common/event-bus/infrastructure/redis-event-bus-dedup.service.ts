import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';

const DEDUP_PREFIX = 'eventbus:dedup:';
const DEDUP_TTL_SEC = 60 * 60 * 24 * 7;

/**
 * Deduplicação cross-réplica: entrega at-least-once do Stream sem reemitir duas vezes o mesmo `eventId`.
 */
@Injectable()
export class EventBusDedupService {
  constructor(@Inject('EVENT_BUS_REDIS') private readonly redis: Redis) {}

  /** `true` se este nó deve processar (primeira vez); `false` se já foi consumido antes. */
  async tryClaimOnce(eventId: string): Promise<boolean> {
    const key = `${DEDUP_PREFIX}${eventId}`;
    const res = await this.redis.set(key, '1', 'EX', DEDUP_TTL_SEC, 'NX');
    return res === 'OK';
  }

  /** Libera o slot após falha transitória para o Stream poder reentregar com retry. */
  async releaseClaim(eventId: string): Promise<void> {
    await this.redis.del(`${DEDUP_PREFIX}${eventId}`);
  }
}
