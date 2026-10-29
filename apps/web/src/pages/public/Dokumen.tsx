import { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Doc, useLoad } from '../../api';
import { tanggal } from '../../format';
import { DOC_CATEGORIES } from '../../site';
import { Chips, Empty, Load, useTitle } from '../../ui';

export default function Dokumen() {
  useTitle('Dokumen Desa');
  const [params, setParams] = useSearchParams();
  const category = DOC_CATEGORIES.includes(params.get('category') ?? '') ? params.get('category')! : 'Semua';
  const q = params.get('q') ?? '';
  const s = useLoad<Doc[]>(`/documents?q=${encodeURIComponent(q)}${category !== 'Semua' ? `&category=${encodeURIComponent(category)}` : ''}`);

  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    setParams({ ...(category !== 'Semua' && { category }), ...(value && { q: value }) });
  };

  return (
    <div className="wrap page">
      <nav aria-label="Lokasi halaman" className="crumb"><Link to="/">Beranda</Link> <span className="mute">/ Dokumen</span></nav>
      <h1 className="h1">Dokumen desa</h1>
      <p className="lead" style={{ margin: '16px 0 48px' }}>Peraturan desa, laporan anggaran, dan dokumen resmi lain yang boleh dibaca dan diunduh semua warga.</p>

      <div className="side">
        <section aria-labelledby="h-dok" className="stack" style={{ gap: 24, minWidth: 0 }}>
          <h2 id="h-dok" className="rule">Daftar dokumen</h2>
          <Chips
            label="Tampilkan:"
            options={[['Semua', 'Semua'], ...DOC_CATEGORIES.map((c): [string, string] => [c, c])]}
            value={category}
            onChange={(c) => setParams({ ...(c !== 'Semua' && { category: c }), ...(q && { q }) })}
          />
          <form role="search" onSubmit={search} className="field" style={{ maxWidth: 480 }}>
            <label htmlFor="cari-dok">Cari dokumen</label>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <input id="cari-dok" name="q" type="search" className="inp" defaultValue={q} key={q} placeholder="Contoh: anggaran 2025" />
              <button type="submit" className="btn btn-dark">Cari</button>
            </div>
          </form>
          <Load s={s} lines={5}>
            {(docs) =>
              docs.length === 0 ? (
                <Empty title="Dokumen tidak ditemukan">
                  <p className="mute" style={{ lineHeight: 1.65 }}>Coba kata lain, atau minta dokumennya ke kantor desa lewat formulir di samping.</p>
                  {(q || category !== 'Semua') && <button type="button" className="btn btn-line" onClick={() => setParams({})}>Tampilkan Semua Dokumen</button>}
                </Empty>
              ) : (
                <div style={{ borderBottom: '1px solid var(--line)' }}>
                  {docs.map((d) => (
                    <div key={d.id} className="doc-row">
                      <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{d.category}, tahun {d.year}</span>
                        <span style={{ fontSize: 19, lineHeight: 1.45, fontWeight: 700 }}>{d.title}</span>
                        <span className="cap">Diunggah {tanggal(d.createdAt)}, file PDF</span>
                      </div>
                      <a className="btn btn-line" href={d.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Unduh ${d.title}`}>Unduh</a>
                    </div>
                  ))}
                </div>
              )
            }
          </Load>
        </section>

        <aside className="stack" style={{ gap: 32 }}>
          <section id="permohonan" aria-labelledby="h-mohon" className="box stack" style={{ gap: 16 }}>
            <h2 id="h-mohon" style={{ fontSize: 26, lineHeight: 1.3 }}>Dokumen yang Anda cari tidak ada?</h2>
            <p>Minta ke kantor desa. Cara mintanya:</p>
            <ol className="stack" style={{ margin: 0, paddingLeft: 24, gap: 8, lineHeight: 1.65 }}>
              <li>Isi formulir dan pilih <strong>Meminta dokumen desa</strong>. Simpan kode laporan Anda.</li>
              <li>Petugas menjawab paling lambat 10 hari kerja.</li>
              <li>Dokumen dikirim lewat WhatsApp, atau bisa diambil di kantor desa.</li>
            </ol>
            <Link className="btn btn-dark" to="/pengaduan?jenis=DOKUMEN" style={{ alignSelf: 'flex-start' }}>Minta Dokumen</Link>
            <p className="mute" style={{ fontSize: 17 }}>Atau datang langsung ke Kantor Perbekel Desa Buduk.</p>
          </section>
          <section aria-labelledby="h-ppid" className="stack" style={{ gap: 10 }}>
            <h2 id="h-ppid" style={{ fontSize: 21 }}>Siapa yang mengurus dokumen ini?</h2>
            <p className="mute" style={{ lineHeight: 1.65 }}>Pejabat Pengelola Informasi dan Dokumentasi (PPID) Desa Buduk. Tugasnya menyimpan dokumen desa dan memberikannya kepada warga yang meminta, sesuai Undang-Undang Keterbukaan Informasi Publik.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
