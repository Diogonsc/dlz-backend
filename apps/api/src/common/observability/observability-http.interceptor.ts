import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { runInObservabilityContext, traceIdFromTraceparent, type ObservabilityContext } from './request-context.storage';
import { StructuredLoggerService } from './structured-logger.service';

const CORRELATION_HEADER = 'x-correlation-id';

function readCorrelationHeader(req: FastifyRequest): string | undefined {
  const raw = req.headers[CORRELATION_HEADER];
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return undefined;
}

function readTraceparent(req: FastifyRequest): string | undefined {
  const raw = req.headers.traceparent;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return undefined;
}

type RequestWithUser = FastifyRequest & {
  correlationId?: string;
  user?: { tenantId?: string; id?: string; sub?: string };
};

function resolveUserIds(req: RequestWithUser): Pick<ObservabilityContext, 'tenantId' | 'userId'> {
  const u = req.user;
  if (!u) return { tenantId: null, userId: null };
  return {
    tenantId: u.tenantId ?? null,
    userId: (u.sub ?? u.id) ?? null,
  };
}

/**
 * Correlation ID + contexto ALS + log HTTP estruturado (ponta a ponta até publishers).
 */
const INTEGRATION_ROUTE_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/rpc',
  '/api/v1/tabs',
  '/api/v1/storage',
  '/api/v1/ifood',
] as const;

@Injectable()
export class ObservabilityHttpInterceptor implements NestInterceptor {
  private readonly integrationLog = new Logger('Integration');

  constructor(private readonly structured: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    const correlationId = readCorrelationHeader(req) ?? randomUUID();
    req.correlationId = correlationId;
    void res.header(CORRELATION_HEADER, correlationId);

    const { tenantId, userId } = resolveUserIds(req);
    const traceparent = readTraceparent(req) ?? null;
    const store: ObservabilityContext = {
      correlationId,
      tenantId,
      userId,
      traceparent,
      traceId: traceIdFromTraceparent(traceparent),
    };
    const started = Date.now();
    const method = req.method;
    const url = req.url ?? '';

    return new Observable((observer) => {
      runInObservabilityContext(store, () => {
        const sub = next
          .handle()
          .pipe(
            tap({
              next: () => {
                const durationMs = Date.now() - started;
                const statusCode = res.statusCode ?? 200;
                this.structured.log({
                  type: 'http',
                  correlationId,
                  traceId: store.traceId ?? null,
                  tenantId: tenantId ?? null,
                  userId: userId ?? null,
                  method,
                  url,
                  durationMs,
                  statusCode,
                });
                if (INTEGRATION_ROUTE_PREFIXES.some((p) => url.startsWith(p))) {
                  this.integrationLog.log(`[API] ${method} ${url} -> ${statusCode} (user: ${userId ?? 'anon'})`);
                }
              },
              error: (err: unknown) => {
                const durationMs = Date.now() - started;
                const statusCode = err instanceof HttpException ? err.getStatus() : 500;
                this.structured.warn({
                  type: 'http',
                  correlationId,
                  traceId: store.traceId ?? null,
                  tenantId: tenantId ?? null,
                  userId: userId ?? null,
                  method,
                  url,
                  durationMs,
                  statusCode,
                  errorMessage: err instanceof Error ? err.message : String(err),
                });
              },
            }),
          )
          .subscribe(observer);
        return () => sub.unsubscribe();
      });
    });
  }
}
