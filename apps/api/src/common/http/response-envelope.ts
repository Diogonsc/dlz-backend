/**
 * Envelope opcional `{ data, error }` para alinhar contrato com o frontend.
 * Ative com `API_RESPONSE_ENVELOPE=true` (padrão: desligado para não quebrar clientes legados).
 */
export function isResponseEnvelopeEnabled(): boolean {
  return process.env.API_RESPONSE_ENVELOPE === 'true';
}
