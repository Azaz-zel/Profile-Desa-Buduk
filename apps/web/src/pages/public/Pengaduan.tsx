import { FormEvent, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, ReportStatus, ReportType, STATUS_LABEL } from '../../api';
import { tanggal, tanggalHari } from '../../format';
import { BANJAR, SITE } from '../../site';
import { useTitle } from '../../ui';

const JENIS: [ReportType, string, string][] = [
  ['PENGADUAN', 'Melaporkan masalah', 'Jalan rusak, lampu mati, sampah, atau pelayanan kantor.'],
  ['DOKUMEN', 'Meminta dokumen desa', 'Salinan peraturan, laporan anggaran, atau data desa.'],
  ['USULAN', 'Memberi usulan', 'Ide atau saran untuk pembangunan desa.'],
];

type Errors = Partial<Record<'body' | 'name' | 'phone' | 'banjar', string>>;
const waOk = (v: string) => /^(08|628)[0-9]{8,12}$/.test(v.replace(/[^0-9]/g, ''));

function validate(f: FormData): Errors {
  const e: Errors = {};
  if (String(f.get('body')).trim().length < 15) e.body = 'Ceritakan sedikit lebih panjang, minimal 15 huruf.';
  if (String(f.get('name')).trim().length < 3) e.name = 'Tulis nama lengkap Anda.';
  if (!waOk(String(f.get('phone')))) e.phone = 'Nomor WhatsApp diawali 08, contoh 0812 3456 7890.';
  if (!f.get('banjar')) e.banjar = 'Pilih banjar tempat tinggal Anda.';
  return e;
}

interface Detail { code: string; status: ReportStatus; banjar: string; summary: string; reply: string | null; createdAt: string; readAt: string | null; doneAt: string | null }
type StatusResult = { kind: 'detail'; report: Detail } | { kind: 'list'; reports: { code: string; status: ReportStatus; createdAt: string }[] };

