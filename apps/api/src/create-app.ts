import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, type Request } from 'express';
import { AppModule } from './app.module';
import { AppEnv } from './config/env';
import { loadedEnvFiles } from './load-env';

export async function configureNestApp(app: INestApplication): Promise<void> {
  const config = app.get(ConfigService<AppEnv, true>);
  const logger = new Logger('Bootstrap');

  logger.log(`Loaded env files: ${loadedEnvFiles.join(', ') || '(none)'}`);
  const apiKey = (config.get('RETELL_API_KEY') || process.env.RETELL_API_KEY || '').trim();
  logger.log(`Retell API key: ${apiKey ? 'configured' : 'MISSING'}`);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser(config.get('COOKIE_SECRET')));

  // Preserve raw body for Retell signature verification.
  app.use(
    json({
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        if (req.originalUrl?.includes('/webhooks/retell') || req.originalUrl?.includes('/retell/functions')) {
          req.rawBody = Buffer.from(buf);
        }
      },
      limit: '2mb',
    }),
  );

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get('WEB_URL'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('CloserAI API')
    .setDescription('AI Sales Call Closer powered by Retell AI')
    .setVersion('1.0')
    .addCookieAuth('closerai_session')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
}

/** Local / Docker / Vercel: Nest listens on PORT (Vercel) or API_PORT. */
export async function bootstrapHttpServer(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  await configureNestApp(app);
  const config = app.get(ConfigService<AppEnv, true>);
  const port = Number(process.env.PORT) || config.get('API_PORT');
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`CloserAI API listening on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  return app;
}
