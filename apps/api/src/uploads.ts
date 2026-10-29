import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';

export const PUBLIC_DIR = resolve(process.env.UPLOAD_DIR ?? 'uploads');
export const PRIVATE_DIR = resolve(process.env.PRIVATE_UPLOAD_DIR ?? 'private-uploads');

const MB = 1024 * 1024;
export const IMAGE_LIMIT = { limits: { fileSize: 5 * MB, files: 1 } };
export const PDF_LIMIT = { limits: { fileSize: 15 * MB, files: 1 } };

// cek isi file (magic bytes), bukan nama atau mimetype kiriman browser yang bisa dipalsukan
function detect(buf: Buffer): 'jpg' | 'png' | 'webp' | 'pdf' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'pdf';
  return null;
}

/** Simpan file upload setelah dicek jenisnya. Mengembalikan nama file acak. */
export async function storeUpload(file: Express.Multer.File, kind: 'image' | 'pdf', where: 'public' | 'private' = 'public') {
  const ext = detect(file.buffer);
  const ok = kind === 'pdf' ? ext === 'pdf' : ext === 'jpg' || ext === 'png' || ext === 'webp';
  if (!ok) throw new BadRequestException(kind === 'pdf' ? 'File harus berupa PDF' : 'Foto harus berupa JPG, PNG, atau WEBP');
  const dir = where === 'public' ? PUBLIC_DIR : PRIVATE_DIR;
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  await writeFile(join(dir, name), file.buffer);
  return name;
}

export const publicUrl = (name: string) => `/uploads/${name}`;

/** Hapus file milik kita saja; URL dari luar (misal data awal) diabaikan. */
export async function removeUpload(url: string | null | undefined) {
  if (!url?.startsWith('/uploads/')) return;
  await unlink(join(PUBLIC_DIR, basename(url))).catch(() => undefined);
}
