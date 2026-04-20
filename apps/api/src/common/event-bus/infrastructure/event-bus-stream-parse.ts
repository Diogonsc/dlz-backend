import type { DomainEventBusEnvelope } from '../domain/event-bus-message';

export function fieldsToRecord(fields: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    const k = fields[i];
    const v = fields[i + 1];
    if (k != null && v != null) {
      out[k] = v;
    }
  }
  return out;
}

export function parseEnvelope(streamMessageId: string, rec: Record<string, string>): DomainEventBusEnvelope {
  let payload: unknown = null;
  try {
    payload = rec.payload ? JSON.parse(rec.payload) : null;
  } catch {
    payload = rec.payload;
  }
  return {
    eventId: rec.eventId || streamMessageId,
    type: rec.type ?? '',
    tenantId: rec.tenantId === '' || rec.tenantId == null ? null : rec.tenantId,
    traceparent: rec.traceparent === '' || rec.traceparent == null ? null : rec.traceparent,
    payload,
  };
}
