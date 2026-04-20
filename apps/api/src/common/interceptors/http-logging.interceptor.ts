import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * @deprecated Substituído pelo `ObservabilityHttpInterceptor` global (correlationId + JSON estruturado).
 * Mantido apenas para referência; não registar em novos controllers.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const tenantId = req.user?.tenantId as string | undefined;
    const userId = req.user?.id as string | undefined;
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - started;
          this.logger.log(
            JSON.stringify({
              method,
              url,
              ms,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            }),
          );
        },
        error: (err: Error) => {
          const ms = Date.now() - started;
          this.logger.warn(
            JSON.stringify({
              method,
              url,
              ms,
              tenantId: tenantId ?? null,
              err: err.message,
            }),
          );
        },
      }),
    );
  }
}
