/**
 * Quando `true`, **todas** as respostas de erro HTTP usam o corpo `{ data: null, error: { code, message, details?, correlationId? } }`,
 * mesmo com `API_RESPONSE_ENVELOPE=false` (sucesso continua sem envelope, salvo se o interceptor de envelope estiver ativo).
 *
 * Útil para alinhar frontend/SDK com um único contrato de erro sem ativar envelope de sucesso.
 */
export function isUnifiedApiErrorBodyEnabled(): boolean {
  return process.env.API_UNIFIED_ERROR_BODY === 'true';
}
