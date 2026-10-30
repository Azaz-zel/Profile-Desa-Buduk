import { execSync } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// harus diatur sebelum aplikasi dimuat
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'mysql://root@localhost:3306/desa_buduk_test';
process.env.JWT_SECRET = 'test-secret-yang-panjangnya-lebih-dari-32-karakter';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'up-'));
process.env.PRIVATE_UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'priv-'));
process.env.WEB_DIST = join(tmpdir(), 'tidak-ada');
// tiap login memakai IP palsu berbeda supaya batas 5x/menit tidak saling mengganggu antar-tes
process.env.TRUST_PROXY = '1';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule, configureApp } from '../src/app';
import { hashPassword } from '../src/auth';
import { PrismaService } from '../src/prisma.service';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5b70000000049454e44ae426082', 'hex');

let app: INestApplication;
let prisma: PrismaService;
let adminCookie: string;
let editorCookie: string;

let ipSeq = 1;
async function login(username: string, password: string, ip = `10.0.0.${ipSeq++}`) {
  const res = await request(app.getHttpServer()).post('/api/auth/login').set('X-Forwarded-For', ip).send({ username, password });
  return { res, cookie: (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0]?.split(';')[0] ?? '' };
}

beforeAll(async () => {
  execSync('npx prisma db push --skip-generate', { env: process.env, stdio: 'ignore' });
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication();
  configureApp(app);
  await app.init();
  prisma = app.get(PrismaService);
  // database khusus tes (desa_buduk_test), dikosongkan tiap kali tes jalan
  for (const t of ['report', 'post', 'photo', 'document', 'official', 'budgetLine', 'setting', 'user'] as const) {
    await (prisma[t] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
  }
  await prisma.user.createMany({
    data: [
      { username: 'admin', name: 'Admin', role: 'ADMIN', passwordHash: await hashPassword('rahasia-admin-1') },
      { username: 'editor', name: 'Editor', role: 'EDITOR', passwordHash: await hashPassword('rahasia-editor-1') },
    ],
  });
  adminCookie = (await login('admin', 'rahasia-admin-1')).cookie;
  editorCookie = (await login('editor', 'rahasia-editor-1')).cookie;
}, 60_000);

afterAll(async () => {
  await app?.close();
});

describe('masuk dan hak akses', () => {
  it('menolak kata sandi salah dengan pesan yang sama seperti pengguna tidak ada', async () => {
    const a = await login('admin', 'salah');
    const b = await login('tidakada', 'salah');
    expect(a.res.status).toBe(401);
    expect(b.res.status).toBe(401);
    expect(a.res.body.message).toBe(b.res.body.message);
  });

  it('cookie sesi httpOnly dan SameSite=Strict', async () => {
    const { res } = await login('admin', 'rahasia-admin-1');
    const raw = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Strict/i);
  });

  it('menu admin butuh sesi', async () => {
    await request(app.getHttpServer()).get('/api/admin/reports').expect(401);
    await request(app.getHttpServer()).get('/api/admin/reports').set('Cookie', 'sid=palsu').expect(401);
  });

  it('pengelola isi tidak boleh mengubah anggaran atau akun', async () => {
    await request(app.getHttpServer()).put('/api/admin/budget/2026').set('Cookie', editorCookie).send({ lines: [] }).expect(403);
    await request(app.getHttpServer()).get('/api/admin/users').set('Cookie', editorCookie).expect(403);
    await request(app.getHttpServer()).get('/api/admin/users').set('Cookie', adminCookie).expect(200);
  });

  it('daftar akun tidak membocorkan hash kata sandi', async () => {
    const res = await request(app.getHttpServer()).get('/api/admin/users').set('Cookie', adminCookie).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('scrypt');
  });

  it('reset kata sandi akun yang tidak ada memberi 404, bukan 500', async () => {
    await request(app.getHttpServer()).put('/api/admin/users/999999/password').set('Cookie', adminCookie).send({ password: 'kata-sandi-baru-1' }).expect(404);
  });

  it('reset kata sandi memutus sesi lama', async () => {
    await prisma.user.create({ data: { username: 'tamu', name: 'Tamu', role: 'EDITOR', passwordHash: await hashPassword('kata-sandi-lama') } });
    const { cookie } = await login('tamu', 'kata-sandi-lama');
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(200);
    const tamu = await prisma.user.findUniqueOrThrow({ where: { username: 'tamu' } });
    await request(app.getHttpServer()).put(`/api/admin/users/${tamu.id}/password`).set('Cookie', adminCookie).send({ password: 'kata-sandi-baru-1' }).expect(204);
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });
});

