import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { type AppConfig } from './config/configuration';

/**
 * Application bootstrap (SPEC §5). Configures security middleware, a strict
 * global validation pipe, URI versioning under `api/v1`, an env-driven CORS
 * allowlist, pino logging, Swagger at `/docs`, and graceful shutdown.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Route framework logs through pino.
  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  // Security headers and cookie parsing.
  app.use(helmet());
  app.use(cookieParser());
  app.set('trust proxy', 1);

  // Global prefix + URI versioning → /api/v1/...
  // (URI versioning renders `v1`, so the base prefix is `api` to avoid `api/v1/v1`.)
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Strict validation: strip unknown props, reject extras, transform payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // CORS from an explicit allowlist (cookies require credentials).
  const corsOrigins = config.get('cors', { infer: true }).origins;
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Swagger / OpenAPI at /docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FGD Beauty Suite API')
    .setDescription('API multi-tenant para la gestión integral de centros de belleza.')
    .setVersion('1.0')
    .addCookieAuth('fgd_access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Graceful shutdown (Prisma disconnect via lifecycle hooks).
  app.enableShutdownHooks();

  const port = config.get('api', { infer: true }).port;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`FGD Beauty Suite API escuchando en el puerto ${port} (prefijo /api/v1)`);
}

void bootstrap();
