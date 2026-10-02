import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { api, fmtTgl } from '../api'
import { useSession } from '../store'
import { PageHeader, Card, Spinner, ErrorBox, SuccessBox } from '../components/ui'
import { CalendarDays, FileUp, Trash2 } from 'lucide-react'

// =============================================================
// Fitur 7 — Jurnal Harian Digital + kalender status harian
// =============================================================

interface Jurnal {
  id: number
  dayNumber: number
  activity: string
  obstacle: string
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  date: string
}

const EKSTENSI = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4']
const MAX_MB = 10

export default function Fitur7() {
  const { me, refresh } = useSession()
  const [entries, setEntries] = useState<Jurnal[]>([])
  const [nextDay, setNextDay] = useState(1)
  const [project, setProject] = useState<{ start: string; days: number } | null>(null)
  const [kal, setKal] = useState<{ submittedDates: string[]; project: { start: string; days: number }; today: string } | null>(null)
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 7))
  const [activity, setActivity] = useState('')
  const [obstacle, setObstacle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function loadAll() {
    const [j, k] = await Promise.all([api<{ entries: Jurnal[]; nextDay: number; project: { start: string; days: number } }>('/jurnal'), api<{ submittedDates: string[]; project: { start: string; days: number }; today: string }>('/jurnal/kalender')])
    setEntries(j.entries)
    setNextDay(j.nextDay)
    setProject(j.project)
    setKal(k)
    setLoaded(true)
  }

  useEffect(() => {
    loadAll().catch(() => setErr('Gagal memuat jurnal.'))
  }, [])

  function pilihFile(e: ChangeEvent<HTMLInputElement>) {
    setErr(''); setOk('')
    const f = e.target.files?.[0]
    if (!f) return setFile(null)
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!EKSTENSI.includes(ext)) {
      setErr(`Format .${ext} tidak didukung. Gunakan: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, atau MP4.`)
      e.target.value = ''
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErr(`Ukuran berkas maksimal ${MAX_MB} MB.`)
      e.target.value = ''
      return
    }
    setFile(f)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!activity.trim()) return setErr('Ceritakan dulu apa yang kamu kerjakan hari ini ya.')
    setBusy(true)
    try {
      const form = new FormData()
      form.append('activity', activity)
      form.append('obstacle', obstacle)
      if (file) form.append('file', file)
      await api('/jurnal', { form })
      setOk(`📖 Jurnal hari ke-${nextDay} tersimpan! Sampai jumpa besok ya.`)
      setActivity(''); setObstacle(''); setFile(null)
      const input = document.getElementById('file-jurnal') as HTMLInputElement | null
      if (input) input.value = ''
      await loadAll()
      await refresh()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal menyimpan jurnal.')
    } finally {
      setBusy(false)
    }
  }

  const kalender = useMemo(() => {
    if (!kal) return null
    const [y, m] = month.split('-').map(Number)
    const first = new Date(Date.UTC(y, m - 1, 1))
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    // Senin = 0 … Minggu = 6
    const offset = (first.getUTCDay() + 6) % 7
    const cells: ({ date: string; status: 'ok' | 'miss' | 'future' | 'before' } | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`
      const submitted = kal.submittedDates.includes(date)
      const start = kal.project.start
      const before = date < start
      const status = submitted ? 'ok' : date > kal.today ? 'future' : before ? 'before' : 'miss'
      cells.push({ date, status })
    }
    return { cells, label: first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }
  }, [kal, month])

  if (!loaded) return <Spinner />

  const belumHariIni = kal && !kal.submittedDates.includes(kal.today)

  return (
    <div className="animate-fadeIn">
      <PageHeader emoji="📔" title="Fitur 7 · Jurnal Harian" subtitle="Wajib diisi SETIAP hari sebelum pukul 23.59 WIB. Hari tanpa jurnal ditandai merah di kalender!" badge={`Lanjut hari ke-${nextDay}`} />

      {belumHariIni && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          ⚠️ Kamu belum mengisi jurnal hari ini! Segera isi sebelum pukul 23.59.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* ===== form ===== */}
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-extrabold text-stone-700">
              <span className="badge bg-orange-100 text-orange-700">Hari ke-{nextDay}</span> {fmtTgl(new Date().toISOString())}
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Apa yang kamu kerjakan hari ini? *</label>
                <textarea className="input min-h-[110px] resize-y" placeholder="cth. Kelompok saya wawancara penjaga kantin dan mencatat kebutuhan bahan…" value={activity} onChange={(e) => setActivity(e.target.value)} maxLength={2000} />
              </div>
              <div>
                <label className="label">Kendala apa yang kamu hadapi?</label>
                <textarea className="input min-h-[80px] resize-y" placeholder="cth. Bingung membedakan modal dan harga jual…" value={obstacle} onChange={(e) => setObstacle(e.target.value)} maxLength={2000} />
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><FileUp className="h-4 w-4 text-orange-400" /> Lampiran dokumentasi (opsional · maks {MAX_MB} MB)</label>
                <input id="file-jurnal" type="file" onChange={pilihFile} className="input !py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-orange-700"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4" />
                {file && <p className="mt-1.5 text-xs text-green-600">📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
                <p className="mt-1 text-[11px] text-stone-400">Format: JPG, PNG, PDF, DOC(X), XLS(X), PPT(X), MP4 — misal foto dokumentasi kerja kelompok.</p>
              </div>
              {err && <ErrorBox message={err} />}
              {ok && <SuccessBox message={ok} />}
              <button type="submit" className="btn-primary w-full sm:w-auto !px-7" disabled={busy}>
                {busy ? 'Menyimpan…' : '📕 Simpan Jurnal Hari Ini'}
              </button>
            </form>
          </Card>

          {/* riwayat */}
          <Card>
            <h2 className="mb-3 font-extrabold text-stone-700">🕘 Riwayat Jurnalmu ({entries.length} hari)</h2>
            {entries.length === 0 ? (
              <p className="text-sm text-stone-400">Belum ada jurnal — mulai hari ini! 🌱</p>
            ) : (
              <div className="space-y-3">
                {entries.map((j) => (
                  <div key={j.id} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="badge bg-orange-500 text-white">Hari ke-{j.dayNumber}</span>
                      <span className="text-xs text-stone-400">{fmtTgl(j.date)}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{j.activity}</p>
                    {j.obstacle && (
                      <p className="mt-1.5 rounded-lg bg-white px-3 py-2 text-xs text-stone-500">😮‍💨 <b>Kendala:</b> {j.obstacle}</p>
                    )}
                    {j.fileUrl && (
                      <a href={j.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600 underline">
                        📎 {j.fileName}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ===== kalender ===== */}
        <Card className="h-fit">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold text-stone-700">
            <CalendarDays className="h-4.5 w-4.5 h-5 w-5 text-orange-500" /> Kalender Jurnal
          </h2>
          <div className="mb-3 flex items-center justify-between">
            <button className="btn-ghost !min-h-0 !px-2.5 !py-1" onClick={() => gantiBulan(-1)} aria-label="Bulan sebelumnya">←</button>
            <span className="text-sm font-extrabold text-stone-700">{kalender?.label}</span>
            <button className="btn-ghost !min-h-0 !px-2.5 !py-1" onClick={() => gantiBulan(1)} aria-label="Bulan berikutnya">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
              <div key={d} className="pb-1 text-[10px] font-extrabold uppercase text-stone-400">{d}</div>
            ))}
            {kalender?.cells.map((c, i) =>
              c === null ? (
                <div key={`e${i}`} />
              ) : (
                <div
                  key={c.date}
                  title={keteranganStatus(c.status)}
                  className={`flex aspect-square items-center justify-center rounded-lg text-xs font-bold ${
                    c.status === 'ok'
                      ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                      : c.status === 'miss'
                        ? 'bg-red-100 text-red-600 ring-1 ring-red-200'
                        : 'bg-stone-50 text-stone-300'
                  } ${c.date === kal?.today ? 'outline outline-2 outline-orange-400' : ''}`}
                >
                  {Number(c.date.slice(8))}
                </div>
              ),
            )}
          </div>
          <div className="mt-4 space-y-1.5 text-[11px] text-stone-500">
            <p>🟢 Hijau = jurnal terisi</p>
            <p>🔴 Merah = <b>Tidak Ada Kemajuan</b> (tidak mengisi)</p>
            <p>⚪ Abu = belum wajib / belum dimulai</p>
            {project && <p className="pt-1 text-stone-400">Proyek: hari ke-{Math.min(Math.max(sisaHari(project.start), 1), project.days)} dari {project.days}</p>}
          </div>
        </Card>
      </div>
    </div>
  )

  function gantiBulan(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(Date.UTC(y, m - 1 + delta, 1))
    setMonth(d.toISOString().slice(0, 7))
  }
}

function sisaHari(start: string): number {
  const t = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  return Math.round((new Date(t + 'T00:00:00Z').getTime() - new Date(start + 'T00:00:00Z').getTime()) / 86400000) + 1
}

function keteranganStatus(s: 'ok' | 'miss' | 'future' | 'before'): string {
  return s === 'ok' ? 'Jurnal terisi ✅' : s === 'miss' ? 'Tidak ada kemajuan 🔴' : 'Belum wajib'
}
