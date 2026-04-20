import { PaymentGatewayHealthService } from '../../../../common/cache/payment-gateway-health.service';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import { ValidateMercadoPagoCredentialsUseCase } from './validate-mercadopago-credentials.use-case';

describe('ValidateMercadoPagoCredentialsUseCase', () => {
  it('retorna cache hit sem chamar gateway', async () => {
    const paymentGateway: jest.Mocked<PaymentGatewayPort> = {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
      validateCredentials: jest.fn().mockResolvedValue({ valid: true }),
    };
    const healthCache: jest.Mocked<PaymentGatewayHealthService> = {
      getMercadoPagoHealth: jest.fn().mockResolvedValue(true),
      setMercadoPagoHealth: jest.fn(),
    } as unknown as jest.Mocked<PaymentGatewayHealthService>;
    const structured: jest.Mocked<StructuredLoggerService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<StructuredLoggerService>;

    const useCase = new ValidateMercadoPagoCredentialsUseCase(paymentGateway, healthCache, structured);
    const result = await useCase.execute('tenant-1');

    expect(result).toBe(true);
    expect(healthCache.getMercadoPagoHealth).toHaveBeenCalledWith('tenant-1');
    expect(paymentGateway.validateCredentials).not.toHaveBeenCalled();
  });

  it('valida no gateway quando cache miss e persiste no cache', async () => {
    const paymentGateway: jest.Mocked<PaymentGatewayPort> = {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
      validateCredentials: jest.fn().mockResolvedValue({ valid: false }),
    };
    const healthCache: jest.Mocked<PaymentGatewayHealthService> = {
      getMercadoPagoHealth: jest.fn().mockResolvedValue(null),
      setMercadoPagoHealth: jest.fn(),
    } as unknown as jest.Mocked<PaymentGatewayHealthService>;
    const structured: jest.Mocked<StructuredLoggerService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<StructuredLoggerService>;

    const useCase = new ValidateMercadoPagoCredentialsUseCase(paymentGateway, healthCache, structured);
    const result = await useCase.execute('tenant-2');

    expect(result).toBe(false);
    expect(paymentGateway.validateCredentials).toHaveBeenCalledWith({ tenantId: 'tenant-2' });
    expect(healthCache.setMercadoPagoHealth).toHaveBeenCalledWith('tenant-2', false);
  });
});
