import { Injectable, Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { getEventBusSettings } from '../event-bus.settings';
import { EventBusStreamDeliveryService } from './event-bus-stream-delivery.service';
import { EVENT_BUS_DISPATCH_JOB, EVENT_BUS_DISPATCH_QUEUE } from '../event-bus.constants';
import type { EventBusDispatchJobData } from '../event-bus.constants';

@Injectable()
export class EventBusStreamConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusStreamConsumer.name);
  private stopped = false;
  private loopPromise: Promise<void> | null = null;
  private readonly consumerName: string;

  constructor(
    @Inject('EVENT_BUS_REDIS') private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly structured: StructuredLoggerService,
    private readonly delivery: EventBusStreamDeliveryService,
    @InjectQueue(EVENT_BUS_DISPATCH_QUEUE) private readonly dispatchQueue: Queue,
  ) {
    this.consumerName = `api-${randomUUID().slice(0, 8)}`;
  }

  private streamKeys(): string[] {
    const keys = getEventBusSettings(this.config).streamKeys;
    return Array.from(new Set([keys.orders, keys.billing, keys.realtime, keys.fallback]));
  }

  private groupName(): string {
    return getEventBusSettings(this.config).groupName;
  }

  private mode(): 'redis' | 'emitter' | 'dual' {
    return getEventBusSettings(this.config).mode;
  }

  private consumerEnabled(): boolean {
    if (this.mode() !== 'redis') {
      return false;
    }
    return getEventBusSettings(this.config).consumerEnabled !== false;
  }

  private shouldRunStreamReader(): boolean {
    const s = getEventBusSettings(this.config);
    if (!this.consumerEnabled() || !s.streamReaderEnabled) {
      return false;
    }
    return s.consumerTransport === 'inline' || s.consumerTransport === 'bull';
  }

  async onModuleInit(): Promise<void> {
    if (!this.shouldRunStreamReader()) {
      this.logger.log('Event bus stream reader desativado (modo emitter/dual, flags ou transporte).');
      return;
    }

    const streams = this.streamKeys();
    const group = this.groupName();

    for (const stream of streams) {
      try {
        await this.redis.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('BUSYGROUP')) {
          this.logger.error(`XGROUP CREATE falhou: ${msg}`);
          throw err;
        }
      }
    }

    this.loopPromise = this.readLoop().catch((e) => {
      this.logger.error(e);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.loopPromise) {
      await this.loopPromise.catch(() => {});
    }
  }

  private async readLoop(): Promise<void> {
    const streams = this.streamKeys();
    const group = this.groupName();
    const blockMs = 8000;
    const s = getEventBusSettings(this.config);

    while (!this.stopped) {
      try {
        const streamIds = streams.map(() => '>');
        const res = (await this.redis.xreadgroup(
          'GROUP',
          group,
          this.consumerName,
          'COUNT',
          32,
          'BLOCK',
          blockMs,
          'STREAMS',
          ...streams,
          ...streamIds,
        )) as [string, [string, string[]][]][] | null;

        if (!res || res.length === 0) {
          continue;
        }

        for (const [stream, messages] of res) {
          for (const [messageId, fieldsArr] of messages) {
            if (s.consumerTransport === 'bull') {
              if (!this.dispatchQueue) {
                this.logger.error('EVENT_BUS_CONSUMER_TRANSPORT=bull mas fila não injetada.');
                await this.delivery.processOne(stream, group, messageId, fieldsArr);
                continue;
              }
              const payload: EventBusDispatchJobData = {
                stream,
                group,
                messageId,
                fields: fieldsArr,
              };
              await this.dispatchQueue.add(EVENT_BUS_DISPATCH_JOB, payload, {
                removeOnComplete: 200,
                removeOnFail: 400,
                attempts: 4,
                backoff: { type: 'exponential', delay: 1500 },
              });
            } else {
              await this.delivery.processOne(stream, group, messageId, fieldsArr);
            }
          }
        }
      } catch (err) {
        if (this.stopped) {
          break;
        }
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`readLoop pausa após erro: ${msg}`);
        this.structured.log({
          type: 'event_bus',
          action: 'retry',
          eventId: '',
          tenantId: null,
          phase: 'read_loop',
          error: msg,
        });
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}
