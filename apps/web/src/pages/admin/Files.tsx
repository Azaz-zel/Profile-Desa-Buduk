import { FormEvent, useState } from 'react';
import { api, Doc, Photo, useLoad } from '../../api';
import { tanggal } from '../../format';
import { DOC_CATEGORIES } from '../../site';
import { Chips, Empty, Load, useFlash, useTitle } from '../../ui';

/** Formulir unggah dengan satu file. Mengembalikan pesan galat atau null. */
function useUpload<T>(path: string, onDone: (row: T) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>, check: (f: FormData) => string | null) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const problem = check(form);
    setError(problem ?? '');
    if (problem) return;
    setBusy(true);
    try {
      onDone(await api<T>(path, { body: form }));
      formEl.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) return <button type="button" className="btn btn-del" onClick={() => setAsking(true)}>Hapus</button>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p style={{ fontWeight: 700, color: 'var(--red)' }}>Hapus {label} dari website?</p>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-red" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); setAsking(false); }}>{busy ? 'Menghapus...' : 'Ya, Hapus'}</button>
        <button type="button" className="btn btn-line" onClick={() => setAsking(false)}>Tidak</button>
      </div>
    </div>
  );
}

const fileOf = (f: FormData) => f.get('file') as File | null;

function Documents() {
  const s = useLoad<Doc[]>('/documents');
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useFlash();
  const [error, setError] = useState('');
  const up = useUpload<Doc>('/admin/documents', (d) => {
    s.setData([d, ...(s.data ?? [])]);
    setOpen(false);
    setFlash('Dokumen sudah diunggah dan tampil di website.');
  });
  const year = new Date().getFullYear();

  const remove = async (d: Doc) => {
    try {
      await api(`/admin/documents/${d.id}`, { method: 'DELETE' });
      s.setData((s.data ?? []).filter((x) => x.id !== d.id));
      setFlash('Dokumen sudah dihapus.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      {!open && <button type="button" className="btn btn-dark" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>Unggah Dokumen Baru</button>}
      {open && (
        <form
          noValidate
          className="box stack"
          style={{ gap: 24, border: '2px solid var(--ink)' }}
          onSubmit={(e) => up.submit(e, (f) => (!fileOf(f)?.size ? 'Pilih file PDF terlebih dahulu.' : String(f.get('title')).trim().length < 5 ? 'Tulis judul dokumen.' : null))}
        >
          <h2 style={{ fontSize: 24 }}>Unggah dokumen baru</h2>
          {up.error && <p role="alert" className="alert alert-t">{up.error}</p>}
          <div className="field"><label htmlFor="d-file">1. Pilih file PDF</label><p id="h-d-file" className="hint">Paling besar 15 MB.</p><input id="d-file" name="file" type="file" accept="application/pdf" className="file" aria-describedby="h-d-file" /></div>
          <div className="field">
            <label htmlFor="d-title">2. Judul dokumen</label>
            <p id="h-d-title" className="hint">Tulis lengkap seperti di dokumennya. Contoh: Peraturan Desa Buduk Nomor 10 Tahun 2025 tentang APBDes 2026</p>
            <input id="d-title" name="title" className="inp" maxLength={300} aria-describedby="h-d-title" />
          </div>
          <div className="g2" style={{ gap: 20 }}>
            <div className="field"><label htmlFor="d-cat">3. Jenis dokumen</label><select id="d-cat" name="category" className="inp">{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label htmlFor="d-year">4. Tahun</label><select id="d-year" name="year" className="inp">{Array.from({ length: 8 }, (_, i) => year - i).map((y) => <option key={y}>{y}</option>)}</select></div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <button type="submit" className="btn btn-dark btn-big" disabled={up.busy}>{up.busy ? 'Sedang mengunggah...' : 'Unggah ke Website'}</button>
            <button type="button" className="btn btn-line btn-big" onClick={() => setOpen(false)}>Batal</button>
          </div>
        </form>
      )}
      {flash}
      {error && <p role="alert" className="alert alert-t">{error}</p>}
      <Load s={s}>
        {(docs) =>
          docs.length === 0 ? <Empty title="Belum ada dokumen" /> : (
            <div className="stack" style={{ gap: 10 }}>
              {docs.map((d) => (
                <div key={d.id} className="item">
                  <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{d.category}, {d.year}</span>
                    <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{d.title}</span>
                    <span className="cap">Diunggah {tanggal(d.createdAt)}</span>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <a className="btn btn-line" href={d.fileUrl} target="_blank" rel="noopener noreferrer">Lihat</a>
                    <DeleteButton label="dokumen ini" onConfirm={() => remove(d)} />
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Load>
    </div>
  );
}

function Photos() {
  const s = useLoad<Photo[]>('/photos');
  const [flash, setFlash] = useFlash();
  const [error, setError] = useState('');
  const up = useUpload<Photo>('/admin/photos', (p) => {
    s.setData([p, ...(s.data ?? [])]);
    setFlash('Foto sudah ditambahkan.');
  });
  const albums = [...new Set((s.data ?? []).map((p) => p.album))];

  const remove = async (p: Photo) => {
    try {
      await api(`/admin/photos/${p.id}`, { method: 'DELETE' });
      s.setData((s.data ?? []).filter((x) => x.id !== p.id));
      setFlash('Foto sudah dihapus.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <form
        noValidate
        className="box stack"
        style={{ gap: 20 }}
        onSubmit={(e) => up.submit(e, (f) => (!fileOf(f)?.size ? 'Pilih foto terlebih dahulu.' : String(f.get('album')).trim().length < 2 ? 'Tulis nama album.' : String(f.get('caption')).trim().length < 2 ? 'Tulis keterangan foto.' : null))}
      >
        <h2 style={{ fontSize: 24 }}>Tambah foto kegiatan</h2>
        {up.error && <p role="alert" className="alert alert-t">{up.error}</p>}
        <div className="field"><label htmlFor="p-file">Foto</label><p id="h-p-file" className="hint">JPG, PNG, atau WEBP, paling besar 5 MB.</p><input id="p-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" className="file" aria-describedby="h-p-file" /></div>
        <div className="g2" style={{ gap: 20 }}>
          <div className="field">
            <label htmlFor="p-album">Nama album</label>
            <input id="p-album" name="album" className="inp" list="albums" maxLength={120} placeholder="Contoh: Pembagian Sembako" />
            <datalist id="albums">{albums.map((a) => <option key={a} value={a} />)}</datalist>
          </div>
          <div className="field"><label htmlFor="p-cap">Keterangan foto</label><input id="p-cap" name="caption" className="inp" maxLength={200} /></div>
        </div>
        <button type="submit" className="btn btn-dark" disabled={up.busy} style={{ alignSelf: 'flex-start' }}>{up.busy ? 'Sedang mengunggah...' : 'Tambah Foto'}</button>
      </form>
      {flash}
      {error && <p role="alert" className="alert alert-t">{error}</p>}
      <Load s={s}>
        {(list) =>
          list.length === 0 ? <Empty title="Belum ada foto" /> : (
            <ul className="cards" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 24 }}>
              {list.map((p) => (
                <li key={p.id} className="stack" style={{ gap: 8 }}>
                  <img className="photo" src={p.url} alt={p.caption} loading="lazy" style={{ aspectRatio: '4 / 3' }} />
                  <span style={{ fontWeight: 700 }}>{p.caption}</span>
                  <span className="cap">Album: {p.album}</span>
                  <DeleteButton label="foto ini" onConfirm={() => remove(p)} />
                </li>
              ))}
            </ul>
          )
        }
      </Load>
    </div>
  );
}

export default function Files() {
  useTitle('Dokumen dan foto');
  const [tab, setTab] = useState<'dok' | 'foto'>('dok');
  return (
    <>
      <div>
        <h1 className="ah1">Dokumen dan foto</h1>
        <p className="mute" style={{ marginTop: 8, fontSize: 19 }}>Dokumen tampil di halaman Dokumen, foto tampil di Kabar Desa bagian Foto.</p>
      </div>
      <Chips label="Ubah:" options={[['dok', 'Dokumen'], ['foto', 'Foto kegiatan']]} value={tab} onChange={setTab} />
      {tab === 'dok' ? <Documents /> : <Photos />}
    </>
  );
}
