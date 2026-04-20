import { AppThrottlerGuard } from './app-throttler.guard';

describe('AppThrottlerGuard', () => {
  it('gera chave com tenant, user e ip tracker', async () => {
    const guard = new AppThrottlerGuard({} as never, {} as never, {} as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          user: { tenantId: 'tenant-1', sub: 'user-1' },
          body: {},
          query: {},
        }),
        getResponse: () => ({}),
      }),
    } as never;

    const tracker = await (guard as any).getTracker({ ip: '127.0.0.1' });
    const key = (guard as any).generateKey(context, tracker, 'auth');

    expect(key).toContain('auth:tenant-1:user-1:127.0.0.1');
  });
});
