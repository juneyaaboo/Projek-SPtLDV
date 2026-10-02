import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, fmtRupiah } from '../api'
import { useSession, isL2 } from '../store'
import { ProgressRing, Spinner, Card } from '../components/ui'
import { FITUR } from '../components/Layout'

interface Ringkasan {
  interviewDone: boolean
  ineqSolved: boolean
  ineqAttempts: number
  portfolioDone: boolean
  reflectionDone: boolean
  journalCount: number
  journalNextDay: number
  project: { start: string; days: number }
  quiz: { best: number | null; passed: boolean; attempts: number }
}

interface Notif {
  id: number
  message: string
  read: boolean
  createdAt: string
}

export default function Beranda() {
  const { me } = useSession()
  const [r, setR] = useState<Ringkasan | null>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const l2 = isL2(me)

  useEffect(() => {
    api<Ringkasan>('/siswa/ringkasan').then(setR).catch(() => {})
    if (l2) {
      api<{ items: Notif[] }>('/notifikasi').then(async (d) => {
        setNotifs(d.items)
        if (d.items.some((i) => !i.read)) await api('/notifikasi/baca', { method: 'POST' }).catch(() => {})
      }).catch(() => {})
    }
  }, [l2, me?.unreadNotifications])

  if (!me || !r) return <Spinner />

  const progress = me.progress ?? []
  const done = [1, 2, 3, 4, 5, 6, 7, 9, 10].filter((f) => progress.includes(f)).length
  const first = me.student!.fullName.split(' ')[0]

  return (
    <div className="animate-fadeIn space-y-6">
      {/* sambutan */}
      <div className="card flex flex-wrap items-center gap-5 !bg-gradient-to-br !from-orange-50 !to-amber-50 !p-6">
        <ProgressRing value={done} total={10} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-stone-800">Halo, {first}! 👋</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {me.student?.groupName ? (
              <>Kamu anggota <b className="text-orange-600">{me.student.groupName}</b> 👥</>
            ) : (
              <>Kamu belum memiliki kelompok — minta PIN ke gurumu ya 🔑</>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="badge bg-orange-100 text-orange-700">
              📝 Kuis: {me.quiz?.best !== null && me.quiz?.best !== undefined ? `nilai terbaik ${me.quiz.best}` : 'belum dikerjakan'} {me.quiz?.passed ? '✅' : ''}
            </span>
            <span className="badge bg-amber-100 text-amber-700">
              📔 Jurnal: {r.journalCount} hari (lanjut hari ke-{r.journalNextDay})
            </span>
            <span className="badge bg-green-100 text-green-700">
              📅 Hari ke-{Math.min(Math.max(hariKe(r.project.start), 1), r.project.days)} dari {r.project.days}
            </span>
          </div>
        </div>
        {!l2 && (
          <Link to="/pin" className="btn-primary !px-5 !py-3">
            🔐 Masukkan PIN Kelompok
          </Link>
        )}
      </div>

      {/* notifikasi */}
      {notifs.length > 0 && (
        <div id="notifikasi" className="card !p-4">
          <h2 className="mb-2 font-extrabold text-stone-700">🔔 Notifikasi Guru</h2>
          <div className="space-y-2">
            {notifs.slice(0, 5).map((n) => (
              <div key={n.id} className={`rounded-xl px-3.5 py-2.5 text-sm ${n.read ? 'bg-stone-50 text-stone-500' : 'bg-amber-50 font-semibold text-amber-800'}`}>
                {n.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* kartu fitur */}
      <div>
        <h2 className="mb-3 font-extrabold text-stone-700">Peta Proyek 🗺️</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FITUR.filter((f) => f.n !== 8).map((f) => {
            const locked = f.needPin && !l2
            const selesai = progress.includes(f.n)
            const href = locked ? '/pin' : f.href
            return (
              <Link key={f.n} to={href} className={`card card-hover relative flex flex-col items-center gap-1.5 !p-4 text-center ${locked ? 'opacity-65' : ''}`}>
                <span className="absolute left-2.5 top-2.5 text-[10px] font-extrabold text-stone-300">{f.n}</span>
                {selesai && <span className="absolute right-2.5 top-2.5 text-sm">✅</span>}
                <span className={`text-3xl ${locked ? 'grayscale' : ''}`}>{locked ? '🔒' : f.emoji}</span>
                <span className="text-xs font-extrabold text-stone-700">{f.short}</span>
                <span className="text-[10px] leading-tight text-stone-400">{locked ? 'Butuh PIN' : selesai ? 'Selesai' : f.title}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* status proyek ringkas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStatus
          emoji="🎤"
          title="Data Wawancara"
          ok={r.interviewDone}
          ya="Data dapur sudah tersimpan"
          tidak="Isi di Fitur 5"
          href="/fitur/5"
          locked={!l2}
        />
        <MiniStatus
          emoji="✅"
          title="Model Pertidaksamaan"
          ok={r.ineqSolved}
          ya={`Semua benar (${r.ineqAttempts} percobaan)`}
          tidak={`${r.ineqAttempts} percobaan — semangat!`}
          href="/fitur/6"
          locked={!l2}
        />
        <MiniStatus
          emoji="🗂️"
          title="Portofolio Kelompok"
          ok={r.portfolioDone}
          ya="Karya sudah diunggah"
          tidak="Unggah di Fitur 9"
          href="/fitur/9"
          locked={!l2}
        />
      </div>
    </div>
  )
}

function hariKe(start: string): number {
  const d = new Date(start + 'T00:00:00Z').getTime()
  const t = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const td = new Date(t + 'T00:00:00Z').getTime()
  return Math.round((td - d) / 86400000) + 1
}

function MiniStatus({ emoji, title, ok, ya, tidak, href, locked }: { emoji: string; title: string; ok: boolean; ya: string; tidak: string; href: string; locked: boolean }) {
  const body = (
    <Card className={`card-hover flex items-center gap-3 !p-4 ${locked ? 'opacity-60' : ''}`}>
      <span className="text-2xl">{locked ? '🔒' : emoji}</span>
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-stone-700">{title}</div>
        <div className={`text-xs ${ok ? 'text-green-600' : 'text-stone-400'}`}>{locked ? 'Butuh PIN' : ok ? `✅ ${ya}` : `⏳ ${tidak}`}</div>
      </div>
    </Card>
  )
  return locked ? body : <Link to={href}>{body}</Link>
}
