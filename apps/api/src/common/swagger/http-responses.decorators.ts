import { applyDecorators, Type } from '@nestjs/common';
import { ApiBearerAuth, ApiExtension, ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { LegacyHttpErrorDto, FullEnvelopeErrorResponseDto } from '../dtos/error-response.dto';
import { PaginationMetaDto } from '../dtos/pagination.dto';
import { RateLimitErrorBodyDto } from '../dtos/rate-limit-error.dto';
import { getOpenApiErrorSchemaMode, getOpenApiSuccessSchemaMode } from '../http/openapi-contract';

function errorJsonContent() {
  const mode = getOpenApiErrorSchemaMode();
  if (mode === 'legacy') {
    return {
      'application/json': {
        schema: { $ref: getSchemaPath(LegacyHttpErrorDto) },
      },
    };
  }
  if (mode === 'envelope') {
    return {
      'application/json': {
        schema: { $ref: getSchemaPath(FullEnvelopeErrorResponseDto) },
      },
    };
  }
  return {
    'application/json': {
      schema: {
        oneOf: [{ $ref: getSchemaPath(LegacyHttpErrorDto) }, { $ref: getSchemaPath(FullEnvelopeErrorResponseDto) }],
      },
    },
  };
}

function successResponseSchema(inner: object): object {
  const mode = getOpenApiSuccessSchemaMode();
  const wrapped = {
    type: 'object',
    required: ['data', 'error'],
    properties: {
      data: inner,
      error: {
        nullable: true,
        description: 'null em sucesso quando envelope ativo',
        example: null,
      },
    },
  };
  if (mode === 'legacy') return inner as object;
  if (mode === 'envelope') return wrapped;
  return {
    oneOf: [inner, wrapped],
  };
}

function looseObjectSchema() {
  return { type: 'object', additionalProperties: true };
}

export type JsonSuccessOptions = {
  description: string;
  /** Se omitido, documenta objeto JSON genérico (SDK: preferir tipar com `type`). */
  type?: Type<unknown>;
  /** Quando o handler retorna `T[]` (payload raiz é array JSON). */
  isArray?: boolean;
  /** Quando o handler retorna um JSON primitivo (ex.: `boolean` em RPC legado). */
  literal?: 'boolean' | 'string' | 'number';
};

/**
 * Respostas de erro padronizadas (conforme `OPENAPI_ERROR_SHAPE`: dual | legacy | envelope).
 */
export function ApiStandardErrorResponses(options?: {
  notFound?: boolean;
  omitJwtErrorResponses?: boolean;
  conflict?: boolean;
}) {
  const decorators = [
    ApiResponse({
      status: 400,
      description: 'Requisição inválida ou falha de validação (class-validator)',
      content: errorJsonContent(),
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno não tratado',
      content: errorJsonContent(),
    }),
  ];
  if (!options?.omitJwtErrorResponses) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Não autenticado (credenciais inválidas ou JWT ausente/inválido)',
        content: errorJsonContent(),
      }),
      ApiResponse({
        status: 403,
        description: 'Sem permissão para o recurso',
        content: errorJsonContent(),
      }),
    );
  }
  if (options?.notFound) {
    decorators.push(
      ApiResponse({
        status: 404,
        description: 'Recurso não encontrado',
        content: errorJsonContent(),
      }),
    );
  }
  if (options?.conflict) {
    decorators.push(
      ApiResponse({
        status: 409,
        description: 'Conflito de estado (ex.: e-mail já cadastrado)',
        content: errorJsonContent(),
      }),
    );
  }
  return applyDecorators(...decorators);
}

function throttle429Schema(): object {
  const mode = getOpenApiErrorSchemaMode();
  if (mode === 'legacy') {
    return { $ref: getSchemaPath(LegacyHttpErrorDto) };
  }
  if (mode === 'envelope') {
    return { $ref: getSchemaPath(FullEnvelopeErrorResponseDto) };
  }
  const throttler = { $ref: getSchemaPath(RateLimitErrorBodyDto) };
  return {
    oneOf: [throttler, { $ref: getSchemaPath(LegacyHttpErrorDto) }, { $ref: getSchemaPath(FullEnvelopeErrorResponseDto) }],
  };
}

