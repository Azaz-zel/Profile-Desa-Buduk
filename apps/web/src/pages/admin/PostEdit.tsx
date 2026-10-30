import { FormEvent, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, PostFull, PostType, useLoad } from '../../api';
import { Load, useTitle } from '../../ui';

const JENIS: [PostType, string][] = [['BERITA', 'Berita'], ['PENGUMUMAN', 'Pengumuman'], ['AGENDA', 'Jadwal kegiatan']];
const TAB = { BERITA: 'berita', PENGUMUMAN: 'pengumuman', AGENDA: 'agenda' } as const;

// <input type="datetime-local"> butuh waktu lokal tanpa zona
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function Form({ post }: { post?: PostFull }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [type, setType] = useState<PostType>(post?.type ?? (JENIS.find(([k]) => k === params.get('jenis'))?.[0] || 'BERITA'));
  const [title, setTitle] = useState(post?.title ?? '');
  const [errors, setErrors] = useState<{ title?: string; body?: string; eventAt?: string }>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: number; published: boolean } | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const save = async (e: FormEvent<HTMLFormElement>, status: 'PUBLISHED' | 'DRAFT') => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const errs: typeof errors = {};
    if (String(form.get('title')).trim().length < 8) errs.title = 'Tulis judul, minimal 8 huruf.';
    if (String(form.get('body')).trim().length < 30) errs.body = 'Isi kabar terlalu pendek, minimal satu atau dua kalimat.';
    if (type === 'AGENDA' && !form.get('eventAt')) errs.eventAt = 'Isi tanggal dan jam kegiatan.';
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return requestAnimationFrame(() => topRef.current?.focus());

    form.set('type', type);
    form.delete('jenis');
    form.set('status', status);
    const image = form.get('image') as File | null;
    if (image && !image.size) form.delete('image');
    if (removeImage) form.set('removeImage', '1');
    const at = String(form.get('eventAt') ?? '');
    if (at) form.set('eventAt', new Date(at).toISOString());
    else form.delete('eventAt');
    if (type !== 'AGENDA') ['eventPlace', 'organizer'].forEach((k) => form.delete(k));

    setBusy(true);
    try {
      const saved = await api<PostFull & { id: number }>(post ? `/admin/posts/${post.id}` : '/admin/posts', { method: post ? 'PUT' : 'POST', body: form });
      setDone({ id: saved.id, published: status === 'PUBLISHED' });
      window.scrollTo(0, 0);
    } catch (err) {
      setServerError((err as Error).message);
      requestAnimationFrame(() => topRef.current?.focus());
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div role="status" className="box stack" style={{ gap: 14, alignItems: 'flex-start', maxWidth: 720, borderTop: '6px solid var(--green)' }}>
        <p style={{ fontSize: 24, fontWeight: 700 }}>{done.published ? 'Kabar sudah tampil di website' : 'Draf tersimpan, belum tampil di website'}</p>
        <p className="mute">“{title}”</p>
        <div className="row" style={{ gap: 12 }}>
          {done.published && <a className="btn btn-dark" href={`/kabar/${done.id}`} target="_blank" rel="noopener noreferrer">Lihat di Website</a>}
          <button type="button" className="btn btn-line" onClick={() => nav('/kelola/kabar')}>Kembali ke Daftar Kabar</button>
        </div>
      </div>
    );

  const errList = Object.values(errors).filter(Boolean);
  return (
    <form onSubmit={(e) => save(e, (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'DRAFT' ? 'DRAFT' : 'PUBLISHED')} noValidate className="stack" style={{ gap: 32, maxWidth: 820 }}>
      {(errList.length > 0 || serverError) && (
        <div ref={topRef} tabIndex={-1} role="alert" className="alert">
          <p className="alert-t">{serverError || 'Belum bisa disimpan. Lengkapi dulu isian yang ditandai merah.'}</p>
        </div>
      )}
      <fieldset className="field">
        <legend style={{ fontSize: 19, marginBottom: 8 }}>1. Jenis kabar</legend>
        <div className="opts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {JENIS.map(([k, label]) => (
            <label key={k} className="opt" style={{ alignItems: 'center' }}>
              <input type="radio" name="jenis" checked={type === k} onChange={() => setType(k)} />
              <span style={{ fontWeight: 700 }}>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="judul" style={{ fontSize: 19 }}>2. Judul</label>
        <p id="h-judul" className="hint">Singkat dan jelas, seperti judul di koran. Contoh: Pembagian BLT Dana Desa tahap 3</p>
        <input id="judul" name="title" className="inp" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? 'h-judul e-judul' : 'h-judul'} />
        {errors.title && <p id="e-judul" className="err">{errors.title}</p>}
      </div>

      {type === 'AGENDA' && (
        <fieldset className="field" style={{ gap: 16 }}>
          <legend style={{ fontSize: 19, marginBottom: 8 }}>Kapan dan di mana?</legend>
          <div className="g3" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="waktu" style={{ fontSize: 17 }}>Tanggal dan jam</label>
              <input id="waktu" name="eventAt" type="datetime-local" className="inp" defaultValue={toLocalInput(post?.eventAt ?? null)} aria-invalid={errors.eventAt ? true : undefined} aria-describedby={errors.eventAt ? 'e-waktu' : undefined} />
              {errors.eventAt && <p id="e-waktu" className="err">{errors.eventAt}</p>}
            </div>
            <div className="field"><label htmlFor="tempat" style={{ fontSize: 17 }}>Tempat</label><input id="tempat" name="eventPlace" className="inp" maxLength={200} placeholder="Kantor Perbekel" defaultValue={post?.eventPlace ?? ''} /></div>
            <div className="field"><label htmlFor="penyelenggara" style={{ fontSize: 17 }}>Penyelenggara</label><input id="penyelenggara" name="organizer" className="inp" maxLength={200} defaultValue={post?.organizer ?? ''} /></div>
          </div>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="f-isi" style={{ fontSize: 19 }}>3. Isi kabar</label>
        <p id="h-isi" className="hint">Tulis seperti biasa. Tekan Enter dua kali untuk membuat paragraf baru.</p>
        <textarea id="f-isi" name="body" className="inp" style={{ minHeight: 280 }} maxLength={50000} defaultValue={post?.body ?? ''} aria-invalid={errors.body ? true : undefined} aria-describedby={errors.body ? 'h-isi e-isi' : 'h-isi'} />
        {errors.body && <p id="e-isi" className="err">{errors.body}</p>}
      </div>

      <div className="field">
        <label htmlFor="foto" style={{ fontSize: 19 }}>4. Foto <span className="mute" style={{ fontWeight: 400 }}>(boleh dikosongkan)</span></label>
        {post?.imageUrl && !removeImage && (
          <div className="row" style={{ gap: 16, alignItems: 'flex-end' }}>
            <img src={post.imageUrl} alt="Foto saat ini" style={{ width: 200, border: '1px solid var(--line)' }} />
            <button type="button" className="btn btn-del" onClick={() => setRemoveImage(true)}>Hapus Foto Ini</button>
          </div>
        )}
        <p id="h-foto" className="hint">{post?.imageUrl ? 'Pilih foto baru untuk mengganti. ' : ''}JPG, PNG, atau WEBP, paling besar 5 MB. Foto mendatar lebih bagus.</p>
        <input id="foto" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="file" aria-describedby="h-foto" />
      </div>

      <div className="stack" style={{ gap: 12, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
        <div className="row" style={{ gap: 12 }}>
          <button type="submit" className="btn btn-dark btn-big" disabled={busy} value="PUBLISHED">{busy ? 'Sedang menyimpan...' : 'Terbitkan ke Website'}</button>
          <button type="submit" className="btn btn-line btn-big" disabled={busy} value="DRAFT">Simpan sebagai Draf</button>
        </div>
        <p className="hint">Draf tidak tampil di website. Anda bisa melanjutkannya nanti dari daftar kabar.</p>
      </div>
    </form>
  );
}

export default function PostEdit() {
  const { id } = useParams();
  const isNew = id === 'baru';
  useTitle(isNew ? 'Tulis kabar baru' : 'Ubah kabar');
  const s = useLoad<PostFull>(isNew ? null : `/admin/posts/${Number(id) || 0}`);
  return (
    <>
      <div>
        <Link to="/kelola/kabar" className="more" style={{ fontWeight: 600 }}>Kembali ke daftar kabar</Link>
        <h1 className="ah1" style={{ marginTop: 8 }}>{isNew ? 'Tulis kabar baru' : 'Ubah kabar'}</h1>
        {!isNew && s.data && <p className="mute" style={{ marginTop: 6 }}>Lihat <Link to={`/kabar?tab=${TAB[s.data.type]}`} target="_blank">daftar di website</Link></p>}
      </div>
      {isNew ? <Form /> : <Load s={s}>{(p) => <Form post={p} />}</Load>}
    </>
  );
}
