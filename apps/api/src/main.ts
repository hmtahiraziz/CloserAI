import './load-env';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppEnv } from './config/env';
import { configureNestApp } from './create-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  await configureNestApp(app);

  const config = app.get(ConfigService<AppEnv, true>);
  const port = Number(process.env.PORT) || config.get('API_PORT');
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`CloserAI API listening on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
