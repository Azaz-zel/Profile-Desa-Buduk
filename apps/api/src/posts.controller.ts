import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostStatus, PostType, Prisma } from '@prisma/client';
import { Auth, CurrentUser, SessionUser } from './auth';
import { PostDto } from './dto';
import { PrismaService } from './prisma.service';
import { IMAGE_LIMIT, publicUrl, removeUpload, storeUpload } from './uploads';

const TYPES = Object.values(PostType);
const parseTypes = (raw?: string) => {
  const list = (raw ?? '').split(',').filter((t): t is PostType => TYPES.includes(t as PostType));
  return list.length ? list : [PostType.BERITA, PostType.PENGUMUMAN];
};
const clampInt = (raw: string | undefined, def: number, min: number, max: number) => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

@Controller()
export class PostsController {
  constructor(private prisma: PrismaService) {}

  // ---------- publik ----------

  @Get('posts')
  async list(@Query('type') type?: string, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('when') when?: string) {
    const types = parseTypes(type);
    const take = clampInt(limit, 9, 1, 24);
    const current = clampInt(page, 1, 1, 10_000);
    const where: Prisma.PostWhereInput = { status: PostStatus.PUBLISHED, type: { in: types } };
    if (q?.trim()) where.title = { contains: q.trim().slice(0, 100) };
    const isAgenda = types.length === 1 && types[0] === PostType.AGENDA;
    if (isAgenda && when === 'upcoming') where.eventAt = { gte: new Date() };
    if (isAgenda && when === 'past') where.eventAt = { lt: new Date() };
    const orderBy: Prisma.PostOrderByWithRelationInput = isAgenda ? { eventAt: when === 'upcoming' ? 'asc' : 'desc' } : { publishedAt: 'desc' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where, orderBy, take, skip: (current - 1) * take,
        select: { id: true, type: true, title: true, imageUrl: true, publishedAt: true, eventAt: true, eventPlace: true, organizer: true },
      }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page: current, pages: Math.max(1, Math.ceil(total / take)) };
  }

  @Get('posts/:id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id, status: PostStatus.PUBLISHED },
      select: { id: true, type: true, title: true, body: true, imageUrl: true, publishedAt: true, eventAt: true, eventPlace: true, organizer: true },
    });
    if (!post) throw new NotFoundException('Kabar tidak ditemukan');
    return post;
  }

  // ---------- admin ----------

  @Get('admin/posts')
  @Auth()
  adminList(@Query('type') type?: string) {
    return this.prisma.post.findMany({
      where: { type: { in: parseTypes(type) } },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: { id: true, type: true, status: true, title: true, publishedAt: true, updatedAt: true, eventAt: true },
      take: 200,
    });
  }

  @Get('admin/posts/:id')
  @Auth()
  async adminGet(@Param('id', ParseIntPipe) id: number) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Kabar tidak ditemukan');
    return post;
  }

  @Post('admin/posts')
  @Auth()
  @UseInterceptors(FileInterceptor('image', IMAGE_LIMIT))
  async create(@Body() dto: PostDto, @CurrentUser() me: SessionUser, @UploadedFile() image?: Express.Multer.File) {
    const imageUrl = image ? publicUrl(await storeUpload(image, 'image')) : null;
    return this.prisma.post.create({ data: { ...this.fields(dto), imageUrl, authorId: me.id, publishedAt: dto.status === 'PUBLISHED' ? new Date() : null } });
  }

  @Put('admin/posts/:id')
  @Auth()
  @UseInterceptors(FileInterceptor('image', IMAGE_LIMIT))
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: PostDto, @UploadedFile() image?: Express.Multer.File) {
    const old = await this.prisma.post.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Kabar tidak ditemukan');
    let imageUrl = old.imageUrl;
    if (image || dto.removeImage) {
      imageUrl = image ? publicUrl(await storeUpload(image, 'image')) : null;
      await removeUpload(old.imageUrl);
    }
    const publishedAt = dto.status === 'PUBLISHED' ? (old.publishedAt ?? new Date()) : null;
    return this.prisma.post.update({ where: { id }, data: { ...this.fields(dto), imageUrl, publishedAt } });
  }

  @Delete('admin/posts/:id')
  @Auth()
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const post = await this.prisma.post.delete({ where: { id } }).catch(() => null);
    if (!post) throw new NotFoundException('Kabar tidak ditemukan');
    await removeUpload(post.imageUrl);
  }

  private fields(dto: PostDto) {
    const agenda = dto.type === PostType.AGENDA;
    return {
      type: dto.type,
      status: dto.status,
      title: dto.title,
      body: dto.body,
      eventAt: agenda && dto.eventAt ? new Date(dto.eventAt) : null,
      eventPlace: agenda ? (dto.eventPlace ?? null) : null,
      organizer: agenda ? (dto.organizer ?? null) : null,
    };
  }
}
