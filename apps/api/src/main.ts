import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppDomainExceptionFilter } from './common/filters/app-domain-exception.filter';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';

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
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  // ── Segurança ──────────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: nodeEnv === 'production',
  });

  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:5173'),
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

  // ── Prefixo global ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'metrics'] });

  // ── Swagger ─────────────────────────────────────────────────────────────────
  const swaggerEnabled =
    config.get<string>('SWAGGER_ENABLED')?.toLowerCase() === 'true' || nodeEnv !== 'production';

  if (swaggerEnabled) {
    const docsPath = config.get<string>('SWAGGER_PATH', 'docs');
    const docsServerUrl = config.get<string>('SWAGGER_SERVER_URL', `http://localhost:${port}`);

    const swaggerConfig = new DocumentBuilder()
      .setTitle('DLZ Delivery Hub API')
      .setDescription('Backend NestJS do DLZ — documentação de endpoints')
      .setVersion('1.0')
      .addServer(docsServerUrl)
      .addBearerAuth()
      .addTag('auth', 'Autenticação e sessão')
      .addTag('tenants', 'Gestão de tenants (plataforma)')
      .addTag('stores', 'Configuração das lojas')
      .addTag('products', 'Cardápio e produtos')
      .addTag('orders', 'Pedidos')
      .addTag('health', 'Health check')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
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
