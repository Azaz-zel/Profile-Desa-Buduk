import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { SITE } from './site';

export function Loading({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Sedang memuat" className="stack" style={{ gap: 12 }}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skel" style={{ height: 22, width: `${90 - i * 15}%` }} />
      ))}
      <span className="sr-only">Sedang memuat...</span>
    </div>
  );
}

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="alert stack" style={{ gap: 12, alignItems: 'flex-start' }}>
      <p className="alert-t">Data belum bisa ditampilkan</p>
      <p>{message}</p>
      {retry && <button type="button" className="btn btn-line" onClick={retry}>Coba Lagi</button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-t">{title}</p>
      {children}
    </div>
  );
}

/** Tampilkan memuat / gagal / isi sesuai status data. */
export function Load<T>({ s, children, lines }: { s: { data?: T; error?: string; loading: boolean; reload: () => void }; children: (d: T) => ReactNode; lines?: number }) {
  if (s.error) return <ErrorBox message={s.error} retry={s.reload} />;
  if (s.loading || s.data === undefined) return <Loading lines={lines} />;
  return <>{children(s.data)}</>;
}

/** Deretan tombol pilihan besar (pengganti tab). Turun ke baris berikutnya, tidak perlu digeser. */
export function Chips<K extends string>({ label, options, value, onChange, tabs }: { label: string; options: [K, string][]; value: K; onChange: (k: K) => void; tabs?: boolean }) {
  return (
    <div>
      <p className="chips-label" id={`l-${label}`}>{label}</p>
      <div className={tabs ? 'chips tabs' : 'chips'} role="group" aria-labelledby={`l-${label}`}>
        {options.map(([k, text]) => (
          <button key={k} type="button" className="chip" aria-pressed={k === value} onClick={() => onChange(k)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Desa Buduk` : 'Desa Buduk';
  }, [title]);
}

/** Pindah ke atas dan fokus ke isi utama setiap pindah halaman (penting untuk pembaca layar). */
function useRouteFocus() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('isi')?.focus({ preventScroll: true });
  }, [pathname, hash]);
}

const NAV: [string, string][] = [['/', 'Beranda'], ['/profil', 'Profil'], ['/kabar', 'Kabar Desa'], ['/data', 'Data Desa'], ['/dokumen', 'Dokumen']];

export function PublicLayout() {
  useRouteFocus();
  return (
    <>
      <a className="skip" href="#isi">Langsung ke isi halaman</a>
      <header className="site-head">
        <div className="wrap">
          <Link className="brand" to="/">
            <img src="/logo.png" alt="Logo Desa Buduk" width={40} height={40} />
            <span><b>Desa Buduk</b><small>Kec. Mengwi, Kab. Badung</small></span>
          </Link>
          <nav className="nav" aria-label="Menu utama">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
            ))}
          </nav>
          <Link className="btn btn-dark" to="/pengaduan">Kirim Pengaduan</Link>
        </div>
      </header>
      <main id="isi" tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <footer className="site-foot">
        <div className="wrap foot-grid">
          <div className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <img src="/logo.png" alt="" width={36} height={36} />
              <span style={{ fontSize: 19, fontWeight: 700 }}>Pemerintah Desa Buduk</span>
            </div>
            <p className="mute" style={{ fontSize: 17, maxWidth: '36ch' }}>{SITE.address}</p>
          </div>
          <nav aria-label="Halaman" className="stack">
            <p className="foot-h">Halaman</p>
            <Link to="/profil">Profil desa</Link>
            <Link to="/kabar">Kabar desa</Link>
            <Link to="/data">Data desa</Link>
            <Link to="/dokumen">Dokumen</Link>
          </nav>
          <nav aria-label="Layanan" className="stack">
            <p className="foot-h">Layanan</p>
            <Link to="/pengaduan">Kirim pengaduan</Link>
            <Link to="/pengaduan#cek-laporan">Cek laporan saya</Link>
            <a href={SITE.dukcapil} target="_blank" rel="noopener noreferrer">Dukcapil Badung</a>
            <a href={SITE.perpustakaan} target="_blank" rel="noopener noreferrer">Perpustakaan desa</a>
          </nav>
          <nav aria-label="Media sosial" className="stack">
            <p className="foot-h">Ikuti kami</p>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href={SITE.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
          </nav>
        </div>
        <div className="wrap" style={{ paddingTop: 20, paddingBottom: 32, borderTop: '1px solid var(--line)' }}>
          <p className="mute" style={{ fontSize: 16 }}>© {new Date().getFullYear()} Pemerintah Desa Buduk</p>
        </div>
      </footer>
    </>
  );
}

export function NotFound() {
  useTitle('Halaman tidak ditemukan');
  return (
    <div className="wrap page stack" style={{ gap: 20, alignItems: 'flex-start' }}>
      <h1 className="h1">Halaman tidak ditemukan</h1>
      <p className="lead">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <Link className="btn btn-dark" to="/">Kembali ke Beranda</Link>
    </div>
  );
}

/** Pesan sukses yang hilang sendiri setelah beberapa detik. */
export function useFlash() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 5000);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <p role="status" className="ok">{msg}</p> : null;
  return [node, setMsg] as const;
}
