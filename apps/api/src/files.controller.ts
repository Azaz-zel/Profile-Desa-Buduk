import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { Auth } from './auth';
import { DOC_CATEGORIES, DocumentDto, PhotoDto } from './dto';
import { PrismaService } from './prisma.service';
import { IMAGE_LIMIT, PDF_LIMIT, publicUrl, removeUpload, storeUpload } from './uploads';

/** Foto galeri dan dokumen PDF: keduanya hanya daftar, unggah, dan hapus. */
@Controller()
export class FilesController {
  constructor(private prisma: PrismaService) {}

  @Get('photos')
  photos() {
    return this.prisma.photo.findMany({ orderBy: [{ album: 'asc' }, { createdAt: 'desc' }], take: 500 });
  }

  @Post('admin/photos')
  @Auth()
  @UseInterceptors(FileInterceptor('file', IMAGE_LIMIT))
  async addPhoto(@Body() dto: PhotoDto, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Pilih foto terlebih dahulu');
    return this.prisma.photo.create({ data: { ...dto, url: publicUrl(await storeUpload(file, 'image')) } });
  }

  @Delete('admin/photos/:id')
  @Auth()
  @HttpCode(204)
  async removePhoto(@Param('id', ParseIntPipe) id: number) {
    const photo = await this.prisma.photo.delete({ where: { id } }).catch(() => null);
    if (!photo) throw new NotFoundException('Foto tidak ditemukan');
    await removeUpload(photo.url);
  }

  @Get('documents')
  documents(@Query('category') category?: string, @Query('q') q?: string) {
    const where: Prisma.DocumentWhereInput = {};
    if (category && DOC_CATEGORIES.includes(category)) where.category = category;
    if (q?.trim()) where.title = { contains: q.trim().slice(0, 100) };
    return this.prisma.document.findMany({ where, orderBy: [{ year: 'desc' }, { createdAt: 'desc' }], take: 300 });
  }

  @Post('admin/documents')
  @Auth()
  @UseInterceptors(FileInterceptor('file', PDF_LIMIT))
  async addDocument(@Body() dto: DocumentDto, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Pilih file PDF terlebih dahulu');
    return this.prisma.document.create({ data: { ...dto, fileUrl: publicUrl(await storeUpload(file, 'pdf')) } });
  }

  @Delete('admin/documents/:id')
  @Auth()
  @HttpCode(204)
  async removeDocument(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.prisma.document.delete({ where: { id } }).catch(() => null);
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    await removeUpload(doc.fileUrl);
  }
}
