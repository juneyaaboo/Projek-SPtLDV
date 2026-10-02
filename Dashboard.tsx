import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, fmtRupiah } from '../../api'
import { PageHeader, Card, Spinner, ErrorBox, SuccessBox } from '../../components/ui'
import { ChevronDown, ChevronRight, Bell, RefreshCw } from 'lucide-react'

// =============================================================
// Fitur 8 — Dashboard Monitoring Guru
// =============================================================

interface StudentStatus {
  id: number
  fullName: string
  groupName: string | null
  groupId: number | null
  pinEntered: boolean
  quizBest: number | null
  quizPassed: boolean
  interviewDone: boolean
  ineqAttempts: number
  ineqSolved: boolean
  journalCount: number
  journalToday: boolean
  portfolioDone: boolean
  reflectionDone: boolean
  lastActivity: string
  status: 'green' | 'yellow' | 'red'
  behind: string[]
}
interface GroupData {
  id: number
  name: string
  pin: string
  students: StudentStatus[]
}
interface Ringkasan {
  totalGroups: number
  totalStudents: number
  ungrouped: number
  dayX: number
  dayY: number
  avgQuiz: number | null
  passedCount: number
  journalTodayCount: number
  redCount: number
  yellowCount: number
}

const STATUS_LABEL = {
  green: { t: '🟢 Lancar', c: 'bg-green-100 text-green-700' },
  yellow: { t: '🟡 Lambat', c: 'bg-amber-100 text-amber-700' },
  red: { t: '🔴 Macet', c: 'bg-red-100 text-red-600' },
}

