import { MercadoPagoGateway } from './mercadopago.gateway';
import { TenantPaymentConfigRepositoryPort } from '../../../domain/ports/tenant-payment-config.repository.port';
import { StructuredLoggerService } from '../../../../../common/observability/structured-logger.service';

const createMock = jest.fn();
const getMock = jest.fn();

jest.mock(
  'mercadopago',
  () => ({
    MercadoPagoConfig: class MercadoPagoConfig {
      constructor(_input: { accessToken: string }) {}
    },
    Preference: class Preference {
      create = createMock;
    },
    Payment: class Payment {
      get = getMock;
    },
  }),
  { virtual: true },
);

describe('MercadoPagoGateway', () => {
  const tenantRepo: jest.Mocked<TenantPaymentConfigRepositoryPort> = {
    getMercadoPagoAccessToken: jest.fn(),
    hasMercadoPagoConfig: jest.fn(),
    findActiveMercadoPagoTenants: jest.fn(),
    getMercadoPagoWebhookSecret: jest.fn(),
  };

  const structured: jest.Mocked<StructuredLoggerService> = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<StructuredLoggerService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cria pagamento com token por tenant', async () => {
    tenantRepo.getMercadoPagoAccessToken.mockResolvedValue('TENANT_TOKEN');
    createMock.mockResolvedValue({
      id: 'pref_123',
      init_point: 'https://mp.com/checkout',
      sandbox_init_point: 'https://sandbox.mp.com/checkout',
    });

    const gateway = new MercadoPagoGateway(tenantRepo, structured);
    const result = await gateway.createPayment({
      tenantId: 'tenant-1',
      externalId: 'order-1',
      description: 'Pedido',
      amount: 100,
      webhookUrl: 'https://api.test/webhook',
      items: [{ title: 'Pizza', quantity: 1, unitPrice: 100 }],
    });

    expect(tenantRepo.getMercadoPagoAccessToken).toHaveBeenCalledWith('tenant-1');
    expect(result.gateway).toBe('mercado_pago');
    expect(result.checkoutUrl).toBe('https://mp.com/checkout');
  });

  it('busca pagamento e mapeia status para interno', async () => {
    tenantRepo.getMercadoPagoAccessToken.mockResolvedValue('TENANT_TOKEN');
    getMock.mockResolvedValue({
      id: 123,
      status: 'charged_back',
      external_reference: 'order-1',
      status_detail: 'chargeback',
      metadata: { tenant_id: 'tenant-1', order_id: 'order-1' },
    });

    const gateway = new MercadoPagoGateway(tenantRepo, structured);
    const payment = await gateway.getPayment({
      tenantId: 'tenant-1',
      gatewayPaymentId: '123',
    });

    expect(payment?.status).toBe('refunded');
    expect(payment?.metadata.tenantId).toBe('tenant-1');
  });

  it('valida credenciais com chamada leve no endpoint de pagamento', async () => {
    tenantRepo.getMercadoPagoAccessToken.mockResolvedValue('TENANT_TOKEN');
    getMock.mockResolvedValue({ id: '0' });

    const gateway = new MercadoPagoGateway(tenantRepo, structured);
    const result = await gateway.validateCredentials({ tenantId: 'tenant-1' });

    expect(getMock).toHaveBeenCalledWith({ id: '0' });
    expect(result).toEqual({ valid: true });
  });

  it('retorna invalid quando validação de credencial falha', async () => {
    tenantRepo.getMercadoPagoAccessToken.mockResolvedValue('TENANT_TOKEN');
    getMock.mockRejectedValue(new Error('unauthorized'));

    const gateway = new MercadoPagoGateway(tenantRepo, structured);
    const result = await gateway.validateCredentials({ tenantId: 'tenant-1' });

    expect(result).toEqual({ valid: false });
    expect(structured.warn).toHaveBeenCalled();
  });
});
