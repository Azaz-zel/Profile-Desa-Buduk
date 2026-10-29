import {
  applyDecorators, CanActivate, createParamDecorator, ExecutionContext, ForbiddenException,
  Injectable, SetMetadata, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PrismaService } from './prisma.service';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'sid';

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

export type SessionUser = Pick<User, 'id' | 'username' | 'name' | 'role'>;

const ROLES = 'roles';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Silakan masuk terlebih dahulu');
    let payload: { sub: number; v: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Sesi sudah berakhir, silakan masuk lagi');
    }
    // cek ke database tiap request: akun dihapus atau kata sandi diganti langsung memutus sesi lama
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.sessionVersion !== payload.v) throw new UnauthorizedException('Sesi sudah berakhir, silakan masuk lagi');
    const roles = this.reflector.get<Role[] | undefined>(ROLES, ctx.getHandler()) ?? this.reflector.get<Role[] | undefined>(ROLES, ctx.getClass());
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('Menu ini khusus admin utama');
    req.user = { id: user.id, username: user.username, name: user.name, role: user.role } satisfies SessionUser;
    return true;
  }
}

/** Wajib masuk. Tanpa argumen: semua peran. Dengan 'ADMIN': khusus admin utama. */
export const Auth = (...roles: Role[]) => applyDecorators(SetMetadata(ROLES, roles), UseGuards(AuthGuard));

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => ctx.switchToHttp().getRequest().user);
