import { FormEvent, useState } from 'react';
import { api, Budget, BudgetCategory, Count, Population, useLoad } from '../../api';
import { angka, tanggal } from '../../format';
import { Chips, Load, useTitle } from '../../ui';

const isNum = (v: string) => /^[0-9]{1,15}$/.test(v.trim());

/** Baris yang bisa ditambah dan dihapus. Angka disimpan sebagai teks supaya bisa divalidasi sebelum dikirim. */
type Row = { label: string; values: string[] };

function RowsEditor({ title, cols, rows, onChange, addLabel }: { title: string; cols: string[]; rows: Row[]; onChange: (r: Row[]) => void; addLabel: string }) {
  const set = (i: number, patch: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const totals = cols.map((_, c) => rows.reduce((t, r) => t + (isNum(r.values[c]) ? Number(r.values[c]) : 0), 0));
  const grid = `minmax(0, 1.4fr) ${cols.map(() => 'minmax(0, 1fr)').join(' ')} auto`;
  return (
    <details open className="box" style={{ padding: '20px 24px' }}>
      <summary style={{ cursor: 'pointer', fontSize: 21, fontWeight: 700, minHeight: 52, display: 'flex', alignItems: 'center' }}>{title}</summary>
      <div className="stack" style={{ gap: 0, marginTop: 8 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, gap: '8px 12px', alignItems: 'start', padding: '12px 0', borderTop: '1px solid var(--line)' }} className="row-edit">
            <label className="stack" style={{ gap: 4 }}>
              <span className="hint" style={{ fontSize: 15 }}>Rincian</span>
              <input className="inp" value={r.label} maxLength={200} onChange={(e) => set(i, { label: e.target.value })} aria-invalid={!r.label.trim() || undefined} />
            </label>
            {cols.map((c, ci) => (
              <label key={c} className="stack" style={{ gap: 4 }}>
                <span className="hint" style={{ fontSize: 15 }}>{c}</span>
                <input className="inp money" inputMode="numeric" value={r.values[ci]} onChange={(e) => set(i, { values: r.values.map((v, k) => (k === ci ? e.target.value : v)) })} aria-invalid={!isNum(r.values[ci]) || undefined} />
                {!isNum(r.values[ci]) && <span className="err" style={{ fontSize: 15 }}>Hanya angka, tanpa titik</span>}
              </label>
            ))}
            <button type="button" className="btn btn-del" style={{ marginTop: 27 }} aria-label={`Hapus baris ${r.label || i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>Hapus</button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, padding: '14px 0', borderTop: '2px solid var(--ink)', fontWeight: 700 }}>
          <span>Jumlah</span>
          {totals.map((t, i) => <span key={i} className="money">{angka(t)}</span>)}
          <span />
        </div>
        <button type="button" className="btn btn-line" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...rows, { label: '', values: cols.map(() => '0') }])}>{addLabel}</button>
      </div>
    </details>
  );
}

function SaveBar({ busy, dirty, msg }: { busy: boolean; dirty: boolean; msg: { ok: boolean; text: string } | null }) {
  return (
    <div className="sticky-save">
      <button type="submit" className="btn btn-dark btn-big" disabled={busy}>{busy ? 'Sedang menyimpan...' : 'Simpan Perubahan'}</button>
      {msg ? <p role={msg.ok ? 'status' : 'alert'} style={{ fontWeight: 700, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</p>
        : dirty && <p style={{ fontWeight: 700, color: 'var(--amber)' }}>Ada perubahan yang belum disimpan</p>}
    </div>
  );
}

const CATS: [BudgetCategory, string][] = [['PENDAPATAN', 'Uang masuk (pendapatan)'], ['BELANJA', 'Uang keluar (belanja)'], ['PEMBIAYAAN', 'Sisa anggaran tahun lalu (SILPA)']];

function BudgetForm({ b, year }: { b: Budget; year: number }) {
  const init = () => Object.fromEntries(CATS.map(([c]) => [c, b.lines.filter((l) => l.category === c).map((l) => ({ label: l.label, values: [String(l.planned), String(l.realized)] }))])) as Record<BudgetCategory, Row[]>;
  const [rows, setRows] = useState(init);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const all = CATS.flatMap(([c]) => rows[c].map((r) => ({ category: c, label: r.label.trim(), planned: r.values[0].trim(), realized: r.values[1].trim() })));
    if (all.some((l) => !l.label || !isNum(l.planned) || !isNum(l.realized))) return setMsg({ ok: false, text: 'Perbaiki isian yang ditandai merah dulu.' });
    setBusy(true);
    try {
      await api(`/admin/budget/${year}`, { method: 'PUT', body: { lines: all } });
      setDirty(false);
      setMsg({ ok: true, text: 'Tersimpan. Halaman Data Desa sudah diperbarui.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="stack" style={{ gap: 20 }}>
      {b.updatedAt && <p className="mute">Terakhir diperbarui {tanggal(b.updatedAt)}</p>}
      {CATS.map(([c, label]) => (
        <RowsEditor key={c} title={label} cols={['Rencana (Rp)', c === 'PENDAPATAN' ? 'Sudah diterima (Rp)' : c === 'BELANJA' ? 'Sudah dipakai (Rp)' : 'Sudah masuk (Rp)']} rows={rows[c]} addLabel="Tambah Rincian"
          onChange={(r) => { setRows({ ...rows, [c]: r }); setDirty(true); setMsg(null); }} />
      ))}
      <SaveBar busy={busy} dirty={dirty} msg={msg} />
    </form>
  );
}

function Anggaran() {
  const [year, setYear] = useState<number | null>(null);
  const s = useLoad<Budget>(`/budget${year ? `?year=${year}` : ''}`);
  const now = new Date().getFullYear();
  return (
    <Load s={s}>
      {(b) => {
        const options = [...new Set([now + 1, now, ...b.years])].sort((a, z) => z - a);
        return (
          <div className="stack" style={{ gap: 20 }}>
            <div className="field" style={{ maxWidth: 200 }}>
              <label htmlFor="tahun">Tahun anggaran</label>
              <select id="tahun" className="inp" value={b.year} onChange={(e) => setYear(Number(e.target.value))}>
                {options.map((y) => <option key={y} value={y}>{y}{b.years.includes(y) ? '' : ' (belum diisi)'}</option>)}
              </select>
            </div>
            <BudgetForm key={b.year} b={b} year={b.year} />
          </div>
        );
      }}
    </Load>
  );
}

const toRows = (c: Count[]): Row[] => c.map((x) => ({ label: x.label, values: [String(x.n)] }));
const toCounts = (r: Row[]) => r.map((x) => ({ label: x.label.trim(), n: Number(x.values[0]) }));
const LISTS: ['religion' | 'occupation' | 'education' | 'age', string][] = [['religion', 'Agama'], ['occupation', 'Pekerjaan'], ['education', 'Pendidikan terakhir'], ['age', 'Kelompok umur']];

function PopulationForm({ p }: { p: Population }) {
  const [male, setMale] = useState(String(p.male));
  const [female, setFemale] = useState(String(p.female));
  const [lists, setLists] = useState(() => Object.fromEntries(LISTS.map(([k]) => [k, toRows(p[k])])) as Record<(typeof LISTS)[number][0], Row[]>);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const touch = () => { setDirty(true); setMsg(null); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const bad = !isNum(male) || !isNum(female) || LISTS.some(([k]) => lists[k].some((r) => !r.label.trim() || !isNum(r.values[0])));
    if (bad) return setMsg({ ok: false, text: 'Perbaiki isian yang ditandai merah dulu.' });
    setBusy(true);
    try {
      await api('/admin/population', { method: 'PUT', body: { male: Number(male), female: Number(female), ...Object.fromEntries(LISTS.map(([k]) => [k, toCounts(lists[k])])) } });
      setDirty(false);
      setMsg({ ok: true, text: 'Tersimpan. Halaman Data Desa sudah diperbarui.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="stack" style={{ gap: 20 }}>
      <div className="box stack" style={{ gap: 20 }}>
        <h2 style={{ fontSize: 22 }}>Jumlah penduduk</h2>
        <div className="g2" style={{ gap: 20 }}>
          <div className="field"><label htmlFor="lk">Laki-laki</label><input id="lk" className="inp money" inputMode="numeric" value={male} onChange={(e) => { setMale(e.target.value); touch(); }} aria-invalid={!isNum(male) || undefined} /></div>
          <div className="field"><label htmlFor="pr">Perempuan</label><input id="pr" className="inp money" inputMode="numeric" value={female} onChange={(e) => { setFemale(e.target.value); touch(); }} aria-invalid={!isNum(female) || undefined} /></div>
        </div>
        <p style={{ fontSize: 20 }}>Total penduduk: <strong className="num">{isNum(male) && isNum(female) ? angka(Number(male) + Number(female)) : 'periksa isian'}</strong> orang <span className="mute" style={{ fontSize: 17 }}>(dihitung otomatis)</span></p>
      </div>
      {LISTS.map(([k, title]) => (
        <RowsEditor key={k} title={title} cols={['Jumlah orang']} rows={lists[k]} addLabel="Tambah Baris" onChange={(r) => { setLists({ ...lists, [k]: r }); touch(); }} />
      ))}
      <p className="hint">Kalau satu bagian dikosongkan, website menampilkan “data sedang diperiksa ulang”.</p>
      <SaveBar busy={busy} dirty={dirty} msg={msg} />
    </form>
  );
}

export default function DataEdit() {
  useTitle('Data dan anggaran');
  const [tab, setTab] = useState<'apb' | 'pend'>('apb');
  const pop = useLoad<Population>(tab === 'pend' ? '/population' : null);
  return (
    <>
      <div>
        <h1 className="ah1">Data dan anggaran</h1>
        <p className="mute" style={{ marginTop: 8, fontSize: 19 }}>Angka di sini langsung tampil di halaman Data Desa. Ketik angka saja, tanpa titik atau “Rp”.</p>
      </div>
      <Chips label="Ubah data:" options={[['apb', 'Anggaran desa (APBDes)'], ['pend', 'Penduduk']]} value={tab} onChange={setTab} />
      {tab === 'apb' ? <Anggaran /> : <Load s={pop}>{(p) => <PopulationForm p={p} />}</Load>}
    </>
  );
}
