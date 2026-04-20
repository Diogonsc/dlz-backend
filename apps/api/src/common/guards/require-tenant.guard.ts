import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Garante que o utilizador autenticado possui tenantId no JWT (painel lojista).
 * Usar em controllers de loja em conjunto com JwtAuthGuard.
 */
@Injectable()
export class RequireTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const tenantId = req.user?.tenantId as string | undefined;
    if (!tenantId) {
      throw new ForbiddenException('Utilizador sem loja associada');
    }
    return true;
  }
}
