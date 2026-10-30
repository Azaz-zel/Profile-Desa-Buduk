import { Link } from 'react-router';
import { Budget, Page, Population, PostSummary, useLoad } from '../../api';
import { angka, jam, miliar, persen, tanggal, tanggalHari } from '../../format';
import { SITE } from '../../site';
import { Empty, Load, useTitle } from '../../ui';

const SERVICES: [string, string, string, boolean?][] = [
  ['/pengaduan', 'Kirim pengaduan', 'Laporkan jalan rusak, lampu mati, sampah, atau masalah pelayanan.'],
  ['/pengaduan#cek-laporan', 'Cek laporan saya', 'Lihat apakah laporan Anda sudah diterima, diproses, atau selesai.'],
  [SITE.waHref, 'Tanya lewat WhatsApp', `Kirim pesan ke kantor desa di nomor ${SITE.wa}.`, true],
  ['/data?tab=anggaran', 'Lihat anggaran desa', 'Uang desa tahun ini: dari mana asalnya dan dipakai untuk apa.'],
  ['/dokumen', 'Unduh peraturan desa', 'Peraturan desa dan dokumen resmi lain yang boleh dibaca semua warga.'],
  [SITE.dukcapil, 'Urus KTP, KK, dan akta', 'Lewat layanan Disdukcapil Kabupaten Badung. Membuka situs lain.', true],
];

const typeLabel = (t: string) => (t === 'PENGUMUMAN' ? 'Pengumuman' : 'Berita');

