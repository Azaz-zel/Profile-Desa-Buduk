import { FormEvent, useState } from 'react';
import { api, Official, Profile, useLoad } from '../../api';
import { inisial } from '../../format';
import { Chips, Load, useFlash, useTitle } from '../../ui';

const GROUPS: [Official['group'], string][] = [['PERANGKAT', 'Perangkat desa'], ['KELIAN', 'Kelian banjar'], ['STAF', 'Staf']];

function OfficialForm({ o, onDone, onCancel }: { o?: Official; onDone: (o: Official) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (String(f.get('name')).trim().length < 3 || String(f.get('position')).trim().length < 2) return setError('Isi nama dan jabatan.');
    const photo = f.get('photo') as File | null;
    if (photo && !photo.size) f.delete('photo');
    setBusy(true);
    setError('');
    try {
      onDone(await api<Official>(o ? `/admin/officials/${o.id}` : '/admin/officials', { method: o ? 'PUT' : 'POST', body: f }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const id = o?.id ?? 'baru';
  return (
    <form onSubmit={submit} noValidate className="edit">
      <p style={{ fontSize: 21, fontWeight: 700 }}>{o ? `Ubah data ${o.name}` : 'Tambah perangkat baru'}</p>
      {error && <p role="alert" className="err">{error}</p>}
      <div className="g2" style={{ gap: 20 }}>
        <div className="field"><label htmlFor={`nm-${id}`}>Nama lengkap dan gelar</label><input id={`nm-${id}`} name="name" className="inp" maxLength={120} defaultValue={o?.name} /></div>
        <div className="field"><label htmlFor={`jb-${id}`}>Jabatan</label><input id={`jb-${id}`} name="position" className="inp" maxLength={120} defaultValue={o?.position} placeholder="Contoh: Kelian Banjar Kaja" /></div>
        <div className="field"><label htmlFor={`gr-${id}`}>Kelompok</label><select id={`gr-${id}`} name="group" className="inp" defaultValue={o?.group ?? 'PERANGKAT'}>{GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor={`ur-${id}`}>Urutan tampil</label><input id={`ur-${id}`} name="sort" type="number" min={0} max={999} className="inp" defaultValue={o?.sort ?? 99} /><p className="hint">Angka kecil tampil lebih dulu.</p></div>
      </div>
      <div className="field"><label htmlFor={`ft-${id}`}>{o?.photoUrl ? 'Ganti foto' : 'Foto'} <span className="mute" style={{ fontWeight: 400 }}>(boleh dikosongkan)</span></label><input id={`ft-${id}`} name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="file" /></div>
      <div className="row" style={{ gap: 12 }}>
        <button type="submit" className="btn btn-dark" disabled={busy}>{busy ? 'Sedang menyimpan...' : 'Simpan'}</button>
        <button type="button" className="btn btn-line" onClick={onCancel}>Batal</button>
      </div>
    </form>
  );
}

function Officials() {
  const s = useLoad<Official[]>('/admin/officials');
  const [editing, setEditing] = useState<number | 'baru' | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const [flash, setFlash] = useFlash();
  const sortList = (l: Official[]) => [...l].sort((a, b) => GROUPS.findIndex(([g]) => g === a.group) - GROUPS.findIndex(([g]) => g === b.group) || a.sort - b.sort || a.id - b.id);
  const done = (o: Official) => {
    const list = s.data ?? [];
    s.setData(sortList(list.some((x) => x.id === o.id) ? list.map((x) => (x.id === o.id ? o : x)) : [...list, o]));
    setEditing(null);
    setFlash('Tersimpan. Website sudah diperbarui.');
  };
  const remove = async (o: Official) => {
    setAsking(null);
    try {
      await api(`/admin/officials/${o.id}`, { method: 'DELETE' });
      s.setData((s.data ?? []).filter((x) => x.id !== o.id));
      setFlash(`${o.name} sudah dihapus.`);
    } catch (err) {
      setFlash(`Gagal menghapus: ${(err as Error).message}`);
    }
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
        <p className="mute">Urutan di bawah sama dengan urutan tampil di website.</p>
        <button type="button" className="btn btn-dark" onClick={() => setEditing('baru')}>Tambah Perangkat</button>
      </div>
      {flash}
      {editing === 'baru' && <OfficialForm onDone={done} onCancel={() => setEditing(null)} />}
      <Load s={s}>
        {(list) =>
          GROUPS.map(([g, label]) => (
            <section key={g} className="stack" style={{ gap: 10, marginTop: 16 }} aria-label={label}>
              <h2 style={{ fontSize: 22 }}>{label}</h2>
              {list.filter((o) => o.group === g).map((o) =>
                editing === o.id ? (
                  <OfficialForm key={o.id} o={o} onDone={done} onCancel={() => setEditing(null)} />
                ) : (
                  <div key={o.id} className="item" style={{ gridTemplateColumns: '64px minmax(0, 1fr) auto' }}>
                    {o.photoUrl ? <img src={o.photoUrl} alt="" width={64} height={64} style={{ objectFit: 'cover', objectPosition: 'top', aspectRatio: '1' }} /> : <span className="initials" style={{ aspectRatio: '1', fontSize: 20, width: 64 }} aria-hidden="true">{inisial(o.name)}</span>}
                    <div className="stack" style={{ minWidth: 0 }}><span style={{ fontWeight: 700, lineHeight: 1.4 }}>{o.name}</span><span className="mute">{o.position}</span></div>
                    {asking === o.id ? (
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--red)' }}>Hapus?</span>
                        <button type="button" className="btn btn-red" onClick={() => remove(o)}>Ya, Hapus</button>
                        <button type="button" className="btn btn-line" onClick={() => setAsking(null)}>Tidak</button>
                      </div>
                    ) : (
                      <div className="row" style={{ gap: 8 }}>
                        <button type="button" className="btn btn-line" onClick={() => setEditing(o.id)}>Ubah</button>
                        <button type="button" className="btn btn-del" onClick={() => setAsking(o.id)}>Hapus</button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </section>
          ))
        }
      </Load>
    </div>
  );
}

function ProfileText() {
  const s = useLoad<{ profile: Profile }>('/profile');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    try {
      await api('/admin/profile', {
        method: 'PUT',
        body: {
          vision: String(f.get('vision')),
          missions: String(f.get('missions')).split('\n').map((m) => m.trim()).filter(Boolean),
          history: String(f.get('history')),
          greeting: String(f.get('greeting')),
        },
      });
      setMsg({ ok: true, text: 'Tersimpan. Halaman Profil sudah diperbarui.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Load s={s}>
      {({ profile: p }) => (
        <form onSubmit={save} className="stack" style={{ gap: 24 }}>
          <div className="field"><label htmlFor="visi">Visi</label><textarea id="visi" name="vision" className="inp" style={{ minHeight: 90 }} maxLength={500} defaultValue={p.vision} /></div>
          <div className="field"><label htmlFor="misi">Misi</label><p id="h-misi" className="hint">Satu misi per baris.</p><textarea id="misi" name="missions" className="inp" maxLength={20000} aria-describedby="h-misi" defaultValue={p.missions.join('\n')} /></div>
          <div className="field"><label htmlFor="sambutan">Sambutan perbekel <span className="mute" style={{ fontWeight: 400 }}>(boleh dikosongkan)</span></label><p id="h-sambutan" className="hint">Dua sampai tiga kalimat, tampil di samping foto perbekel.</p><textarea id="sambutan" name="greeting" className="inp" style={{ minHeight: 110 }} maxLength={2000} aria-describedby="h-sambutan" defaultValue={p.greeting} /></div>
          <div className="field"><label htmlFor="sejarah">Sejarah desa</label><p id="h-sejarah" className="hint">Pisahkan paragraf dengan baris kosong.</p><textarea id="sejarah" name="history" className="inp" style={{ minHeight: 320 }} maxLength={30000} aria-describedby="h-sejarah" defaultValue={p.history} /></div>
          <div className="row" style={{ gap: 16 }}>
            <button type="submit" className="btn btn-dark btn-big" disabled={busy}>{busy ? 'Sedang menyimpan...' : 'Simpan Perubahan'}</button>
            {msg && <p role={msg.ok ? 'status' : 'alert'} style={{ fontWeight: 700, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</p>}
          </div>
        </form>
      )}
    </Load>
  );
}

export default function ProfileEdit() {
  useTitle('Profil dan perangkat');
  const [tab, setTab] = useState<'orang' | 'teks'>('orang');
  return (
    <>
      <div>
        <h1 className="ah1">Profil dan perangkat</h1>
        <p className="mute" style={{ marginTop: 8, fontSize: 19 }}>Ubah data perangkat desa, kelian banjar, dan teks di halaman Profil.</p>
      </div>
      <Chips label="Ubah:" options={[['orang', 'Perangkat dan kelian'], ['teks', 'Visi, misi, sejarah']]} value={tab} onChange={setTab} />
      {tab === 'orang' ? <Officials /> : <ProfileText />}
    </>
  );
}