export default function GuruDashboard() {
  const [ring, setRing] = useState<Ringkasan | null>(null)
  const [groups, setGroups] = useState<GroupData[]>([])
  const [ungrouped, setUngrouped] = useState<StudentStatus[]>([])
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [tab, setTab] = useState<'ringkasan' | 'jurnal' | 'model'>('ringkasan')
  const [err, setErr] = useState('')
  const [terkirim, setTerkirim] = useState<Set<number>>(new Set())
  const [kal, setKal] = useState<JurnalKal | null>(null)
  const [model, setModel] = useState<{ groups: ModelG[] } | null>(null)
  const [seting, setSeting] = useState<{ projectStart: string; projectDays: number } | null>(null)

  useEffect(() => {
    loadAll().catch(() => setErr('Gagal memuat data. Coba muat ulang.'))
  }, [])

  async function loadAll() {
    const [r, g, k, m, s] = await Promise.all([
      api<Ringkasan>('/guru/ringkasan'),
      api<{ groups: GroupData[]; ungrouped: { id: number; fullName: string }[] }>('/guru/kelompok'),
      api<JurnalKal>('/guru/jurnal-kalender'),
      api<{ groups: ModelG[] }>('/guru/pertidaksamaan'),
      api<{ projectStart: string; projectDays: number }>('/guru/pengaturan'),
    ])
    setRing(r)
    setGroups(g.groups)
    setUngrouped(
      g.ungrouped.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        groupName: null,
        groupId: null,
        pinEntered: false,
        quizBest: null,
        quizPassed: false,
        interviewDone: false,
        ineqAttempts: 0,
        ineqSolved: false,
        journalCount: 0,
        journalToday: false,
        portfolioDone: false,
        reflectionDone: false,
        lastActivity: '',
        status: 'red' as const,
        behind: ['kelompok'],
      })),
    )
    setKal(k)
    setModel({ groups: m.groups })
    setSeting(s)
  }

  async function ingatkan(id: number) {
    await api(`/guru/pengingat/${id}`, { method: 'POST' }).catch(() => {})
    setTerkirim(new Set([...terkirim, id]))
  }

  if (!ring) return <Spinner text="Memuat dashboard…" />

  const semuaSiswa = [...groups.flatMap((g) => g.students), ...ungrouped]
  const merah = semuaSiswa.filter((s) => s.status === 'red')

  const quizData = semuaSiswa
    .filter((s) => s.quizBest !== null)
    .map((s) => ({ nama: s.fullName.split(' ')[0], nilai: s.quizBest ?? 0 }))

  return (
    <div className="animate-fadeIn">
      <PageHeader
        emoji="📊"
        title="Dashboard Monitoring"
        subtitle="Pantau kemajuan tiap siswa & kelompok secara individual."
      >
        <button className="btn-secondary !min-h-0 !px-3.5 !py-2 text-xs" onClick={() => loadAll().catch(() => {})}>
          <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
        </button>
      </PageHeader>

      {err && <div className="mb-4"><ErrorBox message={err} /></div>}

      {/* ===== kartu ringkasan ===== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard emoji="👥" label="Total Kelompok" value={String(ring.totalGroups)} />
        <StatCard emoji="🧑‍🎓" label="Total Siswa" value={String(ring.totalStudents)} sub={`${ring.ungrouped} belum berkelompok`} />
        <StatCard emoji="📅" label="Hari Proyek" value={`ke-${ring.dayX} / ${ring.dayY}`} />
        <StatCard emoji="📝" label="Rata-rata Kuis" value={ring.avgQuiz !== null ? String(ring.avgQuiz) : '—'} sub={`${ring.passedCount} lulus`} />
        <StatCard emoji="📔" label="Jurnal Hari Ini" value={`${ring.journalTodayCount}/${ring.totalStudents}`} />
        <StatCard emoji="🚨" label="Perlu Perhatian" value={String(ring.redCount)} sub={`${ring.yellowCount} lambat`} danger={ring.redCount > 0} />
      </div>

      {/* ===== tab ===== */}
      <div className="mt-6 flex gap-2 overflow-x-auto">
        {([
          ['ringkasan', '📋 Per Siswa'],
          ['jurnal', '🗓️ Kalender Jurnal'],
          ['model', '✅ Riwayat Model'],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === k ? 'bg-orange-500 text-white shadow-soft' : 'bg-white text-stone-500 hover:bg-orange-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'ringkasan' && (
        <div className="mt-4 space-y-4">
          {/* tabel kelompok (bisa dibentang) */}
          {groups.map((g) => {
            const isOpen = open.has(g.id)
            return (
              <Card key={g.id} className="!p-0 overflow-hidden">
                <button className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-orange-50/40" onClick={() => setOpen(new Set([...open].filter((x) => x !== g.id).concat(isOpen ? [] : [g.id])))}>
                  {isOpen ? <ChevronDown className="h-5 w-5 text-orange-400" /> : <ChevronRight className="h-5 w-5 text-stone-300" />}
                  <span className="text-sm font-extrabold text-stone-700">{g.name}</span>
                  <span className="chip">PIN {g.pin}</span>
                  <span className="text-xs text-stone-400">{g.students.length} siswa</span>
                  <span className="ml-auto hidden items-center gap-1.5 sm:flex">
                    {(['green', 'yellow', 'red'] as const).map((s) => (
                      <span key={s} className={`badge ${STATUS_LABEL[s].c}`}>
                        {g.students.filter((x) => x.status === s).length}
                      </span>
                    ))}
                  </span>
                </button>
                {isOpen && <TabelSiswa students={g.students} ingatkan={ingatkan} terkirim={terkirim} />}
              </Card>
            )
          })}

          {/* siswa tanpa kelompok */}
          {ungrouped.length > 0 && (
            <Card className="!p-0 overflow-hidden !border-amber-200">
              <div className="flex items-center gap-2 px-4 py-3.5 text-sm font-extrabold text-amber-700">
                ⚠️ Belum punya kelompok ({ungrouped.length})
              </div>
              <TabelSiswa students={ungrouped} ingatkan={ingatkan} terkirim={terkirim} />
            </Card>
          )}

          {/* grafik kuis */}
          {quizData.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-extrabold text-stone-700">📈 Nilai kuis terbaik per siswa</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quizData}>
                    <CartesianGrid vertical={false} stroke="#FFEDD5" />
                    <XAxis dataKey="nama" fontSize={10} tick={{ fill: '#78716C' }} angle={-30} textAnchor="end" height={55} />
                    <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: '#A8A29E' }} />
                    <Tooltip formatter={(v) => [v, 'Nilai']} />
                    <Bar dataKey="nilai" radius={[6, 6, 0, 0]}>
                      {quizData.map((d, i) => (
                        <Cell key={i} fill={(d.nilai ?? 0) >= 70 ? '#22C55E' : (d.nilai ?? 0) >= 50 ? '#EAB308' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* pengaturan proyek */}
          {seting && (
            <Pengaturan seting={seting} onSaved={loadAll} />
          )}
        </div>
      )}

      {tab === 'jurnal' && kal && <KalenderJurnal kal={kal} />}

      {tab === 'model' && model && (
        <div className="mt-4 space-y-3">
          {model.groups.map((g) => (
            <Card key={g.id} className="flex flex-wrap items-center gap-3 !p-4">
              <span className="text-sm font-extrabold text-stone-700">{g.name}</span>
              <span className={`badge ${g.solved ? 'bg-green-100 text-green-700' : g.attempts > 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>
                {g.solved ? '✓ Model tepat' : g.attempts > 0 ? '⏳ masih berlatih' : '— belum mulai'}
              </span>
              <span className="text-xs text-stone-500">{g.summary}</span>
            </Card>
          ))}
          {model.groups.length === 0 && <p className="text-sm text-stone-400">Belum ada kelompok.</p>}
        </div>
      )}

      {/* ===== panel peringatan ===== */}
      <div className="mt-8">
        <h2 className="mb-3 font-extrabold text-stone-700">⚠️ Siswa yang perlu perhatian:</h2>
        {merah.length === 0 ? (
          <Card className="!bg-green-50/60 !p-4 text-sm font-bold text-green-700">🎉 Tidak ada siswa berstatus merah. Semua lancar!</Card>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {merah.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-center gap-2.5 !p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-stone-700">{s.fullName}</p>
                  <p className="text-xs text-red-500">{s.groupName ?? 'Tanpa kelompok'} · tertinggal: {s.behind.join(', ')}</p>
                </div>
                <button
                  className="btn-primary !min-h-0 !px-3.5 !py-2 text-xs"
                  onClick={() => ingatkan(s.id)}
                  disabled={terkirim.has(s.id)}
                >
                  <Bell className="h-3.5 w-3.5" /> {terkirim.has(s.id) ? '✓ Terkirim' : 'Kirim Pengingat'}
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- sub komponen ----------

function StatCard({ emoji, label, value, sub, danger = false }: { emoji: string; label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <Card className={`!p-4 ${danger ? '!border-red-200 !bg-red-50/70' : ''}`}>
      <div className="text-lg">{emoji}</div>
      <div className={`mt-1 text-2xl font-extrabold ${danger ? 'text-red-600' : 'text-stone-800'}`}>{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-stone-400">{sub}</div>}
    </Card>
  )
}

function TabelSiswa({
  students,
  ingatkan,
  terkirim,
}: {
  students: StudentStatus[]
  ingatkan: (id: number) => void
  terkirim: Set<number>
}) {
  return (
    <div className="overflow-x-auto border-t border-orange-100">
      <table className="w-full min-w-[900px] text-xs">
        <thead>
          <tr className="border-b border-orange-100 bg-orange-50/60 text-left uppercase tracking-wide text-stone-400">
            <th className="px-4 py-2.5">Nama</th>
            <th className="px-2 py-2.5">Login</th>
            <th className="px-2 py-2.5">PIN</th>
            <th className="px-2 py-2.5">Kuis</th>
            <th className="px-2 py-2.5">Wawancara</th>
            <th className="px-2 py-2.5">Model (coba)</th>
            <th className="px-2 py-2.5">Jurnal</th>
            <th className="px-2 py-2.5">Porto</th>
            <th className="px-2 py-2.5">Refleksi</th>
            <th className="px-2 py-2.5">Status</th>
            <th className="px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-orange-50 last:border-0">
              <td className="px-4 py-2.5 font-bold text-stone-700">{s.fullName}</td>
              <td className="px-2 py-2.5 text-stone-500">{s.groupName ? '✅' : '❌'}</td>
              <td className="px-2 py-2.5">{s.pinEntered ? '✅' : '❌'}</td>
              <td className="px-2 py-2.5">
                {s.quizBest !== null ? (
                  <span className={s.quizPassed ? 'font-bold text-green-600' : 'font-bold text-amber-600'}>{s.quizBest}</span>
                ) : (
                  <span className="text-stone-300">—</span>
                )}
              </td>
              <td className="px-2 py-2.5">{s.interviewDone ? '✅' : '❌'}</td>
              <td className="px-2 py-2.5">
                {s.ineqSolved ? (
                  <span className="text-green-600">✅ ({s.ineqAttempts}x)</span>
                ) : s.ineqAttempts > 0 ? (
                  <span className="text-amber-600">{s.ineqAttempts}x coba</span>
                ) : (
                  <span className="text-stone-300">—</span>
                )}
              </td>
              <td className="px-2 py-2.5">
                <span className={s.journalToday ? 'text-green-600' : 'text-red-500'}>{s.journalCount} hari {s.journalToday ? '✓' : '⚠️'}</span>
              </td>
              <td className="px-2 py-2.5">{s.portfolioDone ? '✅' : '❌'}</td>
              <td className="px-2 py-2.5">{s.reflectionDone ? '✅' : '❌'}</td>
              <td className="px-2 py-2.5">
                <span className={`badge ${STATUS_LABEL[s.status].c}`}>{STATUS_LABEL[s.status].t}</span>
              </td>
              <td className="px-2 py-2.5">
                <button className="rounded-lg px-2 py-1 font-bold text-orange-500 hover:bg-orange-50 disabled:opacity-40" onClick={() => ingatkan(s.id)} disabled={terkirim.has(s.id)}>
                  {terkirim.has(s.id) ? '✓' : '🔔'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface JurnalKal {
  dates: string[]
  today: string
  project: { start: string; days: number }
  groups: { id: number; name: string; rows: { studentId: number; fullName: string; days: { date: string; status: 'ok' | 'miss' | 'future' | 'before' }[] }[] }[]
}

function KalenderJurnal({ kal }: { kal: JurnalKal }) {
  return (
    <div className="mt-4 space-y-4">
      {kal.groups.map((g) => (
        <Card key={g.id} className="!p-0 overflow-hidden">
          <div className="border-b border-orange-100 bg-orange-50/60 px-4 py-3 text-sm font-extrabold text-stone-700">
            🗓️ {g.name} <span className="ml-2 text-xs font-normal text-stone-400">✅ = isi · ❌ = tidak ada kemajuan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] text-xs">
              <thead>
                <tr className="text-left text-stone-400">
                  <th className="sticky left-0 bg-white px-4 py-2">Siswa</th>
                  {kal.dates.map((d, i) => (
                    <th key={d} className={`px-1 py-2 text-center font-bold ${d === kal.today ? 'text-orange-500' : ''}`}>
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.studentId} className="border-t border-orange-50">
                    <td className="sticky left-0 bg-white px-4 py-2 font-bold text-stone-600">{r.fullName}</td>
                    {r.days.map((d) => (
                      <td key={d.date} className="px-1 py-2 text-center">
                        {d.status === 'ok' ? '✅' : d.status === 'miss' ? '❌' : d.status === 'before' ? '·' : <span className="text-stone-200">◌</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                {g.rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-stone-400" colSpan={kal.dates.length + 1}>
                      Belum ada anggota.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      {kal.groups.length === 0 && <Card className="text-sm text-stone-400">Belum ada kelompok.</Card>}
    </div>
  )
}

interface ModelG {
  id: number
  name: string
  attempts: number
  solved: boolean
  summary: string
}

function Pengaturan({ seting, onSaved }: { seting: { projectStart: string; projectDays: number }; onSaved: () => void }) {
  const [start, setStart] = useState(seting.projectStart)
  const [days, setDays] = useState(String(seting.projectDays))
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function simpan() {
    setBusy(true)
    setMsg('')
    try {
      await api('/guru/pengaturan', { body: { projectStart: start, projectDays: Number(days) } })
      setMsg('✅ Tersimpan')
      onSaved()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal menyimpan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-extrabold text-stone-700">⚙️ Periode Proyek</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label !mb-1 !text-xs">Hari pertama proyek</label>
          <input type="date" className="input !w-44" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label !mb-1 !text-xs">Lama proyek (hari)</label>
          <input type="number" min={1} max={60} className="input !w-32" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={simpan} disabled={busy}>
          {busy ? '…' : 'Simpan'}
        </button>
        {msg && <span className="text-xs font-bold text-stone-500">{msg}</span>}
      </div>
    </Card>
  )
}
