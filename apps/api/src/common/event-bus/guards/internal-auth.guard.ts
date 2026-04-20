import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import type { AppConfig } from '../../../config/app.config';
import { APP_CONFIG } from '../../../config/app-config.module';

type InternalTokenPayload = {
  sub?: string;
  aud?: string;
  exp?: number;
  scopes?: string[];
  tenantIds?: string[];
};

type InternalRequest = Request & {
  headers: Record<string, string | string[] | undefined>;
  internalAuth?: {
    actor: string;
    scopes: string[];
    tenantIds: string[];
  };
};

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<InternalRequest>();
    const token = this.extractBearer(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Token interno ausente');
    }

    const decoded = verify(token, this.config.jwt.secret, { audience: 'internal-tools' }) as InternalTokenPayload;
    if (!Array.isArray(decoded.scopes)) {
      throw new UnauthorizedException('Token interno sem scopes');
    }
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('Token interno expirado');
    }

    req.internalAuth = {
      actor: decoded.sub ?? 'internal-service',
      scopes: decoded.scopes,
      tenantIds: Array.isArray(decoded.tenantIds) ? decoded.tenantIds : [],
    };
    return true;
  }

  private extractBearer(authorization?: string | string[]): string | null {
    const raw = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!raw) return null;
    const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
    return m ? m[1]!.trim() : null;
  }
}
