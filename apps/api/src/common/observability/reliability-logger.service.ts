import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from './structured-logger.service';
import { getObservabilityContext } from './request-context.storage';

/**
 * Logs `type: "reliability"` para auditoria de webhooks, duplicados e retries.
 */
@Injectable()
export class ReliabilityLoggerService {
  constructor(private readonly structured: StructuredLoggerService) {}

  log(action: string, extra: Record<string, unknown> = {}): void {
    const obs = getObservabilityContext();
    this.structured.log({
      type: 'reliability',
      action,
      correlationId: obs?.correlationId ?? null,
      tenantId: extra.tenantId ?? obs?.tenantId ?? null,
      ...extra,
    });
  }
}
