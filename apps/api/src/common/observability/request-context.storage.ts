import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de pedido HTTP propagado por AsyncLocalStorage (use cases, publishers, Prisma opcional).
 * Preparado para futura integração OpenTelemetry (traceId no mesmo objeto).
 */
export type ObservabilityContext = {
  correlationId: string;
  tenantId?: string | null;
  userId?: string | null;
  traceparent?: string | null;
  traceId?: string | null;
  /** Reservado para flags futuras de tracing */
  traceFlags?: string | null;
};

const storage = new AsyncLocalStorage<ObservabilityContext>();

export function getObservabilityContext(): ObservabilityContext | undefined {
  return storage.getStore();
}

export function runInObservabilityContext<T>(store: ObservabilityContext, fn: () => T): T {
  return storage.run(store, fn);
}

export function traceIdFromTraceparent(traceparent?: string | null): string | null {
  if (!traceparent) return null;
  const parts = traceparent.trim().split('-');
  if (parts.length < 4) return null;
  const traceId = parts[1] ?? '';
  return traceId.length === 32 ? traceId : null;
}
