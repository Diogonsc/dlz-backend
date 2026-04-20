/**
 * Placeholder para integração futura OpenTelemetry:
 * - exportar spanId/traceId a partir de getObservabilityContext()
 * - propagar W3C traceparent em headers HTTP saíntes
 * - correlacionar spans de Prisma / Bull / Socket.io
 *
 * Manter logs estruturados com `correlationId` até o tracer estar ativo.
 */
export const OTEL_INTEGRATION_TODO = true;
