import { parseEnvelope } from './event-bus-stream-parse';

describe('event-bus-stream-parse', () => {
  it('propaga traceparent no envelope parseado', () => {
    const out = parseEnvelope('1-0', {
      eventId: 'evt-1',
      type: 'payment.approved',
      tenantId: 'tenant-1',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      payload: '{"ok":true}',
    });

    expect(out.traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    expect(out.tenantId).toBe('tenant-1');
  });
});
