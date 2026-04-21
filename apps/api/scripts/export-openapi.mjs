#!/usr/bin/env node
/**
 * Exporta o OpenAPI JSON da API em execução (GET /{SWAGGER_PATH}/json).
 * Uso (na raiz do monorepo): `node apps/api/scripts/export-openapi.mjs`
 * Variáveis: OPENAPI_EXPORT_URL (default http://127.0.0.1:3333/docs/json), OPENAPI_OUT (default apps/api/openapi/openapi.generated.json)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const url = process.env.OPENAPI_EXPORT_URL ?? 'http://127.0.0.1:3333/docs/json';
const outRel = process.env.OPENAPI_OUT ?? 'apps/api/openapi/openapi.generated.json';
const out = resolve(process.cwd(), outRel);
const maxAttempts = Number(process.env.OPENAPI_EXPORT_ATTEMPTS ?? 60);
const intervalMs = Number(process.env.OPENAPI_EXPORT_INTERVAL_MS ?? 2000);

mkdirSync(dirname(out), { recursive: true });

for (let i = 0; i < maxAttempts; i++) {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[openapi:export] ${res.status} ${res.statusText} — tentativa ${i + 1}/${maxAttempts}`);
    } else {
      const text = await res.text();
      const json = JSON.parse(text);
      writeFileSync(out, JSON.stringify(json, null, 2), 'utf8');
      console.log(`[openapi:export] OK — ${out} (${(text.length / 1024).toFixed(1)} KiB)`);
      process.exit(0);
    }
  } catch (e) {
    console.warn(`[openapi:export] ${e instanceof Error ? e.message : e} — tentativa ${i + 1}/${maxAttempts}`);
  }
  await delay(intervalMs);
}

console.error(`[openapi:export] Falhou após ${maxAttempts} tentativas (${url})`);
process.exit(1);
