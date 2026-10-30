import { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Page, Photo, PostSummary, useLoad } from '../../api';
import { tanggal, tanggalHari } from '../../format';
import { Chips, Empty, Load, useTitle } from '../../ui';

type Tab = 'berita' | 'pengumuman' | 'agenda' | 'foto';
const TABS: [Tab, string][] = [['berita', 'Berita'], ['pengumuman', 'Pengumuman'], ['agenda', 'Jadwal kegiatan'], ['foto', 'Foto']];

export default function Kabar() {
  useTitle('Kabar Desa');
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'berita') as Tab;
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;
  const set = (patch: Record<string, string>) => setParams({ tab, ...(q && { q }), ...patch }, { preventScrollReset: true });

  const typeParam = tab === 'agenda' ? 'AGENDA' : tab.toUpperCase();
  const posts = useLoad<Page<PostSummary>>(tab === 'foto' ? null : `/posts?type=${typeParam}&page=${page}&q=${encodeURIComponent(q)}${tab === 'agenda' ? '&when=all' : ''}`);
  const photos = useLoad<Photo[]>(tab === 'foto' ? '/photos' : null);

  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    setParams({ tab, ...(value && { q: value }) });
  };

  return (
    <div className="wrap page">
      <nav aria-label="Lokasi halaman" className="crumb"><Link to="/">Beranda</Link> <span className="mute">/ Kabar Desa</span></nav>
      <h1 className="h1">Kabar Desa</h1>
      <p className="lead" style={{ margin: '16px 0 40px' }}>Berita kegiatan, pengumuman resmi, jadwal kegiatan, dan foto dari Pemerintah Desa Buduk.</p>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px 32px', paddingBottom: 28, borderBottom: '1px solid var(--ink)' }}>
        <Chips label="Tampilkan:" tabs options={TABS} value={tab} onChange={(k) => setParams({ tab: k })} />
        {tab !== 'foto' && (
          <form role="search" onSubmit={search} className="stack" style={{ gap: 6, width: 400, maxWidth: '100%' }}>
            <label htmlFor="cari" className="label" style={{ fontSize: 17 }}>Cari judul</label>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <input id="cari" name="q" type="search" className="inp" defaultValue={q} key={q} placeholder="Contoh: musyawarah" />
              <button type="submit" className="btn btn-dark">Cari</button>
            </div>
          </form>
        )}
      </div>

      <div style={{ paddingTop: 40 }}>
        {tab === 'foto' ? (
          <Load s={photos}>
            {(list) =>
              list.length === 0 ? (
                <Empty title="Belum ada foto" />
              ) : (
                <div className="stack" style={{ gap: 48 }}>
                  {[...new Set(list.map((p) => p.album))].map((album) => [album, list.filter((p) => p.album === album)] as const).map(([album, items]) => (
                    <section key={album} className="stack" style={{ gap: 16 }}>
                      <h2 style={{ fontSize: 22 }}>Album: {album}</h2>
                      <ul className="gal" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {items.map((p) => (
                          <li key={p.id}>
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="stack" style={{ gap: 6, textDecoration: 'none' }}>
                              <img className="photo" src={p.url} alt={p.caption} loading="lazy" style={{ aspectRatio: '1' }} />
                              <span className="cap">{p.caption}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )
            }
          </Load>
        ) : (
          <Load s={posts} lines={6}>
            {(res) =>
              res.items.length === 0 ? (
                <Empty title={q ? `Tidak ada yang cocok dengan “${q}”` : 'Belum ada isi di sini'}>
                  {q && (
                    <>
                      <p className="mute">Coba kata lain yang lebih pendek, atau hapus pencarian untuk melihat semuanya.</p>
                      <button type="button" className="btn btn-line" onClick={() => setParams({ tab })}>Hapus Pencarian</button>
                    </>
                  )}
                </Empty>
              ) : (
                <>
                  {tab === 'berita' && (
                    <div className="cards">
                      {res.items.map((b) => (
                        <Link key={b.id} className="card" to={`/kabar/${b.id}`}>
                          {b.imageUrl ? <img className="photo" src={b.imageUrl} alt="" loading="lazy" style={{ aspectRatio: '4 / 3', objectPosition: 'top' }} /> : <span className="thumb-empty" style={{ aspectRatio: '4 / 3' }} aria-hidden="true" />}
                          <span className="cap">{tanggal(b.publishedAt)}</span>
                          <span className="title-link">{b.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {tab === 'pengumuman' && (
                    <div style={{ borderBottom: '1px solid var(--line)' }}>
                      {res.items.map((p) => (
                        <Link key={p.id} className="list-row" to={`/kabar/${p.id}`}>
                          <span className="cap">{tanggal(p.publishedAt)}</span>
                          <span className="title-link">{p.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {tab === 'agenda' && (
                    <div style={{ borderBottom: '1px solid var(--line)' }}>
                      {res.items.map((a) => (
                        <div key={a.id} className="agenda">
                          <p style={{ fontWeight: 700 }}>{a.eventAt && tanggalHari(a.eventAt)}</p>
                          <div className="stack" style={{ gap: 6 }}>
                            <Link className="tlink" to={`/kabar/${a.id}`} style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.45 }}>{a.title}</Link>
                            {a.eventPlace && <p>Tempat: {a.eventPlace}</p>}
                            {a.organizer && <p className="mute" style={{ fontSize: 17 }}>Penyelenggara: {a.organizer}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {res.pages > 1 && (
                    <nav className="pager" aria-label="Halaman">
                      {page > 1 && <button type="button" className="btn btn-line" onClick={() => set({ page: String(page - 1) })}>Halaman sebelumnya</button>}
                      <p style={{ alignSelf: 'center', padding: '0 12px' }}>Halaman {page} dari {res.pages}</p>
                      {page < res.pages && <button type="button" className="btn btn-line" onClick={() => set({ page: String(page + 1) })}>Halaman berikutnya</button>}
                    </nav>
                  )}
                </>
              )
            }
          </Load>
        )}
      </div>
    </div>
  );
}
