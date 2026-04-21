/**
 * Geração de client + hooks React Query a partir do OpenAPI exportado.
 * Pré-requisito: `pnpm openapi:export` (API rodando) ou arquivo gerado no CI.
 * @type {import('orval').OrvalConfig}
 */
module.exports = {
  dlz: {
    input: './apps/api/openapi/openapi.generated.json',
    output: {
      mode: 'tags-split',
      target: './frontend/src/api/generated/endpoints.ts',
      schemas: './frontend/src/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      prettier: false,
      clean: true,
      baseUrl: '',
      override: {
        mutator: {
          path: './frontend/src/api/dlz-http-mutator.ts',
          name: 'dlzApiInstance',
        },
      },
    },
  },
};
