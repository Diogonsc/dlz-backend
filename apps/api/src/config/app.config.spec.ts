import { appConfig, validateEnv } from './app.config';

describe('app.config payment gateway health enabled', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'development',
      PORT: '3333',
      API_URL: 'http://localhost:3333',
      FRONTEND_URL: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: '12345678901234567890123456789012',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('usa enabled=true quando env define valor truthy', () => {
    process.env.PAYMENT_GATEWAY_HEALTH_CRON_ENABLED = 'yes';
    const cfg = appConfig(validateEnv(process.env));
    expect(cfg.paymentGatewayHealth.enabled).toBe(true);
  });

  it('usa enabled=false quando env define valor falsy', () => {
    process.env.PAYMENT_GATEWAY_HEALTH_CRON_ENABLED = 'off';
    const cfg = appConfig(validateEnv(process.env));
    expect(cfg.paymentGatewayHealth.enabled).toBe(false);
  });

  it('usa fallback por ambiente quando env está ausente', () => {
    delete process.env.PAYMENT_GATEWAY_HEALTH_CRON_ENABLED;
    process.env.NODE_ENV = 'production';
    expect(appConfig(validateEnv(process.env)).paymentGatewayHealth.enabled).toBe(true);

    process.env.NODE_ENV = 'development';
    expect(appConfig(validateEnv(process.env)).paymentGatewayHealth.enabled).toBe(false);
  });

  it('falha no startup com valor boolean inválido', () => {
    expect(() =>
      validateEnv({
        ...process.env,
        PAYMENT_GATEWAY_HEALTH_CRON_ENABLED: 'enable',
      }),
    ).toThrow(/invalid boolean value/);
  });
});
