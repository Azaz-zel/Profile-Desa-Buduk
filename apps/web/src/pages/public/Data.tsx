import { Link, useSearchParams } from 'react-router';
import { Budget, BudgetCategory, Count, Population, useLoad } from '../../api';
import { angka, miliar, persen, tanggal } from '../../format';
import { Chips, Empty, Load, useTitle } from '../../ui';

function Bars({ title, rows, note }: { title: string; rows: Count[]; note?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section aria-label={title}>
      <h2 className="rule" style={{ fontSize: 26, marginBottom: 16 }}>{title}</h2>
      {rows.length === 0 ? (
        <div role="status" className="notice stack" style={{ gap: 10 }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#78350f' }}>Data sedang diperiksa ulang</p>
          <p style={{ lineHeight: 1.65, color: '#451a03' }}>Data ini belum ditampilkan karena masih diperiksa petugas. Data akan muncul lagi setelah diperbaiki.</p>
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.label} className="bar-row">
            <span style={{ fontWeight: 600 }}>{r.label}</span>
            <span className="num"><strong>{angka(r.n)}</strong> orang</span>
            <div className="bar" aria-hidden="true"><div style={{ width: `${Math.max(1, (r.n / max) * 100)}%` }} /></div>
          </div>
        ))
      )}
      {note && rows.length > 0 && <p className="mute" style={{ fontSize: 17, marginTop: 16 }}>{note}</p>}
    </section>
  );
}

function Penduduk() {
  const s = useLoad<Population>('/population');
  return (
    <Load s={s} lines={6}>
      {(p) => (
        <div className="stack" style={{ gap: 80 }}>
          <section aria-labelledby="h-total" className="stack" style={{ gap: 20 }}>
            <h2 id="h-total" className="rule" style={{ fontSize: 26 }}>Jumlah penduduk</h2>
            <div className="statbox">
              <div><p className="mute" style={{ fontWeight: 700 }}>Semua penduduk</p><b>{angka(p.male + p.female)}</b><p>orang</p></div>
              <div><p className="mute" style={{ fontWeight: 700 }}>Laki-laki</p><b>{angka(p.male)}</b><p>orang ({persen(p.male, p.male + p.female)} persen)</p></div>
              <div><p className="mute" style={{ fontWeight: 700 }}>Perempuan</p><b>{angka(p.female)}</b><p>orang ({persen(p.female, p.male + p.female)} persen)</p></div>
            </div>
          </section>
          <div className="g2" style={{ gap: '72px 64px' }}>
            <Bars title="Agama" rows={p.religion} />
            <Bars title="Pekerjaan terbanyak" rows={p.occupation} />
            <Bars title="Pendidikan terakhir" rows={p.education} />
            <Bars title="Kelompok umur" rows={p.age} />
          </div>
          {p.updatedAt && <p className="mute" style={{ fontSize: 17 }}>Sumber: data kependudukan Pemerintah Desa Buduk, diperbarui {tanggal(p.updatedAt)}.</p>}
        </div>
      )}
    </Load>
  );
}

const CATS: [BudgetCategory, string, string][] = [
  ['PENDAPATAN', 'Uang masuk (pendapatan)', 'Sudah diterima'],
  ['BELANJA', 'Uang keluar (belanja)', 'Sudah dipakai'],
  ['PEMBIAYAAN', 'Sisa anggaran tahun lalu (SILPA)', 'Sudah masuk'],
];

