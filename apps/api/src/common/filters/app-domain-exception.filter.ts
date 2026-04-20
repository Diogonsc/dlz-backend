import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppDomainException } from '../errors/app-domain.exception';
import { getObservabilityContext } from '../observability/request-context.storage';
import { isResponseEnvelopeEnabled } from '../http/response-envelope';

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

    const domainCode = res.code ?? 'DOMAIN_ERROR';
    const domainMessage = typeof res === 'object' ? res.message : exception.message;

    if (isResponseEnvelopeEnabled()) {
      response.status(status).send({
        data: null,
        error: {
          message: domainMessage ?? exception.message,
          code: domainCode,
          ...(typeof res === 'object' && res.details != null ? { details: res.details } : {}),
        },
      });
      return;
    }

    response.status(status).send({
      statusCode: status,
      error: 'Domain Error',
      code: domainCode,
      message: domainMessage,
      ...(typeof res === 'object' && res.details != null ? { details: res.details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    });
  }
}
