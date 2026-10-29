import { createContext, useContext, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { api, Me, useLoad } from '../../api';
import { Loading } from '../../ui';

const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx)!;

export default function AdminLayout() {
  const me = useLoad<Me>('/auth/me');
  const summary = useLoad<{ newReports: number }>(me.data ? '/admin/summary' : null);
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    document.getElementById('isi')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  if (me.loading) return <div className="wrap page"><Loading /></div>;
  if (!me.data) return <Navigate to="/kelola/masuk" replace state={{ from: pathname }} />;

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    nav('/kelola/masuk', { replace: true });
  };
  const isAdmin = me.data.role === 'ADMIN';
  const items: [string, string, boolean?][] = [
    ['/kelola', 'Beranda', true],
    ['/kelola/pengaduan', 'Pengaduan warga'],
    ['/kelola/kabar', 'Kabar desa'],
    ['/kelola/dokumen', 'Dokumen dan foto'],
    ...(isAdmin ? ([['/kelola/data', 'Data dan anggaran'], ['/kelola/profil', 'Profil dan perangkat'], ['/kelola/akun', 'Akun pengguna']] as [string, string][]) : []),
  ];

  return (
    <MeCtx.Provider value={me.data}>
      <a className="skip" href="#isi">Langsung ke isi halaman</a>
      <div className="shell">
        <aside className="sb" aria-label="Menu kelola">
          <div className="sb-brand">
            <img src="/logo.png" alt="" width={40} height={40} />
            <div className="stack" style={{ lineHeight: 1.3 }}>
              <span style={{ fontSize: 19, fontWeight: 700 }}>Kelola Website</span>
              <span style={{ fontSize: 16, color: '#d4d4d8' }}>Desa Buduk</span>
            </div>
          </div>
          <nav className="sbnav" aria-label="Menu kelola">
            {items.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {label}
                {to === '/kelola/pengaduan' && !!summary.data?.newReports && <span className="badge">{summary.data.newReports} baru</span>}
              </NavLink>
            ))}
          </nav>
          <div className="sb-foot">
            <p style={{ margin: '0 0 8px', padding: '0 16px', fontSize: 16, color: '#d4d4d8' }}>
              Masuk sebagai<br /><strong style={{ color: '#fff' }}>{me.data.name}</strong><br />{isAdmin ? 'Admin utama' : 'Pengelola isi'}
            </p>
            <Link to="/kelola/kata-sandi">Ganti kata sandi</Link>
            <a href="/" target="_blank" rel="noopener noreferrer">Lihat website desa</a>
            <button type="button" onClick={logout}>Keluar</button>
          </div>
        </aside>
        <main id="isi" tabIndex={-1} className="main" style={{ outline: 'none' }}>
          <div className="main-in">
            <Outlet context={{ refreshSummary: summary.reload }} />
          </div>
        </main>
      </div>
    </MeCtx.Provider>
  );
}
