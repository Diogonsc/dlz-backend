import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ipFromReq =
      req.ip ??
      (Array.isArray(req.ips) ? req.ips[0] : undefined) ??
      req.socket?.remoteAddress ??
      req.connection?.remoteAddress ??
      'unknown-ip';
    return String(ipFromReq);
  }

  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const { req } = this.getRequestResponse(context);
    const tenantId =
      (req.user?.tenantId as string | undefined) ??
      (req.body?.tenantId as string | undefined) ??
      (req.query?.tenantId as string | undefined) ??
      'public';
    const userId =
      (req.user?.sub as string | undefined) ??
      (req.user?.id as string | undefined) ??
      'anonymous';
    return `${name}:${tenantId}:${userId}:${suffix}`;
  }
}
