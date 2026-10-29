import { Link } from 'react-router';
import { useLoad } from '../../api';
import { tanggal, tanggalHari } from '../../format';
import { Load, useTitle } from '../../ui';
import { useMe } from './AdminLayout';

interface Summary {
  newReports: number;
  docRequests: number;
  oldestNew: string | null;
  budgetUpdatedAt: string | null;
  recent: { id: number; title: string; type: string; status: string; updatedAt: string }[];
}

const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export default function Dashboard() {
  useTitle('Kelola');
  const me = useMe();
  const s = useLoad<Summary>('/admin/summary');

  return (
    <>
      <div>
        <h1 className="ah1">Selamat datang, {me.name}</h1>
        <p className="mute" style={{ marginTop: 8, fontSize: 19 }}>{tanggalHari(new Date().toISOString())}</p>
      </div>

      <Load s={s}>
        {(d) => {
          const todos: [string, string, string, string, string, string][] = [];
          if (d.newReports)
            todos.push(['Penting', 'var(--red)', `${d.newReports} pengaduan baru belum dibaca`, d.oldestNew ? `Yang paling lama masuk ${daysAgo(d.oldestNew)} hari lalu.` : '', '/kelola/pengaduan', 'Baca Pengaduan']);
          if (d.docRequests)
            todos.push(['Ada batas waktu', 'var(--amber)', `${d.docRequests} permintaan dokumen belum selesai`, 'Wajib dijawab paling lambat 10 hari kerja.', '/kelola/pengaduan', 'Jawab Permintaan']);
          if (me.role === 'ADMIN')
            todos.push(['Pengingat rutin', 'var(--green)', `Data anggaran terakhir diperbarui ${d.budgetUpdatedAt ? tanggal(d.budgetUpdatedAt) : 'belum pernah'}`, 'Perbarui setiap ada pencairan atau pembayaran baru.', '/kelola/data', 'Perbarui Anggaran']);
          return (
            <>
              <section aria-labelledby="h-todo" className="stack" style={{ gap: 12 }}>
                <h2 id="h-todo" style={{ fontSize: 26, marginBottom: 4 }}>Perlu ditanggapi</h2>
                {todos.length === 0 ? (
                  <p className="ok">Tidak ada yang perlu ditanggapi. Semua pengaduan sudah dibaca.</p>
                ) : (
                  todos.map(([tag, color, title, note, to, cta], i) => (
                    <div key={title} className="item">
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color }}>{tag}</p>
                        <p style={{ fontSize: 20, fontWeight: 700 }}>{title}</p>
                        {note && <p className="mute">{note}</p>}
                      </div>
                      <Link className={i === 0 ? 'btn btn-dark' : 'btn btn-line'} to={to}>{cta}</Link>
                    </div>
                  ))
                )}
              </section>

              <section aria-labelledby="h-act" className="stack" style={{ gap: 16 }}>
                <h2 id="h-act" style={{ fontSize: 26 }}>Mau mengerjakan apa?</h2>
                <div className="acts">
                  <Link className="act" to="/kelola/kabar/baru"><span className="svc-t">Tulis berita atau pengumuman</span><span className="mute">Kabarkan kegiatan desa, lelang, atau imbauan kepada warga.</span></Link>
                  <Link className="act" to="/kelola/kabar/baru?jenis=AGENDA"><span className="svc-t">Tambah jadwal kegiatan</span><span className="mute">Musyawarah, posyandu, pembagian bantuan, dan kegiatan lain.</span></Link>
                  <Link className="act" to="/kelola/dokumen"><span className="svc-t">Unggah dokumen atau foto</span><span className="mute">Peraturan desa, laporan anggaran, atau foto kegiatan.</span></Link>
                  {me.role === 'ADMIN' && <Link className="act" to="/kelola/data"><span className="svc-t">Perbarui data penduduk</span><span className="mute">Ubah jumlah penduduk setelah ada data baru dari petugas.</span></Link>}
                </div>
              </section>

              {d.recent.length > 0 && (
                <section aria-labelledby="h-log" className="stack" style={{ gap: 8 }}>
                  <h2 id="h-log" style={{ fontSize: 26, marginBottom: 8 }}>Kabar yang terakhir diubah</h2>
                  <div style={{ borderBottom: '1px solid var(--line)' }}>
                    {d.recent.map((p) => (
                      <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, auto) minmax(0, 1fr)', gap: 16, padding: '16px 0', borderTop: '1px solid var(--line)' }}>
                        <span className="mute">{tanggal(p.updatedAt)}</span>
                        <Link to={`/kelola/kabar/${p.id}`}>{p.title}</Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        }}
      </Load>
    </>
  );
}
