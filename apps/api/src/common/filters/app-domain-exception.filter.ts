import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppDomainException } from '../errors/app-domain.exception';
import { getObservabilityContext } from '../observability/request-context.storage';

@Catch(AppDomainException)
export class AppDomainExceptionFilter implements ExceptionFilter {
  catch(exception: AppDomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (n: number) => { send: (b: unknown) => void } }>();
    const request = ctx.getRequest<FastifyRequest & { correlationId?: string }>();
    const status = exception.getStatus();
    const res = exception.getResponse() as { code?: string; message?: string; details?: unknown };
    const obs = getObservabilityContext();
    const correlationId = obs?.correlationId ?? request.correlationId ?? null;

    response.status(status).send({
      statusCode: status,
      error: 'Domain Error',
      code: res.code ?? 'DOMAIN_ERROR',
      message: typeof res === 'object' ? res.message : exception.message,
      ...(typeof res === 'object' && res.details != null ? { details: res.details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    });
  }
}