/** 429 — throttle (`@Throttle`). Em `OPENAPI_ERROR_SHAPE=envelope|legacy`, schema único (sem `oneOf`). */
export function ApiTooManyRequestsResponse(description = 'Limite de requisições excedido (throttler / anti-abuso)') {
  return applyDecorators(
    ApiExtraModels(RateLimitErrorBodyDto, LegacyHttpErrorDto, FullEnvelopeErrorResponseDto),
    ApiResponse({
      status: 429,
      description,
      headers: {
        'Retry-After': {
          description: 'Segundos até nova tentativa (quando enviado pelo proxy/gateway)',
          schema: { type: 'string', example: '60' },
          required: false,
        },
      },
      content: {
        'application/json': {
          schema: throttle429Schema(),
        },
      },
    }),
  );
}

function successInnerSchema(opts: Pick<JsonSuccessOptions, 'type' | 'isArray' | 'literal'>): object {
  if (opts.literal === 'boolean') return { type: 'boolean', example: true };
  if (opts.literal === 'string') return { type: 'string', example: '' };
  if (opts.literal === 'number') return { type: 'number', example: 0 };
  if (!opts.type) return looseObjectSchema();
  if (opts.isArray) {
    return { type: 'array', items: { $ref: getSchemaPath(opts.type) } };
  }
  return { $ref: getSchemaPath(opts.type) };
}

export function ApiJsonOkResponse(opts: JsonSuccessOptions) {
  const inner: object = successInnerSchema(opts);
  const suffix =
    getOpenApiSuccessSchemaMode() === 'dual'
      ? ' Contrato documentado: ver `OPENAPI_RESPONSE_SHAPE` (legacy|envelope|dual).'
      : '';
  return applyDecorators(
    ...(opts.type && !opts.literal ? [ApiExtraModels(opts.type)] : []),
    ApiResponse({
      status: 200,
      description: opts.description + suffix,
      content: {
        'application/json': {
          schema: successResponseSchema(inner),
        },
      },
    }),
  );
}

export function ApiJsonCreatedResponse(opts: JsonSuccessOptions) {
  const inner: object = successInnerSchema(opts);
  const suffix =
    getOpenApiSuccessSchemaMode() === 'dual'
      ? ' Contrato documentado: ver `OPENAPI_RESPONSE_SHAPE` (legacy|envelope|dual).'
      : '';
  return applyDecorators(
    ...(opts.type && !opts.literal ? [ApiExtraModels(opts.type)] : []),
    ApiResponse({
      status: 201,
      description: opts.description + suffix,
      content: {
        'application/json': {
          schema: successResponseSchema(inner),
        },
      },
    }),
  );
}

export function ApiNoContentResponse(description: string) {
  return ApiResponse({ status: 204, description });
}

/**
 * Marca operação como **pública** (sem JWT).
 * Extensão `x-public-route` para geradores/SDK; combine com `ApiStandardErrorResponses({ omitJwtErrorResponses: true })` quando não houver 401/403.
 */
export function ApiPublicEndpoint() {
  return applyDecorators(ApiExtension('x-public-route', true));
}

/** Marca operação como **protegida por JWT** (atalho para `@ApiBearerAuth()`). */
export function ApiAuthEndpoint() {
  return applyDecorators(ApiBearerAuth());
}

/**
 * Lista paginada: `{ items: T[], meta: PaginationMetaDto }` + mesma regra de envelope que `ApiJsonOkResponse`.
 */
export function ApiPaginatedJsonOkResponse(itemType: Type<unknown>, description: string) {
  const inner = {
    type: 'object',
    required: ['items', 'meta'],
    properties: {
      items: { type: 'array', items: { $ref: getSchemaPath(itemType) } },
      meta: { $ref: getSchemaPath(PaginationMetaDto) },
    },
  };
  const suffix =
    getOpenApiSuccessSchemaMode() === 'dual'
      ? ' Contrato documentado: ver `OPENAPI_RESPONSE_SHAPE` (legacy|envelope|dual).'
      : '';
  return applyDecorators(
    ApiExtraModels(itemType, PaginationMetaDto),
    ApiResponse({
      status: 200,
      description: description + suffix,
      content: {
        'application/json': {
          schema: successResponseSchema(inner),
        },
      },
    }),
  );
}
