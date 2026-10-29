import {
  BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma, ReportStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { randomInt } from 'crypto';
import type { Response } from 'express';
import { join } from 'path';
import { Auth } from './auth';
import { ReportDto, ReportUpdateDto } from './dto';
import { PrismaService } from './prisma.service';
import { IMAGE_LIMIT, PRIVATE_DIR, storeUpload } from './uploads';

// tanpa huruf/angka yang mirip (0/O, 1/I/L) supaya mudah dibacakan lewat telepon
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// kode acak (bukan nomor urut) agar orang lain tidak bisa menebak kode laporan tetangganya
const newCode = () => 'ADU-' + Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const CODE_RE = /^ADU-[A-Z0-9]{5}$/;

export const summarize = (body: string) => {
  const first = body.split(/[.\n]/)[0].trim();
  return first.length > 70 ? first.slice(0, 67).trimEnd() + '...' : first;
};

@Controller()
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  @Post('reports')
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @UseInterceptors(FileInterceptor('photo', IMAGE_LIMIT))
  async submit(@Body() dto: ReportDto, @UploadedFile() photo?: Express.Multer.File) {
    const photoFile = photo ? await storeUpload(photo, 'image', 'private') : null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const r = await this.prisma.report.create({ data: { ...dto, photoFile, code: newCode() } });
        return { code: r.code };
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new Error('Gagal membuat kode laporan');
  }

  /** Warga cek laporan pakai kode atau nomor WhatsApp. Lewat nomor hanya keluar kode dan status, tanpa isi. */
  @Get('reports/status')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async status(@Query('q') raw = '') {
    const q = raw.trim().toUpperCase();
    if (CODE_RE.test(q)) {
      const r = await this.prisma.report.findUnique({ where: { code: q } });
      if (!r) throw new NotFoundException('Laporan tidak ditemukan');
      return {
        kind: 'detail',
        report: { code: r.code, type: r.type, status: r.status, banjar: r.banjar, summary: summarize(r.body), reply: r.reply, createdAt: r.createdAt, readAt: r.readAt, doneAt: r.doneAt },
      };
    }
    const digits = q.replace(/[^0-9]/g, '');
    if (/^(08|628)[0-9]{8,12}$/.test(digits)) {
      const list = await this.prisma.report.findMany({
        where: { phone: digits }, orderBy: { createdAt: 'desc' }, take: 10,
        select: { code: true, status: true, createdAt: true },
      });
      if (!list.length) throw new NotFoundException('Laporan tidak ditemukan');
      // nomor HP orang lain mudah diketahui, jadi kode disamarkan: isi laporan tetap hanya bisa dibuka dengan kode lengkap
      return { kind: 'list', reports: list.map((r) => ({ ...r, code: r.code.slice(0, 6) + '***' })) };
    }
    throw new BadRequestException('Ketik kode laporan (contoh ADU-7K3QP) atau nomor WhatsApp');
  }

  @Get('admin/reports')
  @Auth()
  async adminList(@Query('status') status?: string) {
    const where: Prisma.ReportWhereInput = {};
    if (status && status in ReportStatus) where.status = status as ReportStatus;
    const rows = await this.prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map(({ photoFile, ...r }) => ({ ...r, summary: summarize(r.body), hasPhoto: !!photoFile }));
  }

  @Patch('admin/reports/:id')
  @Auth()
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: ReportUpdateDto) {
    const old = await this.prisma.report.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Laporan tidak ditemukan');
    const now = new Date();
    const { photoFile, ...r } = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        reply: dto.reply ?? old.reply,
        readAt: dto.status !== 'BARU' ? (old.readAt ?? now) : old.readAt,
        doneAt: dto.status === 'SELESAI' ? (old.doneAt ?? now) : null,
      },
    });
    return { ...r, summary: summarize(r.body), hasPhoto: !!photoFile };
  }

  @Get('admin/reports/:id/photo')
  @Auth()
  async photo(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const r = await this.prisma.report.findUnique({ where: { id }, select: { photoFile: true } });
    if (!r?.photoFile) throw new NotFoundException('Tidak ada foto');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(join(PRIVATE_DIR, r.photoFile));
  }
}
