import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { RedisStreamsEventBus } from './redis-streams.event-bus';

describe('RedisStreamsEventBus partition routing', () => {
  const makeBus = () => {
    const redis = {
      xadd: jest.fn().mockResolvedValue('1-0'),
    } as unknown as Redis;
    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'eventBus') {
          return {
            streamKey: 'dlz:event-bus:domain',
            streamKeys: {
              orders: 'dlz:event-bus:orders',
              billing: 'dlz:event-bus:billing',
              realtime: 'dlz:event-bus:realtime',
              fallback: 'dlz:event-bus:domain',
            },
          };
        }
        return undefined;
      }),
    } as unknown as ConfigService;
    const structured = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as StructuredLoggerService;
    return { bus: new RedisStreamsEventBus(redis, config, structured), redis };
  };

  it('roteia order.* para stream de orders', async () => {
    const { bus, redis } = makeBus();
    await bus.publish({
      eventId: 'e1',
      type: 'order.created',
      tenantId: 'tenant-1',
      payload: {},
    });
    expect((redis.xadd as jest.Mock).mock.calls[0][0]).toBe('dlz:event-bus:orders');
  });

  it('roteia payment.* para stream de billing', async () => {
    const { bus, redis } = makeBus();
    await bus.publish({
      eventId: 'e2',
      type: 'payment.approved',
      tenantId: 'tenant-1',
      payload: {},
    });
    expect((redis.xadd as jest.Mock).mock.calls[0][0]).toBe('dlz:event-bus:billing');
  });

  it('roteia tab.* para stream de realtime', async () => {
    const { bus, redis } = makeBus();
    await bus.publish({
      eventId: 'e3',
      type: 'tab.updated',
      tenantId: 'tenant-1',
      payload: {},
    });
    expect((redis.xadd as jest.Mock).mock.calls[0][0]).toBe('dlz:event-bus:realtime');
  });
});
