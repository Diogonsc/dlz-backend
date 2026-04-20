import type { Cache } from 'cache-manager';
import type { AppConfig } from '../../config/app.config';
import { PaymentGatewayHealthService } from './payment-gateway-health.service';

const buildAppConfig = (cacheTtlSeconds?: number): AppConfig =>
  ({
    nodeEnv: 'production',
    port: 3333,
    apiUrl: 'http://localhost:3333',
    frontendUrl: 'http://localhost:5173',
    database: { url: 'postgresql://localhost:5432/db' },
    redis: { url: 'redis://localhost:6379' },
    throttler: {
      shortTtl: 1000,
      shortLimit: 10,
      longTtl: 60000,
      longLimit: 100,
      webhookTtl: 60000,
      webhookLimit: 240,
      replayTtl: 60000,
      replayLimit: 5,
      authTtl: 60000,
      authLimit: 8,
    },
    cache: {
      ttl: 60000,
    },
    jwt: {
      secret: '12345678901234567890123456789012',
      expiresIn: '15m',
      refreshSecret: '12345678901234567890123456789012',
      refreshExpiresIn: '7d',
    },
    stripe: { secretKey: undefined, webhookSecret: undefined },
    cakto: { webhookSecret: '' },
    whatsapp: { token: undefined, phoneNumberId: undefined, verifyToken: undefined },
    eventBus: {
      mode: 'redis',
      streamKey: 'dlz:event-bus:domain',
      groupName: 'dlz-domain-bus',
      consumerEnabled: true,
      dlqStreamKey: 'dlz:event-bus:dlq',
      maxDeliveryAttempts: 8,
      pendingClaimIdleMs: 60000,
      pendingClaimBatch: 64,
      consumerTransport: 'inline',
      streamReaderEnabled: true,
      dispatchWorkerEnabled: true,
      alertBacklogThreshold: 5000,
      alertStuckPendingMs: 120000,
      adminToken: '',
    },
    paymentGatewayHealth: {
      enabled: true,
      limit: 100,
      concurrency: 5,
      jitterMs: 2000,
      lockTtlMs: 240000,
      cacheTtlSeconds: cacheTtlSeconds ?? 300,
    },
  }) as AppConfig;

describe('PaymentGatewayHealthService', () => {
  it('aplica TTL vindo do config ao salvar health', async () => {
    const cache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as Cache;
    const config = buildAppConfig(120);

    const service = new PaymentGatewayHealthService(cache, config);
    await service.setMercadoPagoHealth('tenant-1', true);

    expect(cache.set).toHaveBeenCalledWith('tenant:tenant-1:mp:health', true, 120000);
  });

  it('usa default seguro quando config de cache ttl está ausente', async () => {
    const cache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as Cache;
    const config = buildAppConfig(undefined);

    const service = new PaymentGatewayHealthService(cache, config);
    await service.setMercadoPagoHealth('tenant-2', false);

    expect(cache.set).toHaveBeenCalledWith('tenant:tenant-2:mp:health', false, 300000);
  });
});
