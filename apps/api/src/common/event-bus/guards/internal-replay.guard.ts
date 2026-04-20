import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

type ReplayRequest = Request & {
  body?: { tenantId?: string };
  internalAuth?: {
    scopes: string[];
    tenantIds: string[];
  };
};

@Injectable()
export class InternalReplayGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<ReplayRequest>();
    const auth = req.internalAuth;
    if (!auth || !auth.scopes.includes('eventbus:replay:execute')) {
      throw new ForbiddenException('Scope eventbus:replay:execute é obrigatório');
    }

    const tenantId = req.body?.tenantId;
    // Bloqueia replay cross-tenant por padrão: exige tenant explícito.
    if (!tenantId) {
      throw new ForbiddenException('tenantId é obrigatório para replay');
    }
    if (auth.tenantIds.length > 0 && !auth.tenantIds.includes(tenantId)) {
      throw new ForbiddenException('Tenant não autorizado para replay');
    }
    return true;
  }
}
