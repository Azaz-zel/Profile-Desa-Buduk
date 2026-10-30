import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { Auth, CurrentUser, hashPassword, SessionUser } from './auth';
import { CreateUserDto, ResetPasswordDto } from './dto';
import { PrismaService } from './prisma.service';

const PUBLIC_FIELDS = { id: true, username: true, name: true, role: true, createdAt: true } as const;

@Controller('admin/users')
@Auth('ADMIN')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.user.findMany({ select: PUBLIC_FIELDS, orderBy: { name: 'asc' } });
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const taken = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (taken) throw new ConflictException('Nama pengguna sudah dipakai');
    return this.prisma.user.create({
      data: { username: dto.username, name: dto.name, role: dto.role, passwordHash: await hashPassword(dto.password) },
      select: PUBLIC_FIELDS,
    });
  }

  @Put(':id/password')
  @HttpCode(204)
  async reset(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto) {
    const { count } = await this.prisma.user.updateMany({
      where: { id },
      data: { passwordHash: await hashPassword(dto.password), sessionVersion: { increment: 1 } },
    });
    if (!count) throw new NotFoundException('Akun tidak ditemukan');
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: SessionUser) {
    if (id === me.id) throw new BadRequestException('Tidak bisa menghapus akun sendiri');
    const { count } = await this.prisma.user.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException('Akun tidak ditemukan');
  }
}
