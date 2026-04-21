#!/usr/bin/env node
/**
 * Valida OpenAPI 3.x com @apidevtools/swagger-parser (dependência dev da app `api`).
 * Executar na raiz do pacote api: `pnpm exec node ./scripts/validate-openapi.mjs [openapi/arquivo.json]`
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';

const cwd = process.cwd();
const spec = resolve(cwd, process.argv[2] ?? 'openapi/openapi.snapshot.json');

if (!existsSync(spec)) {
  console.error(`[openapi:validate] Arquivo não encontrado: ${spec}`);
  process.exit(1);
}

try {
  const raw = JSON.parse(readFileSync(spec, 'utf8'));
  await SwaggerParser.validate(raw);
  console.log(`[openapi:validate] OK — ${spec}`);
} catch (e) {
  console.error('[openapi:validate] Spec inválido:', e);
  process.exit(1);
}
