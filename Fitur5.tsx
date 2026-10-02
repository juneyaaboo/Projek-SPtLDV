import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, fmtRupiah, BAHAN_OPSI, LEVELS, type InterviewData } from '../api'
import { useSession } from '../store'
import { PageHeader, Card, Spinner, ErrorBox, SuccessBox } from '../components/ui'
import { Plus, Trash2, Save, Mic } from 'lucide-react'

// =============================================================
// Fitur 5 — Form Wawancara Terstruktur (FLEKSIBEL / tidak di-hardcode)
// =============================================================

interface Row {
  name: string
  unit: string
  perA: string
  perB: string
  total: string
}

const emptyRow = (name = '', unit = 'gram'): Row => ({ name, unit, perA: '', perB: '', total: '' })

export default function Fitur5() {
  const [data, setData] = useState<InterviewData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [productA, setProductA] = useState('')
  const [productB, setProductB] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow('Tepung'), emptyRow('Telur', 'butir')])
  const [timeA, setTimeA] = useState(''); const [timeB, setTimeB] = useState(''); const [timeTotal, setTimeTotal] = useState('')
  const [timeUnit, setTimeUnit] = useState('menit')
  const [priceA, setPriceA] = useState(''); const [costA, setCostA] = useState('')
  const [priceB, setPriceB] = useState(''); const [costB, setCostB] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ data: InterviewData | null }>('/wawancara')
      .then((d) => {
        if (d.data) {
          setData(d.data)
          setProductA(d.data.productA)
          setProductB(d.data.productB)
          setRows(
            d.data.ingredients.map((i) => ({
              name: i.name,
              unit: i.unit,
              perA: String(i.perA),
              perB: String(i.perB),
              total: String(i.total),
            })),
          )
          setTimeA(String(d.data.timePerA)); setTimeB(String(d.data.timePerB)); setTimeTotal(String(d.data.timeTotal))
          setTimeUnit(d.data.timeUnit)
          setPriceA(String(d.data.priceA)); setCostA(String(d.data.costA))
          setPriceB(String(d.data.priceB)); setCostB(String(d.data.costB))
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  const profitA = useMemo(() => Number(priceA) - Number(costA), [priceA, costA])
  const profitB = useMemo(() => Number(priceB) - Number(costB), [priceB, costB])

  function setRow(i: number, patch: Partial<Row>) {
    setRows(rows.map((r, ri) => (ri === i ? { ...r, ...patch } : r)))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(''); setOk('')
    // validasi ringan di sisi klien
    if (!productA.trim() || !productB.trim()) return setErr('Nama Produk A dan B wajib diisi ya.')
    if (rows.length < 2) return setErr('Minimal ada 2 bahan.')
    setBusy(true)
    try {
      const res = await api<{ profitA: number; profitB: number }>('/wawancara', {
        body: {
          productA,
          productB,
          ingredients: rows.map((r) => ({ name: r.name, unit: r.unit, perA: Number(r.perA), perB: Number(r.perB), total: Number(r.total) })),
          timePerA: Number(timeA),
          timePerB: Number(timeB),
          timeTotal: Number(timeTotal),
          timeUnit,
          priceA: Number(priceA),
          costA: Number(costA),
          priceB: Number(priceB),
          costB: Number(costB),
        },
      })
      setOk(`Data wawancara tersimpan! 🎉 Keuntungan: ${productA} ${fmtRupiah(res.profitA)}/unit, ${productB} ${fmtRupiah(res.profitB)}/unit. Lanjut ke Fitur 6 untuk menyusun model!`)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal menyimpan.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <Spinner />

  return (
    <div className="animate-fadeIn">
      <PageHeader
        emoji="🎤"
        title="Fitur 5 · Form Wawancara Terstruktur"
        subtitle="Isi data hasil wawancara dapur kelompokmu. Semua kolom bisa disesuaikan — produk, bahan, satuan, dan waktu."
        badge="Proyek kelompok"
      />

      {data && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          📋 Data sebelumnya sudah tersimpan dan sudah terisi otomatis di bawah. Kamu bisa memperbaruinya —{" "}
          <b>hati-hati</b>, perubahan data mengubah kunci model di Fitur 6.
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        {/* === produk === */}
        <Card>
          <h2 className="mb-3 font-extrabold text-stone-700">🍽️ Nama Produk</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nama Produk A (jadi variabel x)</label>
              <input className="input" placeholder="cth. Kue Lapis" value={productA} onChange={(e) => setProductA(e.target.value)} />
            </div>
            <div>
              <label className="label">Nama Produk B (jadi variabel y)</label>
              <input className="input" placeholder="cth. Risoles" value={productB} onChange={(e) => setProductB(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* === bahan === */}
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-extrabold text-stone-700">🧺 Kebutuhan Bahan</h2>
            <span className="text-xs text-stone-400">baris bisa ditambah / dihapus (min. 2)</span>
          </div>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_auto]">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[11px] font-bold text-stone-500">Bahan</label>
                    <input
                      className="input !min-h-[42px] !py-2"
                      list="bahan-opsi"
                      placeholder="cth. Mentega"
                      value={r.name}
                      onChange={(e) => setRow(i, { name: e.target.value })}
                    />
                    <datalist id="bahan-opsi">
                      {BAHAN_OPSI.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-stone-500">Satuan</label>
                    <select className="input !min-h-[42px] !py-2" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })}>
                      {LEVELS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                      {!LEVELS.includes(r.unit as never) && r.unit && <option value={r.unit}>{r.unit}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-stone-500">Per {productA || 'A'}</label>
                    <input className="input !min-h-[42px] !py-2" inputMode="decimal" placeholder="0" value={r.perA} onChange={(e) => setRow(i, { perA: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-stone-500">Per {productB || 'B'}</label>
                    <input className="input !min-h-[42px] !py-2" inputMode="decimal" placeholder="0" value={r.perB} onChange={(e) => setRow(i, { perB: e.target.value })} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[11px] font-bold text-stone-500">Total per hari</label>
                    <input className="input !min-h-[42px] !py-2" inputMode="decimal" placeholder="0" value={r.total} onChange={(e) => setRow(i, { total: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex items-end sm:col-span-1">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-40 sm:w-auto"
                      onClick={() => setRows(rows.filter((_, ri) => ri !== i))}
                      disabled={rows.length <= 2}
                      aria-label="Hapus baris bahan"
                    >
                      <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-secondary mt-3 w-full sm:w-auto"
            onClick={() => setRows([...rows, emptyRow()])}
            disabled={rows.length >= 12}
          >
            <Plus className="h-4 w-4" /> Tambah Bahan
          </button>
        </Card>

        {/* === waktu === */}
        <Card>
          <h2 className="mb-3 font-extrabold text-stone-700">⏱️ Waktu Produksi</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Waktu membuat 1 {productA || 'Produk A'}</label>
              <div className="flex gap-2">
                <input className="input" inputMode="decimal" placeholder="0" value={timeA} onChange={(e) => setTimeA(e.target.value)} />
                <select className="input !w-32" value={timeUnit === 'jam' ? 'jam' : 'menit'} onChange={(e) => setTimeUnit(e.target.value)}>
                  <option value="menit">menit</option>
                  <option value="jam">jam</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Waktu membuat 1 {productB || 'Produk B'}</label>
              <div className="flex gap-2">
                <input className="input" inputMode="decimal" placeholder="0" value={timeB} onChange={(e) => setTimeB(e.target.value)} />
                <select className="input !w-32" value={timeUnit === 'jam' ? 'jam' : 'menit'} onChange={(e) => setTimeUnit(e.target.value)} disabled>
                  <option value="menit">menit</option>
                  <option value="jam">jam</option>
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Total waktu kerja kelompok per hari</label>
              <div className="flex gap-2">
                <input className="input" inputMode="decimal" placeholder="0" value={timeTotal} onChange={(e) => setTimeTotal(e.target.value)} />
                <select className="input !w-32" value={timeUnit === 'jam' ? 'jam' : 'menit'} onChange={(e) => setTimeUnit(e.target.value)}>
                  <option value="menit">menit</option>
                  <option value="jam">jam</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* === harga & untung === */}
        <Card>
          <h2 className="mb-3 font-extrabold text-stone-700">💰 Harga, Modal & Keuntungan</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { p: 'A', price: priceA, setP: setPriceA, cost: costA, setC: setCostA, untung: profitA, nama: productA || 'Produk A' },
              { p: 'B', price: priceB, setP: setPriceB, cost: costB, setC: setCostB, untung: profitB, nama: productB || 'Produk B' },
            ].map((s) => (
              <div key={s.p} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                <div className="mb-2 text-sm font-extrabold text-stone-700">{s.nama}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label !mb-1 !text-xs">Harga jual (Rp)</label>
                    <input className="input" inputMode="numeric" placeholder="0" value={s.price} onChange={(e) => s.setP(e.target.value)} />
                  </div>
                  <div>
                    <label className="label !mb-1 !text-xs">Modal / unit (Rp)</label>
                    <input className="input" inputMode="numeric" placeholder="0" value={s.cost} onChange={(e) => s.setC(e.target.value)} />
                  </div>
                </div>
                <div className={`mt-3 rounded-xl px-3 py-2 text-center text-sm font-extrabold ${s.untung > 0 ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                  Keuntungan: {isFinite(s.untung) && s.untung > 0 ? fmtRupiah(s.untung) : '—'}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {err && <ErrorBox message={err} />}
        {ok && <SuccessBox message={ok} />}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary !px-7" disabled={busy}>
            <Save className="h-4 w-4" /> {busy ? 'Menyimpan…' : data ? 'Perbarui Data Wawancara' : 'Simpan Data Wawancara'}
          </button>
          {ok && (
            <Link to="/fitur/6" className="btn-secondary">
              <Mic className="h-4 w-4" /> Lanjut ke Fitur 6 →
            </Link>
          )}
        </div>
      </form>
    </div>
  )
}
