import { ForbiddenException } from '@nestjs/common';
import { InternalReplayGuard } from './internal-replay.guard';

describe('InternalReplayGuard', () => {
  const guard = new InternalReplayGuard();

  const ctx = (body: unknown, internalAuth: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ body, internalAuth }),
      }),
    }) as never;

  it('permite replay quando scope e tenant autorizados', () => {
    expect(
      guard.canActivate(
        ctx(
          { tenantId: 'tenant-1' },
          { scopes: ['eventbus:replay:execute'], tenantIds: ['tenant-1'] },
        ),
      ),
    ).toBe(true);
  });

  it('bloqueia sem scope', () => {
    expect(() =>
      guard.canActivate(ctx({ tenantId: 'tenant-1' }, { scopes: [], tenantIds: ['tenant-1'] })),
    ).toThrow(ForbiddenException);
  });

  it('bloqueia tenant cross', () => {
    expect(() =>
      guard.canActivate(
        ctx(
          { tenantId: 'tenant-2' },
          { scopes: ['eventbus:replay:execute'], tenantIds: ['tenant-1'] },
        ),
      ),
    ).toThrow(ForbiddenException);
  });
});
