import { WinbackNotificationsProcessor } from './winback-notifications.processor';
import type { AppConfig } from '../../../../config/app.config';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';
import { TerminalExternalError, TransientExternalError } from '../../domain/errors/notification.errors';

describe('WinbackNotificationsProcessor', () => {
  const config = {
    redis: { url: 'redis://localhost:6379' },
    winback: {
      concurrency: 5,
      rateLimitPerTenantPerMinute: 1,
      rateLimitDelayMs: 30000,
    },
  } as AppConfig;
  const sendWinback = {
    execute: jest.fn(),
  };
  const structured = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('propaga correlationId no contexto do processor', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    sendWinback.execute.mockImplementation(async () => {
      expect(getObservabilityContext()?.correlationId).toBe('corr-123');
      expect(getObservabilityContext()?.tenantId).toBe('tenant-a');
    });
    const processor = new WinbackNotificationsProcessor(
      config,
      sendWinback as never,
      structured as never,
      redis,
    );
    const job = {
      id: '1',
      name: 'send',
      data: {
        correlationId: 'corr-123',
        tenantId: 'tenant-a',
        phone: '5511999990000',
      },
      opts: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
    };

    await processor.process(job as never);
    expect(sendWinback.execute).toHaveBeenCalledTimes(1);
  });

  it('quando excede rate limit, lança erro transitório sem criar novo job', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValue(2),
      expire: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new WinbackNotificationsProcessor(
      config,
      sendWinback as never,
      structured as never,
      redis,
    );
    const job = {
      id: '2',
      name: 'send',
      data: {
        correlationId: 'corr-456',
        tenantId: 'tenant-a',
        phone: '5511999990000',
      },
      opts: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
    };

    await expect(processor.process(job as never)).rejects.toBeInstanceOf(TransientExternalError);
    expect(sendWinback.execute).not.toHaveBeenCalled();
  });

  it('falha com erro terminal quando tenantId inválido', async () => {
    const redis = {
      incr: jest.fn(),
      expire: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new WinbackNotificationsProcessor(
      config,
      sendWinback as never,
      structured as never,
      redis,
    );
    const job = {
      id: '3',
      name: 'send',
      data: {
        correlationId: 'corr-invalid',
        phone: '5511999990000',
      },
      opts: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
    };

    await expect(processor.process(job as never)).rejects.toBeInstanceOf(TerminalExternalError);
    expect(sendWinback.execute).not.toHaveBeenCalled();
    expect(redis.incr).not.toHaveBeenCalled();
  });
});
