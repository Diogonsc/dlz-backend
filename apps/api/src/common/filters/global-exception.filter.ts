import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { FastifyRequest } from 'fastify';
import { getObservabilityContext } from '../observability/request-context.storage';
import { isResponseEnvelopeEnabled } from '../http/response-envelope';
import { isUnifiedApiErrorBodyEnabled } from '../http/api-error-format';
import { normalizeHttpErrorCode } from '../http/error-code.util';

function useEnvelopeErrorBody(): boolean {
  return isResponseEnvelopeEnabled() || isUnifiedApiErrorBodyEnabled();
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<FastifyRequest & { correlationId?: string; user?: { tenantId?: string } }>();

    const obs = getObservabilityContext();
    const correlationId = obs?.correlationId ?? request.correlationId ?? null;
    const tenantId = obs?.tenantId ?? request.user?.tenantId ?? null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let error = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: unknown | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object' && 'message' in res) {
        const raw = (res as { message: unknown }).message;
        if (typeof raw === 'string') message = raw;
        else if (Array.isArray(raw)) message = raw.map(String).join(', ');
        const maybeCode = (res as { code?: unknown }).code;
        if (typeof maybeCode === 'string' && maybeCode.length > 0) code = maybeCode;
        const maybeDetails = (res as { details?: unknown }).details;
        if (maybeDetails !== undefined) details = maybeDetails;
      }
      error = exception.name;
      if (code === 'INTERNAL_ERROR' && status < 500) {
        code = error.replace(/\s+/g, '_').toUpperCase();
      }
      if (status >= 500) {
        this.logger.error(
          JSON.stringify({
            type: 'error',
            kind: 'http',
            correlationId,
            tenantId,
            statusCode: status,
            message,
            stack: exception.stack ?? null,
            path: request.url,
          }),
        );
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Registro duplicado';
        error = 'Conflict';
        code = 'CONFLICT';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado';
        error = 'Not Found';
        code = 'NOT_FOUND';
      } else {
        this.logger.error(
          JSON.stringify({
            type: 'error',
            kind: 'prisma',
            correlationId,
            tenantId,
            prismaCode: exception.code,
            message: exception.message,
            stack: exception.stack ?? null,
            path: request.url,
          }),
        );
      }
    } else {
      const stack = exception instanceof Error ? exception.stack ?? exception.message : String(exception);
      this.logger.error(
        JSON.stringify({
          type: 'error',
          kind: 'unhandled',
          correlationId,
          tenantId,
          message: exception instanceof Error ? exception.message : String(exception),
          stack,
          path: request.url,
        }),
      );
    }

    code = normalizeHttpErrorCode(status, code);

    if (useEnvelopeErrorBody()) {
      response.status(status).send({
        data: null,
        error: {
          message,
          code,
          ...(details !== undefined ? { details } : {}),
          correlationId,
        },
      });
      return;
    }

    response.status(status).send({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    });
  }
}
