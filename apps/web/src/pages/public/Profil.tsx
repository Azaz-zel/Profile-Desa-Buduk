import { useState } from 'react';
import { Link } from 'react-router';
import { Official, Profile, useLoad } from '../../api';
import { inisial } from '../../format';
import { Load, useTitle } from '../../ui';

function Face({ o, ratio = '5 / 7' }: { o: Official; ratio?: string }) {
  return o.photoUrl ? (
    <img className="photo" src={o.photoUrl} alt="" loading="lazy" style={{ aspectRatio: ratio, objectPosition: 'top' }} />
  ) : (
    <span className="initials" aria-hidden="true" style={{ aspectRatio: ratio }}>{inisial(o.name)}</span>
  );
}

function History({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const paras = text.split('\n\n');
  return (
    <div className="prose">
      {(open ? paras : paras.slice(0, 2)).map((p, i) => <p key={i}>{p}</p>)}
      {paras.length > 2 && (
        <button type="button" className="btn btn-line" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Tutup sebagian' : 'Baca sejarah lengkap'}
        </button>
      )}
    </div>
  );
}

export default function Profil() {
  useTitle('Profil Desa');
  const s = useLoad<{ profile: Profile; officials: Official[] }>('/profile');

  return (
    <>
      <section className="wrap" style={{ paddingTop: 48, paddingBottom: 56 }}>
        <nav aria-label="Lokasi halaman" className="crumb"><Link to="/">Beranda</Link> <span className="mute">/ Profil Desa</span></nav>
        <h1 className="h1">Profil Desa Buduk</h1>
        <p className="lead" style={{ marginTop: 16 }}>Sejarah desa, visi dan misi, wilayah banjar, dan perangkat desa yang melayani warga.</p>
      </section>

      <div className="wrap" style={{ paddingBottom: 112 }}>
        <Load s={s} lines={8}>
          {({ profile, officials }) => {
            const perangkat = officials.filter((o) => o.group === 'PERANGKAT');
            const [kepala, ...lain] = perangkat;
            const kelian = officials.filter((o) => o.group === 'KELIAN');
            const staf = officials.filter((o) => o.group === 'STAF');
            return (
              <div className="toc-side">
                <nav className="toc" aria-label="Isi halaman">
                  <a href="#sejarah">Sejarah</a>
                  <a href="#visi-misi">Visi dan misi</a>
                  <a href="#perangkat">Perangkat desa</a>
                  <a href="#banjar">Wilayah banjar</a>
                </nav>

                <div className="stack" style={{ gap: 96, minWidth: 0 }}>
                  <section id="sejarah" aria-labelledby="h-sejarah" className="stack" style={{ gap: 20 }}>
                    <h2 id="h-sejarah" className="rule">Sejarah</h2>
                    {profile.history ? (
                      <History text={profile.history} />
                    ) : (
                      <p className="mute">Sejarah desa belum diisi.</p>
                    )}
                  </section>

                  <section id="visi-misi" aria-labelledby="h-visi" className="stack" style={{ gap: 32 }}>
                    <h2 id="h-visi" className="rule">Visi dan misi</h2>
                    {profile.vision && (
                      <div className="box">
                        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', marginBottom: 12 }}>Visi</p>
                        <p style={{ fontSize: 32, lineHeight: 1.35, fontWeight: 700, maxWidth: '30ch' }}>“{profile.vision}”</p>
                      </div>
                    )}
                    {profile.missions.length > 0 && (
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>Misi</p>
                        <ol style={{ margin: 0, padding: 0, listStyle: 'none', borderBottom: '1px solid var(--line)' }}>
                          {profile.missions.map((m, i) => (
                            <li key={i} style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: 16, padding: '20px 0', borderTop: '1px solid var(--line)' }}>
                              <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)' }}>{i + 1}</span>
                              <span style={{ lineHeight: 1.75 }}>{m}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </section>

                  <section id="perangkat" aria-labelledby="h-perangkat" className="stack" style={{ gap: 32 }}>
                    <h2 id="h-perangkat" className="rule">Perangkat desa</h2>
                    {kepala && (
                      <div className="g2" style={{ gap: 40, alignItems: 'end' }}>
                        <Face o={kepala} ratio="1" />
                        <div className="stack" style={{ gap: 8, paddingBottom: 8 }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{kepala.position === 'Perbekel' ? 'Perbekel (Kepala Desa)' : kepala.position}</p>
                          <p style={{ fontSize: 32, lineHeight: 1.25, fontWeight: 700 }}>{kepala.name}</p>
                          {profile.greeting && <p className="mute" style={{ marginTop: 8, lineHeight: 1.75, maxWidth: '46ch', whiteSpace: 'pre-line' }}>{profile.greeting}</p>}
                        </div>
                      </div>
                    )}
                    <ul className="people">
                      {lain.map((o) => (
                        <li key={o.id}>
                          <Face o={o} />
                          <span style={{ fontWeight: 700, lineHeight: 1.35 }}>{o.name}</span>
                          <span className="mute" style={{ fontSize: 17 }}>{o.position}</span>
                        </li>
                      ))}
                    </ul>
                    {staf.length > 0 && (
                      <details className="box" style={{ padding: 24 }}>
                        <summary style={{ cursor: 'pointer', fontSize: 19, fontWeight: 700, minHeight: 48, display: 'flex', alignItems: 'center' }}>Staf desa ({staf.length} orang)</summary>
                        <ul style={{ margin: '12px 0 0', paddingLeft: 22, columns: '2 260px', lineHeight: 1.9 }}>
                          {staf.map((o) => <li key={o.id}>{o.name}</li>)}
                        </ul>
                      </details>
                    )}
                  </section>

                  <section id="banjar" aria-labelledby="h-banjar" className="stack" style={{ gap: 24 }}>
                    <h2 id="h-banjar" className="rule">Wilayah banjar</h2>
                    <p className="mute" style={{ maxWidth: '62ch' }}>Desa Buduk terbagi menjadi {kelian.length} banjar dinas. Setiap banjar dipimpin oleh seorang kelian banjar dinas.</p>
                    <dl className="banjar" style={{ borderBottom: '1px solid var(--line)' }}>
                      {kelian.map((o) => (
                        <div key={o.id}>
                          <dt style={{ fontWeight: 700 }}>{o.position.replace(/^Kelian\s+/i, '').replace(/^Banjar Dinas/i, 'Banjar')}</dt>
                          <dd className="mute" style={{ margin: 0 }}>Kelian: {o.name}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
              </div>
            );
          }}
        </Load>
      </div>
    </>
  );
}