function CekLaporan({ initial }: { initial?: string }) {
  const [q, setQ] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<StatusResult | null>(null);

  const cek = async (value = q) => {
    setResult(null);
    if (!value.trim()) return setError('Ketik kode laporan atau nomor WhatsApp terlebih dahulu.');
    setError('');
    setBusy(true);
    try {
      setResult(await api<StatusResult>(`/reports/status?q=${encodeURIComponent(value.trim())}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const r = result?.kind === 'detail' ? result.report : null;
  const steps: [string, boolean, string | null][] = r
    ? [['Diterima', true, r.createdAt], ['Dibaca petugas', !!r.readAt, r.readAt], ['Sedang dikerjakan', r.status === 'DIKERJAKAN' || r.status === 'SELESAI', null], ['Selesai', r.status === 'SELESAI', r.doneAt]]
    : [];
  const nowIdx = r ? { BARU: 0, DIBACA: 1, DIKERJAKAN: 2, SELESAI: 3 }[r.status] : -1;

  return (
    <aside id="cek-laporan" aria-labelledby="h-cek" className="box stack" style={{ gap: 20 }}>
      <h2 id="h-cek" style={{ fontSize: 26 }}>Cek laporan saya</h2>
      <form onSubmit={(e) => { e.preventDefault(); cek(); }} noValidate className="field">
        <label htmlFor="kode">Kode laporan atau nomor WhatsApp</label>
        <input id="kode" className="inp" autoComplete="off" placeholder="ADU-7K3QP atau 0812..." value={q} onChange={(e) => setQ(e.target.value)} aria-describedby="kode-hint kode-msg" />
        <p id="kode-hint" className="hint">Lupa kode? Ketik saja nomor WhatsApp yang Anda pakai saat melapor.</p>
        <button type="submit" className="btn btn-dark" disabled={busy} style={{ width: '100%' }}>{busy ? 'Sedang mencari...' : 'Cek Laporan'}</button>
      </form>
      <div id="kode-msg" aria-live="polite">
        {error && (
          <div className="alert" style={{ borderWidth: 2 }}>
            <p className="alert-t">{error}</p>
            <p style={{ fontSize: 17, marginTop: 4 }}>Butuh bantuan? Telepon kantor desa di <a href={SITE.phoneHref}>{SITE.phone}</a>.</p>
          </div>
        )}
        {result?.kind === 'list' && (
          <div className="stack" style={{ gap: 12 }}>
            <p>Laporan dengan nomor ini:</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', borderBottom: '1px solid var(--line)' }}>
              {result.reports.map((x, i) => (
                <li key={i} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
                  <strong>{STATUS_LABEL[x.status]}</strong>
                  <br /><span className="cap">Dikirim {tanggal(x.createdAt)}, kode {x.code}</span>
                </li>
              ))}
            </ul>
            <p className="hint">Untuk membaca pesan petugas, ketik kode laporan lengkap. Kode dikirim saat Anda melapor.</p>
          </div>
        )}
        {r && (
          <div className="stack" style={{ gap: 20 }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>{r.summary}</p>
              <p className="cap" style={{ marginTop: 4 }}>{r.code}, {r.banjar}</p>
            </div>
            <ol className="steps">
              {steps.map(([label, done, at], i) => (
                <li key={label}>
                  <span aria-hidden="true" className={i === nowIdx && i < 3 ? 'dot dot-now' : done ? 'dot dot-done' : 'dot'} />
                  <div>
                    <p style={{ fontWeight: 700, color: i === nowIdx ? 'var(--green)' : done ? 'var(--ink)' : 'var(--mute)' }}>{label}{i === nowIdx && ' (sekarang)'}</p>
                    {at && <p className="cap">{tanggalHari(at)}</p>}
                    {i === nowIdx && r.reply && <p style={{ marginTop: 4, lineHeight: 1.55 }}>Pesan petugas: “{r.reply}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function Pengaduan() {
  useTitle('Pengaduan Warga');
  const [params] = useSearchParams();
  const [jenis, setJenis] = useState<ReportType>((JENIS.find(([k]) => k === params.get('jenis'))?.[0]) ?? 'PENGADUAN');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; name: string; phone: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set('type', jenis);
    form.delete('jenis');
    const photo = form.get('photo') as File | null;
    if (photo && !photo.size) form.delete('photo');
    const errs = validate(form);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const { code } = await api<{ code: string }>('/reports', { body: form });
      setDone({ code, name: String(form.get('name')).trim(), phone: String(form.get('phone')).trim() });
      window.scrollTo(0, 0);
    } catch (err) {
      setServerError((err as Error).message);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setBusy(false);
    }
  };

  const errList = Object.entries(errors) as [keyof Errors, string][];
  const inv = (k: keyof Errors) => (errors[k] ? true : undefined);

  return (
    <div className="wrap page">
      <nav aria-label="Lokasi halaman" className="crumb"><Link to="/">Beranda</Link> <span className="mute">/ Pengaduan</span></nav>
      <h1 className="h1" style={{ fontSize: 48 }}>Sampaikan ke pemerintah desa</h1>
      <p className="lead" style={{ margin: '16px 0 12px', maxWidth: '58ch' }}>Tidak perlu daftar akun. Setelah terkirim, Anda mendapat kode laporan untuk memantau tindak lanjutnya.</p>
      <p style={{ marginBottom: 48 }}>Lebih mudah lewat chat? <a href={SITE.waHref} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>Kirim WhatsApp ke {SITE.wa}</a></p>

      <div className="side">
        <section aria-label="Formulir laporan" style={{ minWidth: 0 }}>
          {done ? (
            <div role="status" className="box stack" style={{ gap: 16, alignItems: 'flex-start', borderTop: '6px solid var(--green)' }}>
              <p style={{ fontSize: 19, fontWeight: 700, color: 'var(--green)' }}>Laporan sudah terkirim</p>
              <p style={{ fontSize: 28, lineHeight: 1.3, fontWeight: 700 }}>Terima kasih, {done.name}.</p>
              <p style={{ lineHeight: 1.65, maxWidth: '50ch' }}>Catat atau foto kode di bawah ini. Dengan kode ini, atau nomor WhatsApp {done.phone}, Anda bisa mengecek perkembangan laporan.</p>
              <div style={{ border: '2px dashed var(--ink)', padding: '16px 24px', margin: '8px 0' }}>
                <p className="mute" style={{ fontSize: 17 }}>Kode laporan</p>
                <p style={{ fontSize: 36, fontWeight: 700, letterSpacing: '0.04em' }}>{done.code}</p>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <button type="button" className="btn btn-dark" onClick={() => setDone(null)}>Kirim Laporan Lain</button>
                <Link className="btn btn-line" to="/">Kembali ke Beranda</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="stack" style={{ gap: 32 }}>
              {(errList.length > 0 || serverError) && (
                <div ref={summaryRef} tabIndex={-1} role="alert" className="alert">
                  <p className="alert-t" style={{ fontSize: 19, marginBottom: 8 }}>{serverError ? 'Laporan belum terkirim' : `Ada ${errList.length} isian yang belum benar`}</p>
                  {serverError ? <p>{serverError}</p> : (
                    <ul style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7 }}>
                      {errList.map(([k, m]) => <li key={k}><a href={`#f-${k}`} style={{ color: 'var(--red-dark)', fontWeight: 600 }}>{m}</a></li>)}
                    </ul>
                  )}
                </div>
              )}

              <fieldset className="field">
                <legend style={{ marginBottom: 8 }}>1. Anda ingin apa?</legend>
                <div className="opts">
                  {JENIS.map(([k, label, hint]) => (
                    <label key={k} className="opt">
                      <input type="radio" name="jenis" checked={jenis === k} onChange={() => setJenis(k)} />
                      <span className="stack"><span style={{ fontWeight: 700 }}>{label}</span><span className="mute" style={{ fontSize: 17 }}>{hint}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <label htmlFor="f-body">2. Ceritakan apa yang terjadi</label>
                <p id="h-body" className="hint">Apa masalahnya, di mana, dan sejak kapan. Tulis seperti bercerita ke petugas.</p>
                <textarea id="f-body" name="body" className="inp" maxLength={5000} aria-invalid={inv('body')} aria-describedby={errors.body ? 'h-body e-body' : 'h-body'} />
                {errors.body && <p id="e-body" className="err">{errors.body}</p>}
              </div>

              <div className="field">
                <label htmlFor="f-photo">Foto <span className="mute" style={{ fontWeight: 400 }}>(boleh dikosongkan)</span></label>
                <p id="h-photo" className="hint">Foto dari HP bisa langsung dipilih. JPG atau PNG, paling besar 5 MB.</p>
                <input id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="file" aria-describedby="h-photo" />
              </div>

              <fieldset className="field" style={{ gap: 20 }}>
                <legend style={{ marginBottom: 4 }}>3. Data diri Anda</legend>
                <div className="field">
                  <label htmlFor="f-name">Nama lengkap</label>
                  <input id="f-name" name="name" className="inp" autoComplete="name" maxLength={120} aria-invalid={inv('name')} aria-describedby={errors.name ? 'e-name' : undefined} />
                  {errors.name && <p id="e-name" className="err">{errors.name}</p>}
                </div>
                <div className="g2" style={{ gap: 24 }}>
                  <div className="field">
                    <label htmlFor="f-phone">Nomor WhatsApp</label>
                    <input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="inp" placeholder="Contoh: 0812 3456 7890" aria-invalid={inv('phone')} aria-describedby={errors.phone ? 'h-phone e-phone' : 'h-phone'} />
                    <p id="h-phone" className="hint">Untuk mengabari Anda. Tidak ditampilkan ke umum.</p>
                    {errors.phone && <p id="e-phone" className="err">{errors.phone}</p>}
                  </div>
                  <div className="field">
                    <label htmlFor="f-banjar">Banjar</label>
                    <select id="f-banjar" name="banjar" className="inp" defaultValue="" aria-invalid={inv('banjar')} aria-describedby={errors.banjar ? 'e-banjar' : undefined}>
                      <option value="">Pilih banjar Anda</option>
                      {BANJAR.map((b) => <option key={b}>{b}</option>)}
                    </select>
                    {errors.banjar && <p id="e-banjar" className="err">{errors.banjar}</p>}
                  </div>
                </div>
              </fieldset>

              <div className="stack" style={{ gap: 12, paddingTop: 24, borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
                <button type="submit" className="btn btn-dark btn-big full-s" disabled={busy}>{busy ? 'Sedang mengirim...' : 'Kirim Laporan'}</button>
                <p className="hint">Laporan dibaca petugas pada hari dan jam kerja.</p>
              </div>
            </form>
          )}
        </section>
        <CekLaporan initial={done?.code} key={done?.code} />
      </div>
    </div>
  );
}
