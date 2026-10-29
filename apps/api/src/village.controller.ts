import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { Auth } from './auth';
import { BudgetDto, OfficialDto, PopulationDto, ProfileDto } from './dto';
import { PrismaService } from './prisma.service';
import { IMAGE_LIMIT, publicUrl, removeUpload, storeUpload } from './uploads';

const EMPTY_PROFILE = { vision: '', missions: [] as string[], history: '', greeting: '' };
const EMPTY_POPULATION = { male: 0, female: 0, religion: [], occupation: [], education: [], age: [] };

/** Profil desa, perangkat, penduduk, dan anggaran (APBDes). */
@Controller()
export class VillageController {
  constructor(private prisma: PrismaService) {}

  private async setting<T>(key: string, fallback: T) {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return { ...(row ? (row.value as T) : fallback), updatedAt: row?.updatedAt ?? null };
  }

  private save(key: string, value: object) {
    const json = JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    return this.prisma.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
  }

  // ---------- publik ----------

  @Get('profile')
  async profile() {
    const [profile, officials] = await Promise.all([
      this.setting('profile', EMPTY_PROFILE),
      this.prisma.official.findMany({ orderBy: [{ group: 'asc' }, { sort: 'asc' }, { id: 'asc' }] }),
    ]);
    return { profile, officials };
  }

  @Get('population')
  population() {
    return this.setting('population', EMPTY_POPULATION);
  }

  @Get('budget')
  async budget(@Query('year') yearRaw?: string) {
    const years = (await this.prisma.budgetLine.findMany({ distinct: ['year'], select: { year: true }, orderBy: { year: 'desc' } })).map((r) => r.year);
    const asked = Number.parseInt(yearRaw ?? '', 10);
    const year = years.includes(asked) ? asked : (years[0] ?? new Date().getFullYear());
    const lines = await this.prisma.budgetLine.findMany({ where: { year }, orderBy: [{ category: 'asc' }, { sort: 'asc' }] });
    const meta = await this.setting<{ asOf?: string }>(`budget-${year}`, {});
    return {
      years, year, updatedAt: meta.updatedAt,
      // nilai rupiah < 10^15 masih aman sebagai number di JavaScript
      lines: lines.map((l) => ({ category: l.category, label: l.label, planned: Number(l.planned), realized: Number(l.realized) })),
    };
  }

  // ---------- admin ----------

  @Get('admin/summary')
  @Auth()
  async summary() {
    const [newReports, docRequests, recent, budget] = await Promise.all([
      this.prisma.report.count({ where: { status: 'BARU' } }),
      this.prisma.report.count({ where: { type: 'DOKUMEN', status: { not: 'SELESAI' } } }),
      this.prisma.post.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, title: true, type: true, status: true, updatedAt: true } }),
      this.prisma.setting.findFirst({ where: { key: { startsWith: 'budget-' } }, orderBy: { updatedAt: 'desc' } }),
    ]);
    const oldestNew = await this.prisma.report.findFirst({ where: { status: 'BARU' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
    return { newReports, docRequests, oldestNew: oldestNew?.createdAt ?? null, budgetUpdatedAt: budget?.updatedAt ?? null, recent };
  }

  @Put('admin/profile')
  @Auth('ADMIN')
  async saveProfile(@Body() dto: ProfileDto) {
    await this.save('profile', { ...dto, missions: dto.missions.map((m) => m.trim()).filter(Boolean) });
    return this.setting('profile', EMPTY_PROFILE);
  }

  @Put('admin/population')
  @Auth('ADMIN')
  async savePopulation(@Body() dto: PopulationDto) {
    await this.save('population', dto);
    return this.setting('population', EMPTY_POPULATION);
  }

  @Put('admin/budget/:year')
  @Auth('ADMIN')
  async saveBudget(@Param('year', ParseIntPipe) year: number, @Body() dto: BudgetDto) {
    await this.prisma.$transaction([
      this.prisma.budgetLine.deleteMany({ where: { year } }),
      this.prisma.budgetLine.createMany({
        data: dto.lines.map((l, i) => ({ year, category: l.category, label: l.label, planned: BigInt(l.planned), realized: BigInt(l.realized), sort: i })),
      }),
    ]);
    await this.save(`budget-${year}`, { savedAt: new Date().toISOString() });
    return this.budget(String(year));
  }

  @Get('admin/officials')
  @Auth()
  officials() {
    return this.prisma.official.findMany({ orderBy: [{ group: 'asc' }, { sort: 'asc' }, { id: 'asc' }] });
  }

  @Post('admin/officials')
  @Auth('ADMIN')
  @UseInterceptors(FileInterceptor('photo', IMAGE_LIMIT))
  async addOfficial(@Body() dto: OfficialDto, @UploadedFile() photo?: Express.Multer.File) {
    const photoUrl = photo ? publicUrl(await storeUpload(photo, 'image')) : null;
    return this.prisma.official.create({ data: { ...dto, photoUrl } });
  }

  @Put('admin/officials/:id')
  @Auth('ADMIN')
  @UseInterceptors(FileInterceptor('photo', IMAGE_LIMIT))
  async updateOfficial(@Param('id', ParseIntPipe) id: number, @Body() dto: OfficialDto, @UploadedFile() photo?: Express.Multer.File) {
    const old = await this.prisma.official.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Perangkat tidak ditemukan');
    let photoUrl = old.photoUrl;
    if (photo) {
      photoUrl = publicUrl(await storeUpload(photo, 'image'));
      await removeUpload(old.photoUrl);
    }
    return this.prisma.official.update({ where: { id }, data: { ...dto, photoUrl } });
  }

  @Delete('admin/officials/:id')
  @Auth('ADMIN')
  @HttpCode(204)
  async removeOfficial(@Param('id', ParseIntPipe) id: number) {
    const o = await this.prisma.official.delete({ where: { id } }).catch(() => null);
    if (!o) throw new NotFoundException('Perangkat tidak ditemukan');
    await removeUpload(o.photoUrl);
  }
}
