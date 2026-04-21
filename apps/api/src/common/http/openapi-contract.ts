/**
 * Modo de documentação OpenAPI para **respostas 2xx** (não altera runtime).
 * - `dual` (padrão): `oneOf` payload direto | envelope `{ data, error: null }` — compatível com Orval/SDK tolerantes.
 * - `legacy`: apenas payload direto (SDK-friendly quando sucesso nunca é envelopado).
 * - `envelope`: apenas `{ data, error: null }` (SDK-friendly quando `API_RESPONSE_ENVELOPE=true` em todos os ambientes).
 */
export type OpenApiSchemaMode = 'dual' | 'legacy' | 'envelope';

export function getOpenApiSuccessSchemaMode(): OpenApiSchemaMode {
  const v = (process.env.OPENAPI_RESPONSE_SHAPE ?? 'dual').toLowerCase();
  if (v === 'legacy' || v === 'envelope') return v;
  return 'dual';
}

/**
 * Modo de documentação para **erros JSON** (4xx/5xx).
 * - `dual`: `oneOf` LegacyHttpErrorDto | FullEnvelopeErrorResponseDto
 * - `legacy`: apenas LegacyHttpErrorDto
 * - `envelope`: apenas FullEnvelopeErrorResponseDto (`{ data: null, error }`)
 */
export function getOpenApiErrorSchemaMode(): OpenApiSchemaMode {
  const v = (process.env.OPENAPI_ERROR_SHAPE ?? 'dual').toLowerCase();
  if (v === 'legacy' || v === 'envelope') return v;
  return 'dual';
}
