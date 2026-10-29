import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { api } from '../../api';
import { useTitle } from '../../ui';

export default function Login() {
  useTitle('Masuk');
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<{ u?: boolean; p?: boolean }>({});

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = String(f.get('username')).trim();
    const password = String(f.get('password'));
    setMissing({ u: !username, p: !password });
    setError('');
    if (!username || !password) return;
    setBusy(true);
    try {
      await api('/auth/login', { body: { username, password } });
      nav(from?.startsWith('/kelola') ? from : '/kelola', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 16px' }}>
      <div className="stack" style={{ width: '100%', maxWidth: 480, gap: 28 }}>
        <div className="row" style={{ gap: 14 }}>
          <img src="/logo.png" alt="Logo Desa Buduk" width={48} height={48} />
          <div className="stack" style={{ lineHeight: 1.3 }}>
            <span style={{ fontSize: 21, fontWeight: 700 }}>Desa Buduk</span>
            <span className="mute" style={{ fontSize: 17 }}>Halaman pengelola website</span>
          </div>
        </div>
        <main id="isi" className="box" style={{ borderTop: '6px solid var(--green)' }}>
          <form onSubmit={submit} noValidate className="stack" style={{ gap: 24 }}>
            <div>
              <h1 style={{ fontSize: 32, lineHeight: 1.2 }}>Masuk</h1>
              <p className="mute" style={{ marginTop: 8 }}>Khusus perangkat desa yang mengurus website.</p>
            </div>
            {error && (
              <div role="alert" className="alert">
                <p className="alert-t">{error}</p>
                {/salah/i.test(error) && <p style={{ fontSize: 17, marginTop: 4 }}>Periksa huruf besar dan kecil, lalu coba lagi.</p>}
              </div>
            )}
            <div className="field">
              <label htmlFor="user">Nama pengguna</label>
              <input id="user" name="username" className="inp" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={missing.u || undefined} aria-describedby={missing.u ? 'e-user' : undefined} />
              {missing.u && <p id="e-user" className="err">Isi nama pengguna Anda.</p>}
            </div>
            <div className="field">
              <label htmlFor="pass">Kata sandi</label>
              <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                <input id="pass" name="password" type={show ? 'text' : 'password'} className="inp" autoComplete="current-password" aria-invalid={missing.p || undefined} aria-describedby={missing.p ? 'e-pass' : undefined} />
                <button type="button" className="btn btn-line" aria-pressed={show} onClick={() => setShow(!show)} style={{ padding: '0 16px', fontSize: 16 }}>{show ? 'Sembunyikan' : 'Tampilkan'}</button>
              </div>
              {missing.p && <p id="e-pass" className="err">Isi kata sandi Anda.</p>}
            </div>
            <button type="submit" className="btn btn-dark btn-big" disabled={busy} style={{ width: '100%' }}>{busy ? 'Sedang memeriksa...' : 'Masuk'}</button>
            <div className="stack" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
              <p style={{ fontWeight: 700 }}>Lupa kata sandi?</p>
              <p className="mute" style={{ fontSize: 17, lineHeight: 1.6 }}>Minta admin utama untuk membuatkan kata sandi baru.</p>
            </div>
          </form>
        </main>
        <Link to="/" className="more" style={{ alignSelf: 'flex-start', fontWeight: 600 }}>Kembali ke website desa</Link>
      </div>
    </div>
  );
}
