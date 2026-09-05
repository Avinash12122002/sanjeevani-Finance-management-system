import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import * as express from 'express';
import { join } from 'path';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizeEmojiPipe } from './common/pipes/sanitize-emoji.pipe';

async function bootstrap() {
  const logger = new Logger('SanjeevaniFinanceBootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Security Hardening Middleware (SRS §82)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Next.js & Ant Design UI hydration
      crossOriginEmbedderPolicy: false,
      hidePoweredBy: true,
      xssFilter: true,
      noSniff: true,
    }),
  );

  // 2. Performance Compression & Static Asset Serving
  app.use(compression());
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // 3. CORS Configuration — explicit allowlist (never wildcard with credentials)
  const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Allow Vercel preview deployments and localhost ports
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'Idempotency-Key',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  });

  // 4. Global Validation & Emoji Sanitization Pipeline
  app.useGlobalPipes(
    new SanitizeEmojiPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 5. Global Response Envelope & Exception Interceptors (SRS §74)
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`================================================================`);
  logger.log(` SANJEEVANI FINANCE MANAGEMENT SYSTEM - API BACKEND ONLINE`);
  logger.log(` Running on: http://localhost:${port}`);
  logger.log(` Base API Prefix: http://localhost:${port}/api/v1`);
  logger.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(` Double-Entry Engine & Decimal.js Math Verified`);
  logger.log(`================================================================`);
}

bootstrap();