export default function Home() {
  useTitle('');
  const pop = useLoad<Population>('/population');
  const news = useLoad<Page<PostSummary>>('/posts?limit=5');
  const budget = useLoad<Budget>('/budget');
  const agenda = useLoad<Page<PostSummary>>('/posts?type=AGENDA&when=upcoming&limit=3');

  return (
    <>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 80 }}>
        <div className="hero">
          <div className="stack" style={{ gap: 24 }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--green)' }}>Website resmi Pemerintah Desa Buduk</p>
            <h1 className="h1">Kabar, data, dan layanan Desa Buduk.</h1>
            <p className="lead" style={{ maxWidth: '32ch' }}>Baca kabar desa, lihat anggaran desa, atau kirim pengaduan tanpa harus datang ke kantor.</p>
            <div className="row" style={{ gap: 12, paddingTop: 8 }}>
              <Link className="btn btn-dark" to="/pengaduan">Kirim Pengaduan</Link>
              <Link className="btn btn-line" to="/data?tab=anggaran">Lihat Anggaran Desa</Link>
            </div>
          </div>
          <figure className="stack" style={{ margin: 0, gap: 10 }}>
            <img className="photo" src="/kantor.webp" alt="Gerbang Kantor Perbekel Desa Buduk dengan taman di depannya" width={600} height={338} style={{ aspectRatio: '16 / 10' }} />
            <figcaption className="cap">Kantor Perbekel Desa Buduk, Jl. Wahyu Graha No. 5</figcaption>
          </figure>
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 96 }} aria-labelledby="h-layanan">
        <h2 id="h-layanan" className="rule" style={{ marginBottom: 8 }}>Apa yang ingin Anda lakukan?</h2>
        <div className="g3">
          {SERVICES.map(([to, title, text, external]) =>
            external ? (
              <a key={title} className="svc" href={to} target="_blank" rel="noopener noreferrer"><span className="svc-t">{title}</span><span>{text}</span></a>
            ) : (
              <Link key={title} className="svc" to={to}><span className="svc-t">{title}</span><span>{text}</span></Link>
            ),
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="h-penduduk">
        <div className="wrap" style={{ paddingTop: 72, paddingBottom: 72 }}>
          <Load s={pop}>
            {(p) => (
              <div className="pop">
                <div>
                  <h2 id="h-penduduk" className="mute" style={{ fontSize: 19, marginBottom: 8 }}>Jumlah penduduk</h2>
                  <p className="big-num">{angka(p.male + p.female)}</p>
                  <p style={{ marginTop: 12, fontSize: 19 }}>orang tercatat di Desa Buduk</p>
                </div>
                <div className="stack" style={{ gap: 24 }}>
                  <div className="g2" style={{ gap: 24 }}>
                    <div className="stat"><b>{angka(p.male)}</b>Laki-laki</div>
                    <div className="stat"><b>{angka(p.female)}</b>Perempuan</div>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 16 }}>
                    {p.updatedAt && <p className="mute" style={{ fontSize: 16 }}>Data kependudukan Desa Buduk, diperbarui {tanggal(p.updatedAt)}</p>}
                    <Link className="more" to="/data">Lihat data penduduk lengkap</Link>
                  </div>
                </div>
              </div>
            )}
          </Load>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="h-kabar">
        <div className="row" style={{ gap: 24, marginBottom: 32 }}>
          <h2 id="h-kabar" className="rule" style={{ flex: '1 1 260px' }}>Kabar terbaru</h2>
          <Link className="more" to="/kabar">Lihat semua kabar</Link>
        </div>
        <Load s={news} lines={5}>
          {({ items }) =>
            items.length === 0 ? (
              <Empty title="Belum ada kabar">
                <p className="mute">Berita dan pengumuman desa akan tampil di sini.</p>
              </Empty>
            ) : (
              <div className="feat">
                <Link to={`/kabar/${items[0].id}`} className="card" style={{ gap: 14 }}>
                  {items[0].imageUrl && <img className="photo" src={items[0].imageUrl} alt="" style={{ aspectRatio: '16 / 10', objectPosition: 'top' }} />}
                  <span className="cap">{typeLabel(items[0].type)}, {tanggal(items[0].publishedAt)}</span>
                  <span className="title-link" style={{ fontSize: 27, lineHeight: 1.3 }}>{items[0].title}</span>
                </Link>
                <div>
                  {items.slice(1).map((p) => (
                    <Link key={p.id} className="news-row" to={`/kabar/${p.id}`}>
                      {p.imageUrl ? <img className="photo" src={p.imageUrl} alt="" style={{ aspectRatio: '1', objectPosition: 'top' }} /> : <span className="thumb-empty" aria-hidden="true" />}
                      <span className="stack" style={{ gap: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: p.type === 'PENGUMUMAN' ? 700 : 400, color: p.type === 'PENGUMUMAN' ? 'var(--green)' : 'var(--mute)' }}>
                          {typeLabel(p.type)}, {tanggal(p.publishedAt)}
                        </span>
                        <span className="title-link" style={{ fontSize: 19, lineHeight: 1.45 }}>{p.title}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          }
        </Load>
      </section>

      <section className="band" aria-labelledby="h-apbdes">
        <div className="wrap" style={{ paddingTop: 88, paddingBottom: 88 }}>
          <Load s={budget}>
            {(b) => {
              const sum = (c: string, k: 'planned' | 'realized') => b.lines.filter((l) => l.category === c).reduce((t, l) => t + l[k], 0);
              const rows: [string, string, string][] = [['Uang masuk (pendapatan)', 'PENDAPATAN', 'Sudah diterima'], ['Uang keluar (belanja)', 'BELANJA', 'Sudah dipakai']];
              return (
                <div className="g2">
                  <div className="stack" style={{ gap: 16, alignItems: 'flex-start' }}>
                    <h2 id="h-apbdes" style={{ fontSize: 36, lineHeight: 1.2 }}>Uang desa tahun {b.year}</h2>
                    <p className="lead" style={{ fontSize: 19, maxWidth: '40ch' }}>Anggaran Pendapatan dan Belanja Desa (APBDes): berapa yang direncanakan, dan berapa yang sudah terpakai atau diterima.</p>
                    {b.updatedAt && <p className="cap">Diperbarui {tanggal(b.updatedAt)}</p>}
                    <Link className="btn btn-line" to="/data?tab=anggaran" style={{ marginTop: 8 }}>Lihat Rincian Anggaran</Link>
                  </div>
                  {b.lines.length === 0 ? (
                    <Empty title="Anggaran tahun ini belum diisi" />
                  ) : (
                    <dl className="stack" style={{ margin: 0, gap: 36 }}>
                      {rows.map(([label, cat, verb]) => {
                        const plan = sum(cat, 'planned');
                        const real = sum(cat, 'realized');
                        const pct = persen(real, plan);
                        return (
                          <div key={cat}>
                            <dt style={{ fontSize: 20, fontWeight: 700 }}>{label}</dt>
                            <dd className="num" style={{ margin: '6px 0 0' }}>{verb} <strong>{miliar(real)}</strong> dari rencana {miliar(plan)}</dd>
                            <dd className="bar" style={{ margin: '12px 0 0' }}><div style={{ width: `${Math.min(100, pct)}%` }} /></dd>
                            <dd className="num" style={{ margin: '8px 0 0', fontWeight: 700 }}>{pct} persen</dd>
                          </div>
                        );
                      })}
                      <div>
                        <dt style={{ fontSize: 20, fontWeight: 700 }}>Sisa anggaran tahun lalu</dt>
                        <dd className="num" style={{ margin: '6px 0 0' }}>{miliar(sum('PEMBIAYAAN', 'realized'))}, masuk ke anggaran {b.year}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              );
            }}
          </Load>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="h-agenda">
        <div className="row" style={{ gap: 24, marginBottom: 24 }}>
          <h2 id="h-agenda" className="rule" style={{ flex: '1 1 260px' }}>Jadwal kegiatan desa</h2>
          <Link className="more" to="/kabar?tab=agenda">Lihat kegiatan sebelumnya</Link>
        </div>
        <Load s={agenda}>
          {({ items }) =>
            items.length === 0 ? (
              <Empty title="Belum ada kegiatan yang akan datang">
                <p className="mute" style={{ maxWidth: '60ch' }}>Jadwal kegiatan desa seperti musyawarah, posyandu, dan pembagian bantuan akan muncul di sini setelah diumumkan.</p>
              </Empty>
            ) : (
              <div style={{ borderBottom: '1px solid var(--line)' }}>
                {items.map((a) => (
                  <div key={a.id} className="agenda">
                    <p className="num" style={{ fontWeight: 700 }}>{a.eventAt && tanggalHari(a.eventAt)}{a.eventAt && <><br />Pukul {jam(a.eventAt)}</>}</p>
                    <div className="stack" style={{ gap: 4 }}>
                      <Link className="tlink" to={`/kabar/${a.id}`} style={{ fontSize: 20, fontWeight: 700 }}>{a.title}</Link>
                      {a.eventPlace && <p>Tempat: {a.eventPlace}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Load>
      </section>

      <section className="band" style={{ borderBottom: 0 }} aria-labelledby="h-tentang">
        <div className="wrap g2" style={{ paddingTop: 88, paddingBottom: 88, alignItems: 'center' }}>
          <div className="stack" style={{ gap: 20, alignItems: 'flex-start' }}>
            <h2 id="h-tentang" style={{ fontSize: 36, lineHeight: 1.2 }}>Tentang Desa Buduk</h2>
            <p style={{ lineHeight: 1.75, maxWidth: '50ch' }}>Desa Buduk terletak di Kecamatan Mengwi, Kabupaten Badung, Bali. Desa ini memadukan kehidupan tradisional Bali dengan perkembangan modern: persawahan, pura-pura bersejarah, dan kegiatan budaya yang masih terjaga.</p>
            <p style={{ lineHeight: 1.75, maxWidth: '50ch' }}>Wilayahnya terbagi menjadi 10 banjar dinas.</p>
            <Link className="more" to="/profil">Baca profil desa</Link>
          </div>
          <figure className="stack" style={{ margin: 0, gap: 10 }}>
            <img className="photo" src="/tentang.webp" alt="Penandatanganan nota kesepakatan di Kantor Perbekel Desa Buduk" width={400} height={400} style={{ aspectRatio: '4 / 3' }} loading="lazy" />
            <figcaption className="cap">Penandatanganan nota kesepakatan</figcaption>
          </figure>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--line)' }} aria-labelledby="h-kontak">
        <div className="wrap g2" style={{ paddingTop: 88, paddingBottom: 88 }}>
          <div className="stack" style={{ gap: 24 }}>
            <h2 id="h-kontak" style={{ fontSize: 36, lineHeight: 1.2 }}>Datang atau hubungi kantor desa</h2>
            <dl className="stack" style={{ margin: 0, gap: 18 }}>
              <div><dt className="mute" style={{ fontSize: 16, fontWeight: 600 }}>Alamat</dt><dd style={{ margin: '2px 0 0' }}>{SITE.address}</dd></div>
              <div><dt className="mute" style={{ fontSize: 16, fontWeight: 600 }}>Telepon kantor</dt><dd style={{ margin: '2px 0 0' }}><a href={SITE.phoneHref} style={{ fontWeight: 700 }}>{SITE.phone}</a></dd></div>
              <div><dt className="mute" style={{ fontSize: 16, fontWeight: 600 }}>Email</dt><dd style={{ margin: '2px 0 0' }}><a href={`mailto:${SITE.email}`}>{SITE.email}</a></dd></div>
            </dl>
            <a className="btn btn-dark" href={SITE.waHref} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start' }}>Chat WhatsApp Kantor Desa</a>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <iframe title="Peta lokasi Kantor Perbekel Desa Buduk" src={SITE.mapsEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ width: '100%', aspectRatio: '4 / 3', border: '1px solid var(--line)' }} />
            <a className="more" href={SITE.mapsLink} target="_blank" rel="noopener noreferrer">Petunjuk arah lewat Google Maps</a>
          </div>
        </div>
      </section>
    </>
  );
}
