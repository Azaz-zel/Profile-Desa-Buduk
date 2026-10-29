const tz = { timeZone: 'Asia/Makassar' } as const; // Bali (WITA)

export const tanggal = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { ...tz, day: '2-digit', month: 'long', year: 'numeric' }) : '';
export const tanggalHari = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { ...tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { ...tz, hour: '2-digit', minute: '2-digit' });
export const angka = (n: number) => n.toLocaleString('id-ID');
export const rupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID');
export const miliar = (n: number) =>
  'Rp' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' miliar';
export const persen = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
export const inisial = (nama: string) =>
  nama.replace(/^(I|Ni|A\.A\.|Anak Agung|Ida Bagus)\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
