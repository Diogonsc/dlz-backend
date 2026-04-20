import { TwilioWhatsAppGateway } from './twilio-whatsapp.gateway';
import { TerminalExternalError, TransientExternalError } from '../../domain/errors/notification.errors';
import type { AppConfig } from '../../../../config/app.config';

describe('TwilioWhatsAppGateway', () => {
  const config = {
    twilio: {
      accountSid: 'sid',
      authToken: 'token',
      whatsappNumber: '+5511999999999',
    },
  } as AppConfig;
  const structured = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lança erro transitório para 500 (retry)', async () => {
    const gateway = new TwilioWhatsAppGateway(config, structured as never);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server_error'),
    }) as jest.Mock;

    await expect(
      gateway.sendWhatsAppMessage({
        tenantId: 't1',
        toPhone: '5511999990000',
        body: 'hello',
      }),
    ).rejects.toBeInstanceOf(TransientExternalError);
  });

  it('lança erro terminal para 400 (sem retry)', async () => {
    const gateway = new TwilioWhatsAppGateway(config, structured as never);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('invalid number'),
    }) as jest.Mock;

    await expect(
      gateway.sendWhatsAppMessage({
        tenantId: 't1',
        toPhone: '5511999990000',
        body: 'hello',
      }),
    ).rejects.toBeInstanceOf(TerminalExternalError);
  });
});
