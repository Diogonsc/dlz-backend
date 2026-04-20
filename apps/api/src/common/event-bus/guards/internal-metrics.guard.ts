import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AppConfig } from '../../../config/app.config';
import { APP_CONFIG } from '../../../config/app-config.module';

type MetricsRequest = Request & {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class InternalMetricsGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<MetricsRequest>();
    const token = this.config.eventBus.adminToken;
    if (!token) {
      throw new UnauthorizedException('Métricas internas desabilitadas');
    }

    const headerToken = this.firstHeader(req.headers['x-internal-token']);
    if (headerToken && headerToken === token) return true;

    const authorization = this.firstHeader(req.headers.authorization);
    if (authorization?.startsWith('Bearer ') && authorization.slice(7).trim() === token) return true;

    if (authorization?.startsWith('Basic ')) {
      const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
      const [, password = ''] = decoded.split(':');
      if (password === token) return true;
    }

    throw new UnauthorizedException();
  }

  private firstHeader(v?: string | string[]): string | undefined {
    return Array.isArray(v) ? v[0] : v;
  }
}