describe('pengaduan warga', () => {
  let code = '';

  it('menolak isian tidak lengkap dengan pesan berbahasa Indonesia', async () => {
    const res = await request(app.getHttpServer()).post('/api/reports').field('type', 'PENGADUAN').field('body', 'pendek').field('name', 'Wayan').field('phone', '123').field('banjar', 'Banjar Kaja');
    expect(res.status).toBe(400);
    expect(res.body.message.join(' ')).toMatch(/minimal 15 huruf/);
  });

  it('menolak file yang bukan foto walau namanya .jpg', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reports')
      .field('type', 'PENGADUAN').field('body', 'Lampu jalan mati sejak dua minggu.').field('name', 'Wayan').field('phone', '0812 3456 7890').field('banjar', 'Banjar Kaja')
      .attach('photo', Buffer.from('<script>alert(1)</script>'), { filename: 'foto.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('menerima laporan dan memberi kode acak', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reports')
      .field('type', 'PENGADUAN').field('body', 'Lampu jalan mati di Jl. Wahyu Graha sejak dua minggu.').field('name', 'Wayan').field('phone', '0812 3456 7890').field('banjar', 'Banjar Kaja')
      .attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);
    code = res.body.code;
    expect(code).toMatch(/^ADU-[A-Z0-9]{5}$/);
    const saved = await prisma.report.findUniqueOrThrow({ where: { code } });
    expect(saved.phone).toBe('081234567890');
  });

  it('cek pakai kode memberi detail, cek pakai nomor hanya kode dan status', async () => {
    const byCode = await request(app.getHttpServer()).get('/api/reports/status').query({ q: code.toLowerCase() }).expect(200);
    expect(byCode.body.report.summary).toContain('Lampu jalan mati');
    const byPhone = await request(app.getHttpServer()).get('/api/reports/status').query({ q: '0812-3456-7890' }).expect(200);
    expect(byPhone.body.reports[0]).toEqual({ code: code.slice(0, 6) + '***', status: 'BARU', createdAt: expect.any(String) });
    expect(JSON.stringify(byPhone.body)).not.toContain('Lampu');
    await request(app.getHttpServer()).get('/api/reports/status').query({ q: 'ADU-ZZZZZ' }).expect(404);
  });

  it('foto laporan tidak bisa dibuka publik, hanya lewat admin', async () => {
    const r = await prisma.report.findUniqueOrThrow({ where: { code } });
    await request(app.getHttpServer()).get(`/uploads/${r.photoFile}`).expect(404);
    await request(app.getHttpServer()).get(`/api/admin/reports/${r.id}/photo`).expect(401);
    await request(app.getHttpServer()).get(`/api/admin/reports/${r.id}/photo`).set('Cookie', editorCookie).expect(200);
  });

  it('petugas mengubah status dan balasan, warga bisa melihatnya', async () => {
    const r = await prisma.report.findUniqueOrThrow({ where: { code } });
    await request(app.getHttpServer()).patch(`/api/admin/reports/${r.id}`).set('Cookie', editorCookie).send({ status: 'DIKERJAKAN', reply: 'Sudah dilaporkan ke PLN.' }).expect(200);
    const res = await request(app.getHttpServer()).get('/api/reports/status').query({ q: code }).expect(200);
    expect(res.body.report).toMatchObject({ status: 'DIKERJAKAN', reply: 'Sudah dilaporkan ke PLN.' });
    expect(res.body.report.readAt).not.toBeNull();
  });
});

