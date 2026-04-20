import { ConfigService } from '@nestjs/config';
import { CreateMercadoPagoPreferenceUseCase } from './create-mercadopago-preference.use-case';
import { PaymentGatewayNotConfiguredException } from '../../../../common/errors/payment-gateway-not-configured.exception';
import { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import { TenantPaymentConfigRepositoryPort } from '../../domain/ports/tenant-payment-config.repository.port';
import { ValidateMercadoPagoCredentialsUseCase } from './validate-mercadopago-credentials.use-case';

describe('CreateMercadoPagoPreferenceUseCase', () => {
  it('lança PaymentGatewayNotConfiguredException se tenant não tem config MP', async () => {
    const tenantRepo: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
      getMercadoPagoAccessToken: jest.fn(),
      hasMercadoPagoConfig: jest.fn().mockResolvedValue(false),
      findActiveMercadoPagoTenants: jest.fn(),
      getMercadoPagoWebhookSecret: jest.fn(),
    };

    const paymentGateway: jest.Mocked<PaymentGatewayPort> = {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
    };

    const config = {
      get: jest.fn().mockImplementation((k: string) => (k === 'API_URL' ? 'https://api.dlz.test' : '')),
    } as unknown as ConfigService;
    const validateCredentials: jest.Mocked<ValidateMercadoPagoCredentialsUseCase> = {
      execute: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ValidateMercadoPagoCredentialsUseCase>;

    const useCase = new CreateMercadoPagoPreferenceUseCase(tenantRepo, paymentGateway, config, validateCredentials);

    await expect(
      useCase.execute({
        tenantId: 'tenant-x',
        orderId: 'order-1',
        returnUrl: 'https://front.test/retorno',
        items: [{ title: 'Pizza', quantity: 1, unit_price: 10 }],
      }),
    ).rejects.toBeInstanceOf(PaymentGatewayNotConfiguredException);

    expect(tenantRepo.hasMercadoPagoConfig).toHaveBeenCalledWith('tenant-x');
    expect(paymentGateway.createPayment).not.toHaveBeenCalled();
    expect(validateCredentials.execute).not.toHaveBeenCalled();
  });

  it('monta webhook com tenant/order e delega para gateway via port quando config existe', async () => {
    const tenantRepo: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
      getMercadoPagoAccessToken: jest.fn(),
      hasMercadoPagoConfig: jest.fn().mockResolvedValue(true),
      findActiveMercadoPagoTenants: jest.fn(),
      getMercadoPagoWebhookSecret: jest.fn(),
    };

    const paymentGateway: jest.Mocked<PaymentGatewayPort> = {
      createPayment: jest.fn().mockResolvedValue({
        gateway: 'mercado_pago',
        gatewayPaymentId: 'pref-1',
        checkoutUrl: 'https://mp.com/checkout',
        sandboxCheckoutUrl: null,
      }),
      getPayment: jest.fn(),
    };

    const config = {
      get: jest.fn().mockImplementation((k: string) => (k === 'API_URL' ? 'https://api.dlz.test' : '')),
    } as unknown as ConfigService;
    const validateCredentials: jest.Mocked<ValidateMercadoPagoCredentialsUseCase> = {
      execute: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ValidateMercadoPagoCredentialsUseCase>;

    const useCase = new CreateMercadoPagoPreferenceUseCase(tenantRepo, paymentGateway, config, validateCredentials);
    const out = await useCase.execute({
      tenantId: 'tenant-1',
      orderId: 'order-1',
      returnUrl: 'https://front.test/retorno',
      items: [{ title: 'Pizza', quantity: 2, unit_price: 35 }],
    });

    expect(paymentGateway.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        externalId: 'order-1',
        webhookUrl: 'https://api.dlz.test/api/v1/payments/mercadopago/webhook?tenantId=tenant-1&orderId=order-1',
      }),
    );
    expect(tenantRepo.hasMercadoPagoConfig).toHaveBeenCalledWith('tenant-1');
    expect(validateCredentials.execute).toHaveBeenCalledWith('tenant-1');
    expect(out.preferenceId).toBe('pref-1');
  });
});
