import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdirSync } from 'node:fs';
import {
  resolveLocalStorageRoot,
  useLocalFilesystemStorage,
  type StorageBlock,
} from './modules/storage/local-storage.helpers';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppDomainExceptionFilter } from './common/filters/app-domain-exception.filter';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { isResponseEnvelopeEnabled } from './common/http/response-envelope';
import { SWAGGER_EXTRA_MODELS } from './swagger/swagger-extra.models';

const OPENAPI_DESCRIPTION = `
API DLZ Delivery Hub (NestJS + Fastify).

## Versão do contrato
- **API HTTP:** prefixo \`/api/v1/...\` (evolução futura: \`/api/v2\` com breaking changes explícitos).
- **OpenAPI \`info.version\`:** semver do documento (alinhar com releases do backend).

## Base path
- Rotas versionadas: \`/api/v1/...\`
- Exceções sem prefixo: \`/health\`, \`/metrics\`

## Autenticação
- \`Authorization: Bearer <accessToken>\` nas rotas com \`ApiAuthEndpoint()\` (atalho para \`@ApiBearerAuth()\`).
- Rotas **públicas** usam \`ApiPublicEndpoint()\` (extensão \`x-public-route: true\` no OpenAPI).

## Variáveis de ambiente — contrato OpenAPI (somente documentação / CI)
| Variável | Valores | Efeito |
|----------|---------|--------|
| \`OPENAPI_RESPONSE_SHAPE\` | \`dual\` (padrão), \`legacy\`, \`envelope\` | Forma do schema **2xx** no JSON exportado (\`oneOf\` vs payload único). |
| \`OPENAPI_ERROR_SHAPE\` | \`dual\` (padrão), \`legacy\`, \`envelope\` | Forma do schema **4xx/5xx** (\`oneOf\` vs erro único). |
| \`API_UNIFIED_ERROR_BODY\` | \`true\` / \`false\` | Quando \`true\`, **runtime** devolve erros sempre como \`{ data: null, error: { code, message, details?, correlationId? } }\` (independente do envelope de sucesso). |

## Envelope opcional de sucesso (\`API_RESPONSE_ENVELOPE=true\`)
Quando ativo, o interceptor padroniza sucesso: \`{ "data": <payload>, "error": null }\`.

## CI / SDK
- Exportar spec: \`GET /<SWAGGER_PATH>/json\` (ex.: \`/docs/json\`).
- Validar: \`pnpm openapi:validate\` (usa snapshot em \`apps/api/openapi/openapi.snapshot.json\` quando presente).
`.trim();

