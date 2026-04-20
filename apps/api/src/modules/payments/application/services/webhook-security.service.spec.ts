import { UnauthorizedException } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { WebhookSecurityService } from './webhook-security.service';
import { createHmac } from 'node:crypto';

describe('WebhookSecurityService', () => {
  const now = Math.floor(Date.now() / 1000);
  const rawBody = Buffer.from(JSON.stringify({ ok: true }));
  const nonce = 'n-1';
  const timestamp = String(now);
  const secret = 'top-secret';

  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${nonce}.${rawBody.toString('utf8')}`)
    .digest('hex');

  const makeService = (getValue: unknown = null) => {
    const cache = {
      get: jest.fn().mockResolvedValue(getValue),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as Cache;
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as StructuredLoggerService;
    return { service: new WebhookSecurityService(cache, logger), cache };
  };

  it('valida assinatura e persiste nonce', async () => {
    const { service, cache } = makeService(null);
    await service.validate({
      provider: 'mercado_pago',
      tenantId: 'tenant-1',
      rawBody,
      signature,
      timestamp,
      nonce,
      secret,
    });
    expect((cache.set as jest.Mock).mock.calls[0][0]).toContain('webhook:mercado_pago:tenant-1:nonce:n-1');
  });

  it('rejeita nonce duplicado', async () => {
    const { service } = makeService(true);
    await expect(
      service.validate({
        provider: 'cakto',
        rawBody,
        signature,
        timestamp,
        nonce,
        secret,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
