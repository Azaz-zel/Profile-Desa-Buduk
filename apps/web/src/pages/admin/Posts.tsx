import { useState } from 'react';
import { Link } from 'react-router';
import { api, PostType, useLoad } from '../../api';
import { tanggal } from '../../format';
import { Chips, Empty, Load, useFlash, useTitle } from '../../ui';

interface Row { id: number; type: PostType; status: 'DRAFT' | 'PUBLISHED'; title: string; publishedAt: string | null; updatedAt: string; eventAt: string | null }

export default function Posts() {
  useTitle('Kabar desa');
  const [type, setType] = useState<PostType>('BERITA');
  const s = useLoad<Row[]>(`/admin/posts?type=${type}`);
  const [asking, setAsking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useFlash();

  const remove = async (r: Row) => {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/posts/${r.id}`, { method: 'DELETE' });
      s.setData((s.data ?? []).filter((x) => x.id !== r.id));
      setFlash(`“${r.title}” sudah dihapus.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px 24px' }}>
        <div>
          <h1 className="ah1">Kabar desa</h1>
          <p className="mute" style={{ marginTop: 8, fontSize: 19 }}>Berita, pengumuman, dan jadwal kegiatan yang tampil di website.</p>
        </div>
        <Link className="btn btn-dark" to={`/kelola/kabar/baru?jenis=${type}`}>Tulis Kabar Baru</Link>
      </div>
      <Chips label="Tampilkan:" options={[['BERITA', 'Berita'], ['PENGUMUMAN', 'Pengumuman'], ['AGENDA', 'Jadwal kegiatan']]} value={type} onChange={(t) => { setType(t); setAsking(null); }} />
      {flash}
      {error && <p role="alert" className="alert alert-t">{error}</p>}
      <Load s={s}>
        {(rows) =>
          rows.length === 0 ? (
            <Empty title="Belum ada isi di bagian ini">
              <p className="mute">Tekan tombol di bawah untuk membuat yang pertama.</p>
              <Link className="btn btn-dark" to={`/kelola/kabar/baru?jenis=${type}`}>Tulis Kabar Baru</Link>
            </Empty>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {rows.map((r) => (
                <div key={r.id} className="item">
                  <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                    <span className="row" style={{ gap: 12 }}>
                      <span className={r.status === 'PUBLISHED' ? 'tag tag-green' : 'tag tag-gray'}>{r.status === 'PUBLISHED' ? 'Tampil di website' : 'Draf, belum tampil'}</span>
                      <span className="cap">{r.type === 'AGENDA' && r.eventAt ? `Kegiatan ${tanggal(r.eventAt)}` : r.publishedAt ? tanggal(r.publishedAt) : `Disimpan ${tanggal(r.updatedAt)}`}</span>
                    </span>
                    <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{r.title}</span>
                  </div>
                  {asking === r.id ? (
                    <div className="stack" style={{ gap: 8 }}>
                      <p style={{ fontWeight: 700, color: 'var(--red)' }}>Yakin hapus kabar ini? Tidak bisa dikembalikan.</p>
                      <div className="row" style={{ gap: 8 }}>
                        <button type="button" className="btn btn-red" disabled={busy} onClick={() => remove(r)}>{busy ? 'Menghapus...' : 'Ya, Hapus'}</button>
                        <button type="button" className="btn btn-line" onClick={() => setAsking(null)}>Tidak</button>
                      </div>
                    </div>
                  ) : (
                    <div className="row" style={{ gap: 8 }}>
                      <Link className="btn btn-line" to={`/kelola/kabar/${r.id}`}>Ubah</Link>
                      <button type="button" className="btn btn-del" onClick={() => setAsking(r.id)}>Hapus</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Load>
    </>
  );
}
