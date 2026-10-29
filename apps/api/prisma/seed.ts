/**
 * Data awal dari website lama buduk.desa.id (diambil 30 Oktober 2026).
 * Aman dijalankan ulang: hanya mengisi tabel yang masih kosong.
 */
import { BudgetCategory, OfficialGroup, PostStatus, PostType, PrismaClient } from '@prisma/client';
import { copyFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';
import { hashPassword } from '../src/auth';
import { PUBLIC_DIR } from '../src/uploads';
import berita from './seed-data/berita.json';
import sejarah from './seed-data/sejarah.json';

const prisma = new PrismaClient();
const ASSETS = resolve(__dirname, '../seed-assets');

async function asset(file: string) {
  await mkdir(PUBLIC_DIR, { recursive: true });
  await copyFile(join(ASSETS, file), join(PUBLIC_DIR, file));
  return `/uploads/${file}`;
}

const OFFICIALS: [string, string, OfficialGroup, string?][] = [
  ['I Ketut Wira Adi Atmaja', 'Perbekel', 'PERANGKAT', 'aparaturdesa_1734410806.webp'],
  ['I Wayan Sudarsana', 'Sekretaris Desa', 'PERANGKAT', 'aparaturdesa_1733534727.webp'],
  ['I Gede Sumiastika', 'Kasi Pemerintahan', 'PERANGKAT', 'aparaturdesa_1733534750.webp'],
  ['A.A. Sagung Amy Paramita, S.E.', 'Kasi Pelayanan', 'PERANGKAT', 'aparaturdesa_1733534832.webp'],
  ['I Nyoman Muratni', 'Kasi Kesejahteraan', 'PERANGKAT', 'aparaturdesa_1733534889.webp'],
  ['Ni Luh Sutami', 'Kaur Keuangan', 'PERANGKAT', 'aparaturdesa_1733534772.webp'],
  ['I Putu Gede Ari Suadnyana, S.E.', 'Kaur Umum dan Tata Usaha', 'PERANGKAT', 'aparaturdesa_1733534799.webp'],
  ['I Wayan Putra Irawan, S.Ars., M.T.', 'Kaur Perencanaan', 'PERANGKAT', 'aparaturdesa_1759208388.webp'],
  ['I Gusti Rai Tirta', 'Kelian Banjar Kaja', 'KELIAN'],
  ['I Nyoman Edy Raharja, S.E.', 'Kelian Banjar Tengah', 'KELIAN'],
  ['I Ketut Suardana, S.T.', 'Kelian Banjar Tampak Kerep', 'KELIAN'],
  ['I Ketut Miasa', 'Kelian Banjar Sengguan', 'KELIAN'],
  ['I Gede Agus Suryadarma, S.Ag.', 'Kelian Banjar Pasekan', 'KELIAN'],
  ['I Gede Widnyana', 'Kelian Banjar Umategal', 'KELIAN'],
  ['I Putu Verianto', 'Kelian Banjar Umacandi', 'KELIAN'],
  ['I Made Astra Wijaya', 'Kelian Banjar Umakepuh', 'KELIAN'],
  ['I Nyoman Triyudi Suara, S.Sos.', 'Kelian Banjar Gunung', 'KELIAN'],
  ['I Gede Edy Santika, S.E.', 'Kelian Banjar Dinas Bernasi', 'KELIAN'],
  ...[
    'Valentina Ni Wayan Arniti Yanti', 'Anak Agung Putu Wira Arsa', 'Kadek Yudy Setiawan, S.E.', 'I Made Selamet Wiyasa',
    'Kadek Yudik Antara, S.Ag.', 'Made Satria Hendra Nugraha, S.T.', 'Kadek Sinta Rusmala Dewi, A.Md.K.G.',
    'Komang Adi Wira Antara Putra, S.M.', 'I Gede Artana', 'Putu Claudia Regina Putri, S.Ak.', 'I Agus Rai Gita Prasatya',
    'Ida Bagus Made Dwilingga Darpita Manuaba',
  ].map((n): [string, string, OfficialGroup] => [n, 'Staf', 'STAF']),
];

const BUDGET_2026: [BudgetCategory, string, number, number][] = [
  ['PENDAPATAN', 'Bagi hasil pajak dan retribusi daerah', 19132718816, 10863559948],
  ['PENDAPATAN', 'Alokasi Dana Desa (ADD)', 839678412, 632120645],
  ['PENDAPATAN', 'Dana Desa dari pemerintah pusat', 373456000, 373456000],
  ['PENDAPATAN', 'Bantuan keuangan Provinsi Bali', 126600000, 105300000],
  ['PENDAPATAN', 'Pendapatan asli desa lainnya', 50000000, 89666874],
  ['PENDAPATAN', 'Bunga bank', 40000000, 41593020],
  ['PENDAPATAN', 'Bagi hasil BUMDes', 33086667, 53684072],
  ['BELANJA', 'Pembangunan desa', 10521338719, 6682132691],
  ['BELANJA', 'Pembinaan kemasyarakatan', 7095408836, 1917950250],
  ['BELANJA', 'Penyelenggaraan pemerintahan desa', 5674898859, 3865281467],
  ['BELANJA', 'Pemberdayaan masyarakat', 544169660, 226169600],
  ['BELANJA', 'Penanggulangan bencana dan keadaan darurat', 488426849, 109956000],
  ['PEMBIAYAAN', 'Sisa bagi hasil pajak dan retribusi daerah', 2219009390, 2219009390],
  ['PEMBIAYAAN', 'Sisa Alokasi Dana Desa', 1184873307, 1184873307],
  ['PEMBIAYAAN', 'Sisa pendapatan asli desa', 155622993, 155622993],
  ['PEMBIAYAAN', 'Sisa pendapatan lain-lain', 90274398, 90274398],
  ['PEMBIAYAAN', 'Sisa bantuan keuangan kabupaten', 37956000, 37956000],
  ['PEMBIAYAAN', 'Sisa Dana Desa', 35073840, 35073840],
  ['PEMBIAYAAN', 'Sisa bantuan keuangan provinsi', 5893100, 5893100],
];

// tanggal terbit dan jenis tiap berita lama (id = nomor berita di website lama)
const POST_META: Record<number, [string, PostType]> = {
  208: ['2026-10-28', 'BERITA'], 207: ['2026-10-06', 'BERITA'], 203: ['2026-07-07', 'BERITA'], 202: ['2026-06-29', 'BERITA'],
  201: ['2026-06-15', 'BERITA'], 199: ['2026-06-08', 'BERITA'], 209: ['2026-08-20', 'PENGUMUMAN'], 194: ['2026-03-31', 'PENGUMUMAN'],
  189: ['2026-01-19', 'PENGUMUMAN'], 161: ['2025-09-10', 'PENGUMUMAN'], 119: ['2025-01-16', 'PENGUMUMAN'],
};
const POST_IMAGES = new Set(['berita_1793163067', 'berita_1793084744', 'berita_1783395119', 'berita_1782716193', 'berita_1781843365', 'berita_1780884612', 'berita_1793253894']);

const AGENDA: [string, string, string, string][] = [
  ['2025-02-07T09:00:00+08:00', 'Musyawarah BPD tentang laporan pertanggungjawaban realisasi anggaran', 'Kantor Perbekel Desa Buduk', 'BPD Desa Buduk'],
  ['2025-02-03T09:00:00+08:00', 'Pra-Musrenbang Kecamatan', 'Ruang Rapat Negara Bhakti, Kantor Camat Mengwi', 'Camat Mengwi'],
  ['2025-01-31T09:00:00+08:00', 'Rapat koordinasi Lomba Desa tahun 2025', 'Kantor Perbekel Desa Buduk', 'Kasi Pemerintahan'],
  ['2025-01-13T09:00:00+08:00', 'Musyawarah desa tentang BLT Dana Desa tahun 2025', 'Kantor Perbekel Desa Buduk', 'BPD'],
  ['2024-12-27T09:00:00+08:00', 'Musyawarah BPD penetapan rancangan Perdes APBDes 2025', 'Kantor Perbekel Desa Buduk', 'Perbekel Buduk'],
  ['2024-12-19T09:00:00+08:00', 'Penyaluran bantuan sosial PKH dan sembako', 'Kantor Cabang Pembantu Sempidi', 'Dinas Sosial Kabupaten Badung'],
  ['2024-12-18T09:00:00+08:00', 'Layanan Samsat Keliling', 'Halaman Parkir Pasar Desa Adat Buduk', 'Badan Pendapatan Daerah Provinsi Bali'],
];

async function main() {
  if ((await prisma.user.count()) === 0) {
    const username = (process.env.SEED_ADMIN_USER ?? 'admin').toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');
    await prisma.user.create({ data: { username, name: 'Admin Utama', role: 'ADMIN', passwordHash: await hashPassword(password) } });
    console.log(`Akun admin dibuat: ${username}${process.env.SEED_ADMIN_PASSWORD ? '' : ` / ${password} (segera ganti)`}`);
  }

  if ((await prisma.official.count()) === 0) {
    for (const [i, [name, position, group, photo]] of OFFICIALS.entries()) {
      await prisma.official.create({ data: { name, position, group, sort: i, photoUrl: photo ? await asset(photo) : null } });
    }
  }

  if (!(await prisma.setting.findUnique({ where: { key: 'profile' } }))) {
    await prisma.setting.create({
      data: {
        key: 'profile',
        value: {
          vision: 'Terwujudnya Desa Buduk yang Menyama, Menuju Lebih Nyaman dan Maju',
          missions: [
            'Mewujudkan pemerintahan desa dalam pelaksanaan pelayanan dan pembangunan berdasarkan Tri Hita Karana.',
            'Mewujudkan pemerintahan desa dengan tata kelola yang efektif, efisien, transparan, akuntabel, dan optimal, serta memberikan pelayanan publik yang ramah dan beretika.',
            'Meningkatkan sinergi antara pemerintah desa dengan lembaga desa, lembaga adat, dan lembaga lain yang ada di Desa Buduk.',
            'Mewujudkan pengelolaan kebersihan lingkungan, terutama mewujudkan TPST Desa Buduk.',
          ],
          history: sejarah.history,
          greeting: '',
        },
      },
    });
  }

  if (!(await prisma.setting.findUnique({ where: { key: 'population' } }))) {
    await prisma.setting.create({
      data: {
        key: 'population',
        value: {
          male: 4754, female: 4821,
          religion: [{ label: 'Hindu', n: 7549 }, { label: 'Kristen', n: 1046 }, { label: 'Islam', n: 568 }, { label: 'Katolik', n: 393 }, { label: 'Buddha', n: 19 }],
          occupation: [
            { label: 'Karyawan swasta', n: 2623 }, { label: 'Belum/tidak bekerja', n: 2238 }, { label: 'Pelajar/mahasiswa', n: 2023 },
            { label: 'Mengurus rumah tangga', n: 822 }, { label: 'Pengusaha kecil menengah', n: 516 }, { label: 'Petani/pekebun', n: 317 },
          ],
          education: [
            { label: 'SLTA/sederajat', n: 3107 }, { label: 'Tidak/belum sekolah', n: 1360 }, { label: 'Tamat SD/sederajat', n: 1173 },
            { label: 'SLTP/sederajat', n: 1111 }, { label: 'Sarjana (S1/D4)', n: 962 }, { label: 'Belum tamat SD', n: 919 },
            { label: 'Diploma I/II', n: 328 }, { label: 'Akademi/Diploma III', n: 231 }, { label: 'Sedang TK', n: 249 },
            { label: 'Strata II', n: 77 }, { label: 'Tidak tamat SD', n: 34 }, { label: 'Strata III', n: 8 },
          ],
          // data umur di website lama rusak (9.497 orang tercatat 66 tahun ke atas), jadi dikosongkan sampai diperbaiki
          age: [],
        },
      },
    });
  }

  if ((await prisma.budgetLine.count()) === 0) {
    await prisma.budgetLine.createMany({
      data: BUDGET_2026.map(([category, label, planned, realized], sort) => ({ year: 2026, category, label, planned: BigInt(planned), realized: BigInt(realized), sort })),
    });
    await prisma.setting.upsert({ where: { key: 'budget-2026' }, create: { key: 'budget-2026', value: { asOf: '2026-10-13' } }, update: {} });
  }

  if ((await prisma.post.count()) === 0) {
    for (const b of berita as { id: number; img: string; title: string; body: string }[]) {
      const [date, type] = POST_META[b.id] ?? ['2026-01-01', 'BERITA'];
      await prisma.post.create({
        data: {
          type, status: PostStatus.PUBLISHED, title: b.title, body: b.body || b.title,
          imageUrl: POST_IMAGES.has(b.img) ? await asset(`${b.img}.webp`) : null,
          publishedAt: new Date(`${date}T09:00:00+08:00`),
        },
      });
    }
    for (const [at, title, place, org] of AGENDA) {
      await prisma.post.create({
        data: { type: 'AGENDA', status: 'PUBLISHED', title, body: title, eventAt: new Date(at), eventPlace: place, organizer: org, publishedAt: new Date(at) },
      });
    }
  }

  if ((await prisma.photo.count()) === 0) {
    await prisma.photo.createMany({
      data: [
        { album: 'Pembagian Sembako', caption: 'Pembagian sembako kepada warga', url: await asset('sembako.jpeg') },
        { album: 'Pembagian Sembako', caption: 'Pembagian sembako bagi wanita rawan sosial ekonomi (WRSE)', url: await asset('berita_1781843365.webp') },
      ],
    });
  }
}

main()
  .then(() => console.log('Data awal selesai diisi'))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
