import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import express from 'express';
import { existsSync } from 'fs';
import helmet from 'helmet';
import { resolve } from 'path';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth';
import { FilesController } from './files.controller';
import { PostsController } from './posts.controller';
import { PrismaService } from './prisma.service';
import { ReportsController } from './reports.controller';
import { PUBLIC_DIR } from './uploads';
import { UsersController } from './users.controller';
import { VillageController } from './village.controller';

const WEB_DIST = resolve(process.env.WEB_DIST ?? '../web/dist');

const secret = process.env.JWT_SECRET ?? '';
if (secret.length < 32) throw new Error('JWT_SECRET wajib diisi, minimal 32 karakter');

@Module({
  imports: [
    JwtModule.register({ secret }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // build React disajikan oleh server yang sama, jadi cukup satu container
    ...(existsSync(WEB_DIST) ? [ServeStaticModule.forRoot({ rootPath: WEB_DIST, exclude: ['/api/{*path}', '/uploads/{*path}'] })] : []),
  ],
  controllers: [AuthController, UsersController, PostsController, FilesController, ReportsController, VillageController],
  providers: [PrismaService, AuthGuard, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

export function configureApp(app: INestApplication) {
  const express_ = app as NestExpressApplication;
  if (process.env.TRUST_PROXY) express_.set('trust proxy', Number(process.env.TRUST_PROXY));
  express_.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', 'blob:'],
          'frame-src': ['https://maps.google.com', 'https://www.google.com'],
        },
      },
    }),
  );
  app.use(cookieParser());
  app.use('/uploads', express.static(PUBLIC_DIR, { index: false, dotfiles: 'deny', maxAge: '7d' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
