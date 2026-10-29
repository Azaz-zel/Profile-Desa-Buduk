import { Link, useParams } from 'react-router';
import { PostFull, useLoad } from '../../api';
import { jam, tanggal, tanggalHari } from '../../format';
import { Load, useTitle } from '../../ui';

const LABEL = { BERITA: 'Berita', PENGUMUMAN: 'Pengumuman', AGENDA: 'Jadwal kegiatan' } as const;
const TAB = { BERITA: 'berita', PENGUMUMAN: 'pengumuman', AGENDA: 'agenda' } as const;

export default function KabarDetail() {
  const { id } = useParams();
  const s = useLoad<PostFull>(`/posts/${Number(id) || 0}`);
  useTitle(s.data?.title ?? 'Kabar Desa');

  return (
    <article className="wrap page" style={{ maxWidth: 860 }}>
      <nav aria-label="Lokasi halaman" className="crumb"><Link to="/">Beranda</Link> <span className="mute">/</span> <Link to="/kabar">Kabar Desa</Link></nav>
      <Load s={s} lines={8}>
        {(p) => (
          <div className="stack" style={{ gap: 24 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)' }}>{LABEL[p.type]}{p.type !== 'AGENDA' && `, ${tanggal(p.publishedAt)}`}</p>
            <h1 style={{ fontSize: 40, lineHeight: 1.2, fontWeight: 700 }}>{p.title}</h1>
            {p.type === 'AGENDA' && p.eventAt && (
              <dl className="box" style={{ margin: 0, padding: 24, display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '8px 20px' }}>
                <dt className="mute">Hari</dt><dd style={{ margin: 0, fontWeight: 700 }}>{tanggalHari(p.eventAt)}, pukul {jam(p.eventAt)} WITA</dd>
                {p.eventPlace && <><dt className="mute">Tempat</dt><dd style={{ margin: 0 }}>{p.eventPlace}</dd></>}
                {p.organizer && <><dt className="mute">Penyelenggara</dt><dd style={{ margin: 0 }}>{p.organizer}</dd></>}
              </dl>
            )}
            {p.imageUrl && <img className="photo" src={p.imageUrl} alt="" style={{ maxHeight: 720, objectFit: 'contain', background: 'var(--surface)' }} />}
            {/* teks ditampilkan apa adanya (bukan HTML) supaya isian admin tidak bisa menyisipkan kode */}
            <div className="prose">{p.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
            <Link className="btn btn-line" to={`/kabar?tab=${TAB[p.type]}`} style={{ alignSelf: 'flex-start' }}>Kembali ke daftar {LABEL[p.type].toLowerCase()}</Link>
          </div>
        )}
      </Load>
    </article>
  );
}
