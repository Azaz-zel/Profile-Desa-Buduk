import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule, configureApp } from './app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