describe('kabar desa', () => {
  it('draf tidak tampil untuk publik', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/posts').set('Cookie', editorCookie)
      .field('type', 'BERITA').field('status', 'DRAFT').field('title', 'Kerja bakti saluran air').field('body', '<img src=x onerror=alert(1)> Kerja bakti membersihkan saluran air di semua banjar.')
      .expect(201);
    await request(app.getHttpServer()).get(`/api/posts/${res.body.id}`).expect(404);
    const list = await request(app.getHttpServer()).get('/api/posts').expect(200);
    expect(list.body.total).toBe(0);
  });

  it('terbit, lalu muncul di daftar publik', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/admin/posts').set('Cookie', adminCookie)
      .field('type', 'PENGUMUMAN').field('status', 'PUBLISHED').field('title', 'Lelang pembangunan TPS 3R').field('body', 'Pengumuman lelang pembangunan TPS 3R untuk Desa Buduk.')
      .attach('image', PNG, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);
    expect(created.body.imageUrl).toMatch(/^\/uploads\/[0-9a-f]{32}\.png$/);
    await request(app.getHttpServer()).get(created.body.imageUrl).expect(200).expect('x-content-type-options', 'nosniff');
    const list = await request(app.getHttpServer()).get('/api/posts').query({ q: 'tps' }).expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('menolak field tambahan (mis. authorId) dari luar', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/posts').set('Cookie', editorCookie)
      .field('type', 'BERITA').field('status', 'DRAFT').field('title', 'Judul yang cukup panjang').field('body', 'Isi kabar yang cukup panjang untuk lolos validasi.').field('authorId', '1')
      .expect(400);
  });
});

describe('anggaran', () => {
  it('admin menyimpan anggaran, angka besar tetap utuh', async () => {
    await request(app.getHttpServer())
      .put('/api/admin/budget/2026').set('Cookie', adminCookie)
      .send({ lines: [{ category: 'PENDAPATAN', label: 'Bagi hasil pajak', planned: '19132718816', realized: '10863559948' }] })
      .expect(200);
    const res = await request(app.getHttpServer()).get('/api/budget').expect(200);
    expect(res.body.lines[0]).toMatchObject({ planned: 19132718816, realized: 10863559948 });
  });

  it('menolak angka berisi titik atau huruf', async () => {
    await request(app.getHttpServer())
      .put('/api/admin/budget/2026').set('Cookie', adminCookie)
      .send({ lines: [{ category: 'PENDAPATAN', label: 'Bunga', planned: '40.000.000', realized: '1e9' }] })
      .expect(400);
  });
});

describe('dokumen', () => {
  it('hanya menerima PDF asli', async () => {
    await request(app.getHttpServer()).post('/api/admin/documents').set('Cookie', editorCookie)
      .field('title', 'Perdes APBDes 2026').field('category', 'Peraturan desa').field('year', '2026')
      .attach('file', PNG, { filename: 'perdes.pdf', contentType: 'application/pdf' }).expect(400);
    await request(app.getHttpServer()).post('/api/admin/documents').set('Cookie', editorCookie)
      .field('title', 'Perdes APBDes 2026').field('category', 'Peraturan desa').field('year', '2026')
      .attach('file', Buffer.from('%PDF-1.4\n%test\n'), { filename: 'perdes.pdf', contentType: 'application/pdf' }).expect(201);
  });
});

describe('pembatasan percobaan masuk', () => {
  it('memblokir setelah 5 kali gagal dalam satu menit', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await login('editor', 'salah-terus', '10.9.9.9')).res.status);
    expect(codes).toContain(429);
  });
});
