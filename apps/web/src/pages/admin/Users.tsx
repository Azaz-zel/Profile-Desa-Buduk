import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, Me, useLoad } from '../../api';
import { Load, useFlash, useTitle } from '../../ui';
import { useMe } from './AdminLayout';

const ROLE = { ADMIN: 'Admin utama', EDITOR: 'Pengelola isi' } as const;

function ResetForm({ u, onDone }: { u: Me; onDone: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password'));
    if (password.length < 10) return setError('Kata sandi minimal 10 karakter.');
    setBusy(true);
    try {
      await api(`/admin/users/${u.id}/password`, { method: 'PUT', body: { password } });
      onDone(`Kata sandi ${u.name} sudah diganti. Berikan kata sandi baru ini kepadanya secara langsung.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="edit" style={{ gridColumn: '1 / -1' }}>
      <div className="field">
        <label htmlFor={`pw-${u.id}`}>Kata sandi baru untuk {u.name}</label>
        <p className="hint">Minimal 10 karakter. Sesi {u.name} yang sedang masuk akan otomatis keluar.</p>
        <input id={`pw-${u.id}`} name="password" type="text" className="inp" autoComplete="new-password" />
        {error && <p className="err">{error}</p>}
      </div>
      <button type="submit" className="btn btn-dark" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Sedang menyimpan...' : 'Simpan Kata Sandi'}</button>
    </form>
  );
}

export default function Users() {
  useTitle('Akun pengguna');
  const me = useMe();
  const s = useLoad<Me[]>('/admin/users');
  const [reset, setReset] = useState<number | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const u = await api<Me>('/admin/users', { body: { username: String(f.get('username')).trim().toLowerCase(), name: String(f.get('name')), role: String(f.get('role')), password: String(f.get('password')) } });
      s.setData([...(s.data ?? []), u]);
      setAdding(false);
      setFlash(`Akun ${u.name} sudah dibuat.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: Me) => {
    setAsking(null);
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      s.setData((s.data ?? []).filter((x) => x.id !== u.id));
      setFlash(`Akun ${u.name} sudah dihapus.`);
    } catch (err) {
      setFlash(`Gagal menghapus: ${(err as Error).message}`);
    }
  };

  return (
    <>
      <div>
        <h1 className="ah1">Akun pengguna</h1>
        <p className="mute" style={{ marginTop: 8, fontSize: 19 }}>Siapa saja yang boleh masuk ke halaman kelola.</p>
      </div>
      <div className="box">
        <p style={{ fontWeight: 700, marginBottom: 6 }}>Ada dua jenis akun:</p>
        <p style={{ lineHeight: 1.7 }}><strong>Admin utama</strong> boleh mengubah semua bagian, termasuk anggaran, data penduduk, profil, dan akun. <strong>Pengelola isi</strong> boleh menulis kabar, mengunggah dokumen dan foto, dan menanggapi pengaduan.</p>
      </div>
      {flash}
      <Load s={s}>
        {(list) => (
          <div className="stack" style={{ gap: 10 }}>
            {list.map((u) => (
              <div key={u.id} className="item" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto' }}>
                <span><strong>{u.name}</strong>{u.id === me.id && <span className="mute"> (Anda)</span>}<br /><span className="mute">Nama pengguna: {u.username}</span></span>
                <span>{ROLE[u.role]}</span>
                {u.id === me.id ? (
                  <span />
                ) : asking === u.id ? (
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>Hapus akun ini?</span>
                    <button type="button" className="btn btn-red" onClick={() => remove(u)}>Ya, Hapus</button>
                    <button type="button" className="btn btn-line" onClick={() => setAsking(null)}>Tidak</button>
                  </div>
                ) : (
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-line" aria-expanded={reset === u.id} onClick={() => setReset(reset === u.id ? null : u.id)}>Buat Ulang Kata Sandi</button>
                    <button type="button" className="btn btn-del" onClick={() => setAsking(u.id)}>Hapus</button>
                  </div>
                )}
                {reset === u.id && <ResetForm u={u} onDone={(m) => { setReset(null); setFlash(m); }} />}
              </div>
            ))}
          </div>
        )}
      </Load>
      {adding ? (
        <form onSubmit={add} noValidate className="edit">
          <p style={{ fontSize: 21, fontWeight: 700 }}>Tambah akun</p>
          {error && <p role="alert" className="err">{error}</p>}
          <div className="g2" style={{ gap: 20 }}>
            <div className="field"><label htmlFor="u-name">Nama lengkap</label><input id="u-name" name="name" className="inp" maxLength={120} /></div>
            <div className="field"><label htmlFor="u-user">Nama pengguna</label><input id="u-user" name="username" className="inp" autoCapitalize="none" maxLength={40} placeholder="Contoh: sutami" /><p className="hint">Huruf kecil, angka, titik. Dipakai untuk masuk.</p></div>
            <div className="field"><label htmlFor="u-role">Jenis akun</label><select id="u-role" name="role" className="inp" defaultValue="EDITOR"><option value="EDITOR">Pengelola isi</option><option value="ADMIN">Admin utama</option></select></div>
            <div className="field"><label htmlFor="u-pw">Kata sandi awal</label><input id="u-pw" name="password" type="text" className="inp" autoComplete="new-password" /><p className="hint">Minimal 10 karakter. Minta pemilik akun menggantinya setelah masuk.</p></div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <button type="submit" className="btn btn-dark" disabled={busy}>{busy ? 'Sedang menyimpan...' : 'Buat Akun'}</button>
            <button type="button" className="btn btn-line" onClick={() => setAdding(false)}>Batal</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-dark" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}>Tambah Akun</button>
      )}
    </>
  );
}

export function ChangePassword() {
  useTitle('Ganti kata sandi');
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const [oldPassword, newPassword, again] = ['old', 'new', 'again'].map((k) => String(f.get(k)));
    if (newPassword.length < 10) return setError('Kata sandi baru minimal 10 karakter.');
    if (newPassword !== again) return setError('Ulangi kata sandi baru dengan sama persis.');
    setBusy(true);
    setError('');
    try {
      await api('/auth/password', { body: { oldPassword, newPassword } });
      nav('/kelola/masuk', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h1 className="ah1">Ganti kata sandi</h1>
      <form onSubmit={submit} noValidate className="box stack" style={{ gap: 20, maxWidth: 560 }}>
        {error && <p role="alert" className="alert alert-t">{error}</p>}
        <div className="field"><label htmlFor="pw-old">Kata sandi sekarang</label><input id="pw-old" name="old" type="password" className="inp" autoComplete="current-password" /></div>
        <div className="field"><label htmlFor="pw-new">Kata sandi baru</label><p className="hint">Minimal 10 karakter. Boleh berupa kalimat, misalnya “sawah hijau di buduk”.</p><input id="pw-new" name="new" type="password" className="inp" autoComplete="new-password" /></div>
        <div className="field"><label htmlFor="pw-again">Ulangi kata sandi baru</label><input id="pw-again" name="again" type="password" className="inp" autoComplete="new-password" /></div>
        <button type="submit" className="btn btn-dark btn-big" disabled={busy}>{busy ? 'Sedang menyimpan...' : 'Ganti Kata Sandi'}</button>
        <p className="hint">Setelah diganti, Anda perlu masuk lagi dengan kata sandi baru.</p>
      </form>
    </>
  );
}
