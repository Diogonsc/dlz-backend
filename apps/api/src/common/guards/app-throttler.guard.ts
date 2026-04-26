import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip ?? 'unknown'
  }

  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const { req } = this.getRequestResponse(context)
    const ip = req.ip ?? 'unknown'
    return `${name}:${ip}:${suffix}`
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Only throttle unauthenticated requests
    const { req } = this.getRequestResponse(context)
    if (req.headers?.authorization) {
      return true
    }
    return super.canActivate(context)
  }
}
