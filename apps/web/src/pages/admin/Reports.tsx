import { FormEvent, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { api, ReportStatus, ReportType, useLoad } from '../../api';
import { tanggal } from '../../format';
import { Chips, Empty, Load, useTitle } from '../../ui';

interface Report {
  id: number; code: string; type: ReportType; status: ReportStatus; body: string; name: string; phone: string; banjar: string;
  reply: string | null; createdAt: string; summary: string; hasPhoto: boolean;
}

const LABEL: Record<ReportStatus, string> = { BARU: 'Baru', DIBACA: 'Sudah dibaca', DIKERJAKAN: 'Sedang dikerjakan', SELESAI: 'Selesai' };
const TAG: Record<ReportStatus, string> = { BARU: 'tag tag-red', DIBACA: 'tag tag-gray', DIKERJAKAN: 'tag tag-amber', SELESAI: 'tag tag-green' };
const JENIS: Record<ReportType, string> = { PENGADUAN: 'Pengaduan', DOKUMEN: 'Minta dokumen', USULAN: 'Usulan' };
type Filter = ReportStatus | 'SEMUA';

// nomor 08xx menjadi 628xx untuk tautan wa.me
const waLink = (phone: string) => `https://wa.me/${phone.replace(/^0/, '62')}`;

function Detail({ r, onSaved }: { r: Report; onSaved: (r: Report) => void }) {
  const [status, setStatus] = useState<ReportStatus>(r.status === 'BARU' ? 'DIBACA' : r.status);
  const [reply, setReply] = useState(r.reply ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [photo, setPhoto] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const saved = await api<Report>(`/admin/reports/${r.id}`, { method: 'PATCH', body: { status, reply } });
      onSaved(saved);
      setMsg({ ok: true, text: 'Tersimpan. Pelapor bisa melihat status dan pesan ini saat mengecek laporannya.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const waText = encodeURIComponent(`Halo Bapak/Ibu ${r.name}. Kami dari Kantor Desa Buduk mengenai laporan ${r.code}. ${reply}`.trim());

  return (
    <section aria-label="Isi laporan" className="box stack" style={{ gap: 24 }}>
      <div>
        <p className="cap">{r.code}, {JENIS[r.type]}, masuk {tanggal(r.createdAt)}</p>
        <h2 style={{ fontSize: 26, lineHeight: 1.3, marginTop: 4 }}>{r.summary}</h2>
      </div>
      <p style={{ lineHeight: 1.7, whiteSpace: 'pre-line' }}>{r.body}</p>
      {r.hasPhoto && (photo ? (
        <img src={`/api/admin/reports/${r.id}/photo`} alt="Foto kiriman pelapor" style={{ maxWidth: 480, border: '1px solid var(--line)' }} />
      ) : (
        <button type="button" className="btn btn-line" style={{ alignSelf: 'flex-start' }} onClick={() => setPhoto(true)}>Lihat Foto Kiriman Warga</button>
      ))}
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(110px, auto) minmax(0, 1fr)', gap: '8px 16px', padding: '20px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <dt className="mute">Pelapor</dt><dd style={{ margin: 0, fontWeight: 700 }}>{r.name}</dd>
        <dt className="mute">Banjar</dt><dd style={{ margin: 0 }}>{r.banjar}</dd>
        <dt className="mute">WhatsApp</dt>
        <dd style={{ margin: 0 }}>{r.phone} <a href={`${waLink(r.phone)}?text=${waText}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, marginLeft: 8 }}>Chat pelapor</a></dd>
      </dl>
      <form onSubmit={save} className="stack" style={{ gap: 20 }}>
        <fieldset className="field">
          <legend style={{ fontSize: 19, marginBottom: 10 }}>Ubah status laporan</legend>
          <div className="opts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {(['DIBACA', 'DIKERJAKAN', 'SELESAI', 'BARU'] as ReportStatus[]).map((k) => (
              <label key={k} className="opt" style={{ alignItems: 'center' }}>
                <input type="radio" name="status" checked={status === k} onChange={() => setStatus(k)} />
                <span style={{ fontWeight: 700 }}>{LABEL[k]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="pesan" style={{ fontSize: 19 }}>Pesan untuk pelapor</label>
          <p id="h-pesan" className="hint">Tampil saat warga mengecek laporannya. Tulis dengan bahasa sederhana. Untuk mengirim lewat WhatsApp, tekan “Chat pelapor” setelah menyimpan.</p>
          <textarea id="pesan" className="inp" maxLength={2000} style={{ minHeight: 120 }} aria-describedby="h-pesan" value={reply} onChange={(e) => setReply(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 16 }}>
          <button type="submit" className="btn btn-dark" disabled={busy}>{busy ? 'Sedang menyimpan...' : 'Simpan'}</button>
          {msg && <p role={msg.ok ? 'status' : 'alert'} style={{ fontWeight: 700, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</p>}
        </div>
      </form>
    </section>
  );
}

export default function Reports() {
  useTitle('Pengaduan warga');
  const { refreshSummary } = useOutletContext<{ refreshSummary: () => void }>();
  const [filter, setFilter] = useState<Filter>('BARU');
  const s = useLoad<Report[]>(`/admin/reports${filter === 'SEMUA' ? '' : `?status=${filter}`}`);
  const [selId, setSelId] = useState<number | null>(null);
  const list = s.data ?? [];
  const sel = list.find((r) => r.id === selId) ?? list[0];

  useEffect(() => setSelId(null), [filter]);

  return (
    <>
      <div>
        <h1 className="ah1">Pengaduan warga</h1>
        <p className="mute" style={{ marginTop: 8, fontSize: 19 }}>Pilih laporan untuk membaca dan menanggapinya.</p>
      </div>
      <Chips label="Tampilkan:" options={[['BARU', 'Baru'], ['DIBACA', 'Sudah dibaca'], ['DIKERJAKAN', 'Sedang dikerjakan'], ['SELESAI', 'Selesai'], ['SEMUA', 'Semua']]} value={filter} onChange={setFilter} />
      <Load s={s}>
        {() =>
          list.length === 0 ? (
            <Empty title="Tidak ada laporan di sini"><p className="mute">Belum ada laporan dengan status ini.</p></Empty>
          ) : (
            <div className="split">
              <div className="stack" style={{ gap: 10 }}>
                {list.map((r) => (
                  <button key={r.id} type="button" className="pick" aria-pressed={r.id === sel?.id} onClick={() => setSelId(r.id)}>
                    <span className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                      <span className={TAG[r.status]}>{LABEL[r.status]}</span>
                      <span className="cap">{tanggal(r.createdAt)}</span>
                    </span>
                    <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{r.summary}</span>
                    <span className="cap">{JENIS[r.type]}, {r.banjar}</span>
                  </button>
                ))}
              </div>
              {sel && (
                <Detail
                  key={sel.id}
                  r={sel}
                  onSaved={(saved) => {
                    s.setData(list.map((x) => (x.id === saved.id ? saved : x)));
                    refreshSummary();
                  }}
                />
              )}
            </div>
          )
        }
      </Load>
    </>
  );
}