const SWAGGER_TAG_DEFINITIONS: readonly [string, string][] = [
  ['analytics', 'Eventos da vitrine e dashboards analíticos da loja'],
  ['auth', 'Autenticação JWT, cadastro e renovação de sessão'],
  ['cash', 'Caixa: abertura, fechamento e movimentações'],
  ['categories', 'Categorias do cardápio (painel e vitrine)'],
  ['coupons', 'Validação de cupons no checkout'],
  ['crm', 'Clientes, métricas e segmentação'],
  ['domains', 'Domínio customizado e verificação DNS'],
  ['health', 'Health check público da API'],
  ['ifood', 'Integração iFood (OAuth, status, webhook)'],
  ['migration', 'Ferramentas e flags de migração Supabase → Nest'],
  ['orders', 'Pedidos: criação pública, painel e rastreamento'],
  ['otp', 'OTP por telefone para clientes na vitrine'],
  ['payment-gateways', 'Gateways de pagamento da loja (ex.: Mercado Pago)'],
  ['payments', 'Assinaturas (Stripe/Cakto) e webhooks de pagamento'],
  ['plans', 'Planos comerciais e limites'],
  ['products', 'Produtos e disponibilidade do cardápio'],
  ['push', 'Registro e envio de Web Push'],
  ['pwa', 'Web App Manifest dinâmico por tenant'],
  ['rpc', 'RPCs de compatibilidade com funções Edge / vitrine'],
  ['signup', 'Cadastro self-service de nova loja'],
  ['storage', 'Upload e remoção de arquivos (imagens)'],
  ['stores', 'Configuração pública e painel da loja'],
  ['tables', 'Mesas e QR code no salão'],
  ['tabs', 'Comandas (tabs) vinculadas a mesas'],
  ['tenants', 'Gestão de tenants na plataforma'],
  ['users', 'Perfil do usuário autenticado'],
  ['whatsapp', 'Webhooks da Meta Cloud API (verificação e inbound)'],
  ['whatsapp-contacts', 'Contatos WhatsApp (Twilio) da loja'],
  ['winback', 'Campanhas e filas de reativação de clientes'],
];

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const config = app.get(ConfigService);

  const redisUrl = config.get<string>('REDIS_URL') ?? config.get<string>('SOCKET_IO_REDIS_URL');
  if (redisUrl) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(redisIoAdapter);
    logger.log('🔌 Socket.io com adapter Redis (multi-instância)');
  }
  const port = config.get<number>('PORT', 3333);
  const nodeEnv = String(config.get<string>('nodeEnv') ?? config.get<string>('NODE_ENV') ?? 'development').toLowerCase();

  // ── Segurança ──────────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: nodeEnv === 'production',
  });

  await app.getHttpAdapter().getInstance().register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  const storage = config.get<StorageBlock>('storage');
  if (storage && useLocalFilesystemStorage(nodeEnv, storage)) {
    const localRoot = resolveLocalStorageRoot(storage.localDir);
    mkdirSync(localRoot, { recursive: true });
    await app.getHttpAdapter().getInstance().register(fastifyStatic, {
      root: localRoot,
      prefix: '/api/v1/storage/public/',
      decorateReply: false,
    });
    logger.log(`📁 Storage local: ${localRoot} → GET /api/v1/storage/public/…`);
  }

  app.enableCors({
    origin: (config.get<string>('FRONTEND_URL', 'http://localhost:5173')).split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Validação global ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(), new AppDomainExceptionFilter());

  if (isResponseEnvelopeEnabled()) {
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  }

  // ── Prefixo global ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'metrics'] });

  // ── Swagger ─────────────────────────────────────────────────────────────────
  const swaggerEnabled =
    config.get<string>('SWAGGER_ENABLED')?.toLowerCase() === 'true' || nodeEnv !== 'production';

  if (swaggerEnabled) {
    const docsPath = config.get<string>('SWAGGER_PATH', 'docs');
    const docsServerUrl = config.get<string>('SWAGGER_SERVER_URL', `http://localhost:${port}`);

    const swaggerConfig = SWAGGER_TAG_DEFINITIONS.reduce(
      (builder, [name, description]) => builder.addTag(name, description),
      new DocumentBuilder()
        .setTitle('DLZ Delivery Hub API')
        .setDescription(OPENAPI_DESCRIPTION)
        .setVersion('1.0.0')
        .addServer(docsServerUrl)
        .addBearerAuth()
        .addGlobalParameters({
          name: 'X-Correlation-Id',
          in: 'header',
          required: false,
          description:
            'Identificador de correlação opcional. Quando omitido, o servidor gera um e o devolve no mesmo header da resposta.',
          schema: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
        }),
    ).build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      extraModels: [...SWAGGER_EXTRA_MODELS],
    });
    SwaggerModule.setup(docsPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
      jsonDocumentUrl: `${docsPath}/json`,
    });

    logger.log(`📚 Swagger disponível em ${docsServerUrl}/${docsPath}`);
    logger.log(`🧾 OpenAPI JSON em ${docsServerUrl}/${docsPath}/json`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API rodando em http://localhost:${port}`);
  logger.log(`🌍 Ambiente: ${nodeEnv}`);
}

bootstrap();