function Anggaran({ year, onYear }: { year: string | null; onYear: (y: string) => void }) {
  const s = useLoad<Budget>(`/budget${year ? `?year=${year}` : ''}`);
  return (
    <div className="stack" style={{ gap: 64 }}>
      <section aria-labelledby="h-apa" className="box stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 8, maxWidth: '64ch' }}>
          <h2 id="h-apa" style={{ fontSize: 24 }}>Apa itu APBDes?</h2>
          <p style={{ lineHeight: 1.7 }}>APBDes adalah singkatan dari Anggaran Pendapatan dan Belanja Desa, yaitu rencana keuangan desa selama satu tahun. Isinya ada tiga bagian:</p>
        </div>
        <dl className="explain">
          <div><dt>Uang masuk</dt><dd>Dari mana uang desa berasal, misalnya Dana Desa dan bagi hasil pajak.</dd></div>
          <div><dt>Uang keluar</dt><dd>Untuk apa uang desa dipakai, misalnya pembangunan jalan dan kegiatan warga.</dd></div>
          <div><dt>Sisa tahun lalu</dt><dd>Uang tahun sebelumnya yang belum terpakai, lalu masuk ke anggaran tahun ini.</dd></div>
        </dl>
        <p className="mute" style={{ paddingTop: 20, borderTop: '1px solid var(--line)', fontSize: 17 }}>
          Di setiap bagian ada dua angka: <strong style={{ color: 'var(--ink)' }}>rencana</strong> untuk satu tahun, dan yang <strong style={{ color: 'var(--ink)' }}>sudah berjalan</strong> sampai sekarang.
        </p>
      </section>

      <Load s={s} lines={8}>
        {(b) => (
          <div className="stack" style={{ gap: 64 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
              <div className="field">
                <label htmlFor="tahun">Tahun</label>
                <select id="tahun" className="inp" style={{ width: 160 }} value={b.year} onChange={(e) => onYear(e.target.value)}>
                  {(b.years.length ? b.years : [b.year]).map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="row" style={{ gap: 16 }}>
                {b.updatedAt && <p className="mute" style={{ fontSize: 17 }}>Diperbarui {tanggal(b.updatedAt)}</p>}
                <Link className="btn btn-line" to="/dokumen?category=Laporan%20anggaran">Unduh Dokumen APBDes</Link>
              </div>
            </div>
            {b.lines.length === 0 ? (
              <Empty title={`Anggaran tahun ${b.year} belum diisi`} />
            ) : (
              <>
                <section className="g3" style={{ gap: 32 }} aria-label={`Ringkasan anggaran ${b.year}`}>
                  {CATS.map(([cat, label, verb]) => {
                    const rows = b.lines.filter((l) => l.category === cat);
                    const plan = rows.reduce((t, l) => t + l.planned, 0);
                    const real = rows.reduce((t, l) => t + l.realized, 0);
                    const pct = persen(real, plan);
                    return (
                      <div key={cat} className="stack" style={{ borderTop: '3px solid var(--ink)', paddingTop: 20, gap: 8 }}>
                        <h2 style={{ fontSize: 21 }}>{label}</h2>
                        <p className="mute" style={{ fontSize: 17 }}>{verb}</p>
                        <p className="num" style={{ fontSize: 34, fontWeight: 700 }}>{miliar(real)}</p>
                        <p className="num">dari rencana {miliar(plan)}</p>
                        <div className="bar" aria-hidden="true" style={{ background: 'var(--surface)', marginTop: 6 }}><div style={{ width: `${Math.min(100, pct)}%` }} /></div>
                        <p className="num" style={{ fontWeight: 700 }}>{pct} persen</p>
                      </div>
                    );
                  })}
                </section>
                {CATS.map(([cat, label]) => (
                  <section key={cat} className="stack" style={{ gap: 16 }}>
                    <h2 className="rule" style={{ fontSize: 26 }}>{label}</h2>
                    <table className="tbl">
                      <thead><tr><th scope="col">Rincian</th><th scope="col" className="n">Rencana (Rp)</th><th scope="col" className="n">Sudah berjalan (Rp)</th><th scope="col" className="n">Persen</th></tr></thead>
                      <tbody>
                        {b.lines.filter((l) => l.category === cat).map((l) => (
                          <tr key={l.label}>
                            <td>{l.label}</td>
                            <td className="n" data-l="Rencana">{angka(l.planned)}</td>
                            <td className="n" data-l="Sudah berjalan">{angka(l.realized)}</td>
                            <td className="n" data-l="Persen"><strong>{persen(l.realized, l.planned)} persen</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
                <p className="mute" style={{ fontSize: 17 }}>Persen di atas 100 berarti uang yang diterima lebih banyak dari rencana.</p>
              </>
            )}
          </div>
        )}
      </Load>
    </div>
  );
}

export default function Data() {
  useTitle('Data Desa');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'anggaran' ? 'anggaran' : 'penduduk';
  return (
    <div className="wrap page">
      <nav aria-label="Lokasi halaman" className="crumb"><Link to="/">Beranda</Link> <span className="mute">/ Data Desa</span></nav>
      <h1 className="h1">Data Desa</h1>
      <p className="lead" style={{ margin: '16px 0 36px' }}>Jumlah penduduk dan anggaran Desa Buduk, terbuka untuk semua warga.</p>
      <div style={{ paddingBottom: 28, borderBottom: '1px solid var(--ink)', marginBottom: 48 }}>
        <Chips label="Tampilkan:" tabs options={[['penduduk', 'Penduduk'], ['anggaran', 'Anggaran desa (APBDes)']]} value={tab} onChange={(k) => setParams({ tab: k })} />
      </div>
      {tab === 'penduduk' ? <Penduduk /> : <Anggaran year={params.get('tahun')} onYear={(y) => setParams({ tab, tahun: y })} />}
    </div>
  );
}
