import { Body, Controller, Get, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Auth, CurrentUser, hashPassword, SESSION_COOKIE, SessionUser, verifyPassword } from './auth';
import { ChangePasswordDto, LoginDto } from './dto';
import { PrismaService } from './prisma.service';

const SESSION_HOURS = 8;
// hash palsu agar waktu respons sama saat nama pengguna tidak ada (mencegah menebak nama pengguna)
const DUMMY_HASH = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username.toLowerCase() } });
    const ok = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Nama pengguna atau kata sandi salah');
    const token = await this.jwt.signAsync({ sub: user.id, v: user.sessionVersion }, { expiresIn: `${SESSION_HOURS}h` });
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/',
      maxAge: SESSION_HOURS * 3600_000,
    });
    return { id: user.id, username: user.username, name: user.name, role: user.role };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  @Auth()
  me(@CurrentUser() user: SessionUser) {
    return user;
  }

  @Post('password')
  @HttpCode(204)
  @Auth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(@CurrentUser() me: SessionUser, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(dto.oldPassword, user.passwordHash))) throw new UnauthorizedException('Kata sandi lama salah');
    await this.prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(dto.newPassword), sessionVersion: { increment: 1 } },
    });
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }
}
