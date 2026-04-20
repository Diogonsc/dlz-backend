import { SendWinbackMessageUseCase } from './send-winback-message.use-case';
import { WinbackRepositoryPort } from '../../domain/ports/winback.repository.port';
import { NotificationGatewayPort } from '../../domain/ports/notification-gateway.port';
import { TerminalExternalError, TransientExternalError } from '../../domain/errors/notification.errors';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';

describe('SendWinbackMessageUseCase', () => {
  const repo: jest.Mocked<WinbackRepositoryPort> = {
    getLogs: jest.fn(),
    getMonthlyCount: jest.fn(),
    findCustomerByPhone: jest.fn(),
    createCouponForCampaign: jest.fn(),
    hasRecentMessage: jest.fn(),
    isOptedOut: jest.fn(),
    createWinbackMessage: jest.fn(),
    updateWinbackMessageContent: jest.fn(),
    markWinbackMessageSent: jest.fn(),
    markWinbackMessageFailed: jest.fn(),
    createWinbackLog: jest.fn(),
  };
  const gateway: jest.Mocked<NotificationGatewayPort> = {
    sendWhatsAppMessage: jest.fn(),
  };
  const structured = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const useCase = new SendWinbackMessageUseCase(repo, gateway, structured as unknown as StructuredLoggerService);

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findCustomerByPhone.mockResolvedValue({ userId: 'u1', name: 'Maria' });
    repo.createCouponForCampaign.mockResolvedValue({ id: 'c1', code: 'DLZ-123' });
    repo.isOptedOut.mockResolvedValue(false);
    repo.createWinbackMessage.mockResolvedValue({
      id: 'm1',
      status: 'pending',
      createdNow: true,
      messageBody: '__pending_message_body__',
    });
  });

  it('nao envia mensagem duplicada recente', async () => {
    repo.hasRecentMessage.mockResolvedValue(true);
    const out = await useCase.execute({
      tenantId: 't1',
      phone: '5511999990000',
      segment: 'inactive',
      campaign: 'winback_inactive',
    });
    expect(out).toEqual({ sent: false, reason: 'duplicate_recent' });
    expect(gateway.sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it('respeita tenant no envio e registra sent', async () => {
    repo.hasRecentMessage.mockResolvedValue(false);
    gateway.sendWhatsAppMessage.mockResolvedValue({ status: 'sent', providerMessageId: 'tw123' });
    const out = await useCase.execute({
      tenantId: 'tenant-a',
      phone: '(11) 99999-0000',
      segment: 'inactive',
      campaign: 'winback_inactive',
    });
    expect(out.sent).toBe(true);
    expect(gateway.sendWhatsAppMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
      }),
    );
    expect(repo.markWinbackMessageSent).toHaveBeenCalledWith('m1', 'tw123');
    expect(repo.createCouponForCampaign).toHaveBeenCalledTimes(1);
  });

  it('falha externa nao quebra fluxo e marca failed', async () => {
    repo.hasRecentMessage.mockResolvedValue(false);
    gateway.sendWhatsAppMessage.mockResolvedValue({ status: 'failed', errorMessage: 'timeout' });
    const out = await useCase.execute({
      tenantId: 't1',
      phone: '5511999990000',
      segment: 'inactive',
      campaign: 'winback_inactive',
    });
    expect(out).toEqual({ sent: false, reason: 'gateway_failed' });
    expect(repo.markWinbackMessageFailed).toHaveBeenCalledWith('m1', 'timeout');
  });

  it('erro transitório propaga para permitir retry da fila', async () => {
    repo.hasRecentMessage.mockResolvedValue(false);
    gateway.sendWhatsAppMessage.mockRejectedValue(new TransientExternalError('twilio', 'network_down'));
    await expect(
      useCase.execute({
        tenantId: 't1',
        phone: '5511999990000',
        segment: 'inactive',
        campaign: 'winback_inactive',
      }),
    ).rejects.toThrow('network_down');
    expect(repo.markWinbackMessageFailed).not.toHaveBeenCalled();
  });

  it('erro terminal marca failed sem retry', async () => {
    repo.hasRecentMessage.mockResolvedValue(false);
    gateway.sendWhatsAppMessage.mockRejectedValue(new TerminalExternalError('twilio', 'twilio_400'));
    const out = await useCase.execute({
      tenantId: 't1',
      phone: '5511999990000',
      segment: 'inactive',
      campaign: 'winback_inactive',
    });
    expect(out).toEqual({ sent: false, reason: 'terminal_error' });
    expect(repo.markWinbackMessageFailed).toHaveBeenCalledWith('m1', 'twilio_400');
  });

  it('bloqueia envio para contato com opt-out', async () => {
    repo.hasRecentMessage.mockResolvedValue(false);
    repo.isOptedOut.mockResolvedValue(true);
    const out = await useCase.execute({
      tenantId: 't1',
      phone: '5511999990000',
      segment: 'inactive',
      campaign: 'winback_inactive',
    });
    expect(out).toEqual({ sent: false, reason: 'opted_out' });
    expect(repo.createCouponForCampaign).not.toHaveBeenCalled();
    expect(gateway.sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it('reutiliza mensagem existente sem criar novo cupom', async () => {
    repo.hasRecentMessage.mockResolvedValue(false);
    repo.createWinbackMessage.mockResolvedValue({
      id: 'm1',
      status: 'pending',
      createdNow: false,
      messageBody: 'mensagem pronta',
    });
    gateway.sendWhatsAppMessage.mockResolvedValue({ status: 'sent', providerMessageId: 'tw123' });
    const out = await useCase.execute({
      tenantId: 't1',
      phone: '5511999990000',
      segment: 'inactive',
      campaign: 'winback_inactive',
    });
    expect(out).toEqual({ sent: true });
    expect(repo.createCouponForCampaign).not.toHaveBeenCalled();
  });
});
