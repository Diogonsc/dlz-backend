import { RealtimeGateway } from './realtime.gateway';
import { JwtService } from '@nestjs/jwt';
import { StructuredLoggerService } from '../../common/observability/structured-logger.service';

describe('RealtimeGateway tenant isolation', () => {
  it('bloqueia join:store para tenant diferente do token', () => {
    const jwt = {} as JwtService;
    const structured = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as StructuredLoggerService;
    const gateway = new RealtimeGateway(jwt, structured);
    const client = {
      data: { tenantId: 'tenant-a' },
      join: jest.fn(),
    } as never;

    const out = gateway.joinStore(client, 'tenant-b');
    expect(out).toEqual({ error: 'forbidden_tenant' });
    expect((client as { join: jest.Mock }).join).not.toHaveBeenCalled();
  });
});
