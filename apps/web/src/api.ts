import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const FRIENDLY: Record<number, string> = {
  401: 'Sesi sudah berakhir, silakan masuk lagi.',
  403: 'Menu ini khusus admin utama.',
  413: 'File terlalu besar.',
  429: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
};

/** Panggil API. Body FormData dikirim apa adanya (untuk unggah file), objek lain dikirim sebagai JSON. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      credentials: 'same-origin',
      headers: opts.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: isForm ? (opts.body as FormData) : opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Tidak bisa terhubung. Periksa koneksi internet lalu coba lagi.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new ApiError(res.status, (res.status !== 401 && res.status !== 403 && msg) || FRIENDLY[res.status] || msg || 'Terjadi kesalahan. Coba lagi beberapa saat.');
  }
  return data as T;
}

/** Ambil data saat halaman dibuka, lengkap dengan status memuat dan gagal. */
export function useLoad<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!path });
  const reload = useCallback(() => {
    if (!path) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    api<T>(path)
      .then((data) => alive && setState({ data, loading: false }))
      .catch((e: Error) => alive && setState({ error: e.message, loading: false }));
    return () => {
      alive = false;
    };
  }, [path]);
  useEffect(() => reload(), [reload]);
  return { ...state, reload, setData: (data: T) => setState({ data, loading: false }) };
}

// bentuk data dari API
export type PostType = 'BERITA' | 'PENGUMUMAN' | 'AGENDA';
export interface PostSummary { id: number; type: PostType; title: string; imageUrl: string | null; publishedAt: string | null; eventAt: string | null; eventPlace: string | null; organizer: string | null }
export interface PostFull extends PostSummary { body: string; status?: 'DRAFT' | 'PUBLISHED' }
export interface Page<T> { items: T[]; total: number; page: number; pages: number }
export interface Count { label: string; n: number }
export interface Population { male: number; female: number; religion: Count[]; occupation: Count[]; education: Count[]; age: Count[]; updatedAt: string | null }
export type BudgetCategory = 'PENDAPATAN' | 'BELANJA' | 'PEMBIAYAAN';
export interface BudgetLine { category: BudgetCategory; label: string; planned: number; realized: number }
export interface Budget { years: number[]; year: number; updatedAt: string | null; lines: BudgetLine[] }
export interface Official { id: number; name: string; position: string; group: 'PERANGKAT' | 'KELIAN' | 'STAF'; photoUrl: string | null; sort: number }
export interface Profile { vision: string; missions: string[]; history: string; greeting: string; updatedAt: string | null }
export interface Doc { id: number; title: string; category: string; year: number; fileUrl: string; createdAt: string }
export interface Photo { id: number; album: string; caption: string; url: string }
export type ReportStatus = 'BARU' | 'DIBACA' | 'DIKERJAKAN' | 'SELESAI';
export type ReportType = 'PENGADUAN' | 'DOKUMEN' | 'USULAN';
export const STATUS_LABEL: Record<ReportStatus, string> = { BARU: 'Menunggu dibaca petugas', DIBACA: 'Sudah dibaca petugas', DIKERJAKAN: 'Sedang dikerjakan', SELESAI: 'Selesai' };
export interface Me { id: number; username: string; name: string; role: 'ADMIN' | 'EDITOR' }
