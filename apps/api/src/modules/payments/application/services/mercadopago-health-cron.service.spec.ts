import { PaymentGatewayHealthService } from '../../../../common/cache/payment-gateway-health.service';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import type { AppConfig } from '../../../../config/app.config';
import { TenantPaymentConfigRepositoryPort } from '../../domain/ports/tenant-payment-config.repository.port';
import { ValidateMercadoPagoCredentialsUseCase } from '../use-cases/validate-mercadopago-credentials.use-case';
import { MercadoPagoHealthCronService } from './mercadopago-health-cron.service';

describe('MercadoPagoHealthCronService', () => {
  const redisSet = jest.fn();
  const redisQuit = jest.fn();

  const buildConfig = (
    enabled = true,
    overrides?: Partial<{ limit: number; concurrency: number; jitterMs: number; lockTtlMs: number }>,
  ) =>
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
        enabled,
        limit: overrides?.limit ?? 100,
        concurrency: overrides?.concurrency ?? 2,
        jitterMs: overrides?.jitterMs ?? 0,
        lockTtlMs: overrides?.lockTtlMs ?? 240000,
        cacheTtlSeconds: 300,
      },
    }) as AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    redisSet.mockResolvedValue('OK');
    redisQuit.mockResolvedValue('OK');
  });

  it('não executa quando cron está desabilitado por env', async () => {
    const config = buildConfig(false);
    const tenantRepo: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
      getMercadoPagoAccessToken: jest.fn(),
      hasMercadoPagoConfig: jest.fn(),
      findActiveMercadoPagoTenants: jest.fn(),
      getMercadoPagoWebhookSecret: jest.fn(),
    };
    const healthService: jest.Mocked<PaymentGatewayHealthService> = {
      getMercadoPagoHealth: jest.fn(),
      setMercadoPagoHealth: jest.fn(),
    } as unknown as jest.Mocked<PaymentGatewayHealthService>;
    const validateUseCase: jest.Mocked<ValidateMercadoPagoCredentialsUseCase> = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateMercadoPagoCredentialsUseCase>;
    const structured: jest.Mocked<StructuredLoggerService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<StructuredLoggerService>;

    const service = new MercadoPagoHealthCronService(
      config,
      tenantRepo,
      healthService,
      validateUseCase,
      structured,
      { set: redisSet, quit: redisQuit },
    );
    await service.warmMercadoPagoHealthCache();

    expect(redisSet).not.toHaveBeenCalled();
    expect(tenantRepo.findActiveMercadoPagoTenants).not.toHaveBeenCalled();
  });

  it('não executa quando instância não é líder', async () => {
    redisSet.mockResolvedValue(null);
    const config = buildConfig(true);
    const tenantRepo: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
      getMercadoPagoAccessToken: jest.fn(),
      hasMercadoPagoConfig: jest.fn(),
      findActiveMercadoPagoTenants: jest.fn(),
      getMercadoPagoWebhookSecret: jest.fn(),
    };
    const healthService: jest.Mocked<PaymentGatewayHealthService> = {
      getMercadoPagoHealth: jest.fn(),
      setMercadoPagoHealth: jest.fn(),
    } as unknown as jest.Mocked<PaymentGatewayHealthService>;
    const validateUseCase: jest.Mocked<ValidateMercadoPagoCredentialsUseCase> = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateMercadoPagoCredentialsUseCase>;
    const structured: jest.Mocked<StructuredLoggerService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<StructuredLoggerService>;

    const service = new MercadoPagoHealthCronService(
      config,
      tenantRepo,
      healthService,
      validateUseCase,
      structured,
      { set: redisSet, quit: redisQuit },
    );
    await service.warmMercadoPagoHealthCache();

    expect(redisSet).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'PX', 240000, 'NX');
    expect(structured.log).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'payment_gateway_health_cron',
        action: 'skipped_not_leader',
      }),
    );
    expect(tenantRepo.findActiveMercadoPagoTenants).not.toHaveBeenCalled();
  });

  it('pula tenants com cache quente e processa apenas cache miss', async () => {
    const config = buildConfig(true);

    const tenantRepo: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
      getMercadoPagoAccessToken: jest.fn(),
      hasMercadoPagoConfig: jest.fn(),
      findActiveMercadoPagoTenants: jest.fn().mockResolvedValue(['t1', 't2', 't3']),
      getMercadoPagoWebhookSecret: jest.fn(),
    };
    const healthService: jest.Mocked<PaymentGatewayHealthService> = {
      getMercadoPagoHealth: jest
        .fn()
        .mockImplementation(async (tenantId: string) => (tenantId === 't1' ? true : null)),
      setMercadoPagoHealth: jest.fn(),
    } as unknown as jest.Mocked<PaymentGatewayHealthService>;
    const validateUseCase: jest.Mocked<ValidateMercadoPagoCredentialsUseCase> = {
      execute: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ValidateMercadoPagoCredentialsUseCase>;
    const structured: jest.Mocked<StructuredLoggerService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<StructuredLoggerService>;

    const service = new MercadoPagoHealthCronService(
      config,
      tenantRepo,
      healthService,
      validateUseCase,
      structured,
      { set: redisSet, quit: redisQuit },
    );
    await service.warmMercadoPagoHealthCache();

    expect(validateUseCase.execute).toHaveBeenCalledTimes(2);
    expect(validateUseCase.execute).toHaveBeenCalledWith('t2');
    expect(validateUseCase.execute).toHaveBeenCalledWith('t3');
    expect(structured.log).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'payment_gateway_health_cron',
        action: 'start',
        config: {
          limit: 100,
          concurrency: 2,
          jitterMs: 0,
          lockTtlMs: 240000,
        },
      }),
    );
  });

  it('usa lock ttl e parâmetros customizados vindos do config', async () => {
    const config = buildConfig(true, { limit: 55, concurrency: 3, lockTtlMs: 120000 });
    const tenantRepo: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
      getMercadoPagoAccessToken: jest.fn(),
      hasMercadoPagoConfig: jest.fn(),
      findActiveMercadoPagoTenants: jest.fn().mockResolvedValue([]),
      getMercadoPagoWebhookSecret: jest.fn(),
    };
    const healthService: jest.Mocked<PaymentGatewayHealthService> = {
      getMercadoPagoHealth: jest.fn(),
      setMercadoPagoHealth: jest.fn(),
    } as unknown as jest.Mocked<PaymentGatewayHealthService>;
    const validateUseCase: jest.Mocked<ValidateMercadoPagoCredentialsUseCase> = {
      execute: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ValidateMercadoPagoCredentialsUseCase>;
    const structured: jest.Mocked<StructuredLoggerService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<StructuredLoggerService>;

    const service = new MercadoPagoHealthCronService(
      config,
      tenantRepo,
      healthService,
      validateUseCase,
      structured,
      { set: redisSet, quit: redisQuit },
    );
    await service.warmMercadoPagoHealthCache();

    expect(redisSet).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'PX', 120000, 'NX');
    expect(tenantRepo.findActiveMercadoPagoTenants).toHaveBeenCalledWith(55);
  });
});
