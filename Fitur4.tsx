import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useSession, isL2 } from '../store'
import { PageHeader, Card, Spinner, ErrorBox, SuccessBox } from '../components/ui'
import { Timer, ChevronLeft, ChevronRight, Flag, RefreshCw } from 'lucide-react'

interface Q {
  id: number
  q: string
  options: string[]
}
interface ReviewItem {
  id: number
  q: string
  options: string[]
  answer: number
  your: number
  correct: boolean
  explanation: string
}
interface Hasil {
  score: number
  total: number
  passed: boolean
  attempt: number
  bestScore: number | null
  message: string
  review?: ReviewItem[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Fitur4() {
  const { me, refresh } = useSession()
  const l2 = isL2(me)
  const [data, setData] = useState<{ questions: Q[]; durationMinutes: number; passScore: number; best: number | null; passed: boolean; attempts: number } | null>(null)
  const [fase, setFase] = useState<'intro' | 'kerja' | 'hasil'>('intro')
  const [order, setOrder] = useState<Q[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [sisaDetik, setSisaDetik] = useState(0)
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ questions: Q[]; durationMinutes: number; passScore: number; best: number | null; passed: boolean; attempts: number }>('/kuis')
      .then(setData)
      .catch(() => setErr('Gagal memuat kuis. Muat ulang halaman.'))
  }, [])

  const sisa = useMemo(() => {
    const m = Math.floor(sisaDetik / 60)
    const s = sisaDetik % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }, [sisaDetik])

  useEffect(() => {
    if (fase !== 'kerja' || sisaDetik <= 0) return
    const t = setTimeout(() => {
      if (sisaDetik === 1) submit()
      else setSisaDetik((s) => s - 1)
    }, 1000)
    return () => clearTimeout(t)
  }, [fase, sisaDetik])

  function mulai() {
    if (!data) return
    setOrder(shuffle(data.questions))
    setAnswers({})
    setIdx(0)
    setSisaDetik(data.durationMinutes * 60)
    setHasil(null)
    setFase('kerja')
  }

  async function submit() {
    if (busy) return
    const unanswered = order.length - Object.keys(answers).length
    if (unanswered > 0 && sisaDetik > 0) {
      const ok = window.confirm(`Masih ada ${unanswered} soal belum dijawab. Yakin ingin mengumpulkan?`)
      if (!ok) return
    }
    setBusy(true)
    setErr('')
    try {
      const res = await api<Hasil>('/kuis/jawab', { body: { answers } })
      setHasil(res)
      setFase('hasil')
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal mengirim jawaban.')
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <Spinner text="Menyiapkan kuis…" />

  // ============ HASIL ============
  if (fase === 'hasil' && hasil) {
    return (
      <div className="animate-fadeIn">
        <PageHeader emoji="📝" title="Fitur 4 · Kuis Otomatis" subtitle="Hasil percobaanmu kali ini." badge={`Percobaan ke-${hasil.attempt}`} />
        <Card className={`text-center !p-8 ${hasil.passed ? '!border-green-200 !bg-green-50' : '!border-amber-200 !bg-amber-50'}`}>
          <div className="text-6xl">{hasil.passed ? '🎉' : '💪'}</div>
          <div className="mt-3 text-5xl font-extrabold text-stone-800">{hasil.score}</div>
          <p className="text-sm text-stone-500">dari 100 (nilai terbaik: <b>{Math.max(hasil.bestScore ?? 0, hasil.score)}</b>)</p>
          <p className={`mx-auto mt-4 max-w-md text-sm font-semibold ${hasil.passed ? 'text-green-700' : 'text-amber-700'}`}>{hasil.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button className="btn-secondary" onClick={mulai}>
              <RefreshCw className="h-4 w-4" /> Coba Lagi
            </button>
            {hasil.passed && !l2 && (
              <Link to="/pin" className="btn-primary">
                🔐 Masukkan PIN Kelompok
              </Link>
            )}
            {hasil.passed && l2 && (
              <Link to="/fitur/5" className="btn-primary">
                🎤 Lanjut ke Proyek (Wawancara)
              </Link>
            )}
          </div>
        </Card>

        {hasil.review && (
          <div className="mt-6">
            <h2 className="mb-3 font-extrabold text-stone-700">🔍 Pembahasan (terbuka karena kamu lulus!)</h2>
            <div className="space-y-3">
              {hasil.review.map((r, i) => (
                <Card key={r.id} className={`!p-4 ${r.correct ? '!border-green-100' : '!border-red-100'}`}>
                  <div className="flex items-start gap-2 text-sm font-bold text-stone-700">
                    <span>{r.correct ? '✅' : '❌'}</span>
                    <span>{i + 1}. {r.q}</span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-sm">
                    {r.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`rounded-lg px-3 py-2 ${
                          oi === r.answer
                            ? 'bg-green-100 font-bold text-green-800'
                            : oi === r.your
                              ? 'bg-red-50 text-red-600 line-through'
                              : 'text-stone-500'
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                        {oi === r.answer && ' ← kunci'}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">💡 {r.explanation}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
        {!hasil.passed && (
          <Card className="mt-6 !bg-orange-50/60">
            <p className="text-sm text-stone-600">
              🔒 Kunci jawaban dan pembahasan hanya dibuka setelah kamu lulus (nilai ≥ 70). Sementara itu, baca lagi{' '}
              <Link to="/fitur/2" className="font-bold text-orange-600 underline">Modul Materi</Link> dan coba{' '}
              <Link to="/fitur/3" className="font-bold text-orange-600 underline">Grafik Interaktif</Link> ya!
            </p>
          </Card>
        )}
      </div>
    )
  }

  // ============ KERJA ============
  if (fase === 'kerja') {
    const q = order[idx]
    const answeredCount = Object.keys(answers).length
    const hampirHabis = sisaDetik <= 120
    return (
      <div className="animate-fadeIn">
        <div className="sticky top-16 z-30 mb-4 flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/95 px-4 py-3 shadow-card backdrop-blur">
          <span className={`badge ${hampirHabis ? 'animate-pulse bg-red-100 text-red-600' : 'bg-orange-100 text-orange-700'}`}>
            <Timer className="h-3.5 w-3.5" /> {sisa}
          </span>
          <div className="flex flex-1 gap-1">
            {order.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setIdx(i)}
                className={`h-7 min-w-[7%] flex-1 rounded-md text-[10px] font-bold transition ${
                  i === idx
                    ? 'bg-orange-500 text-white'
                    : answers[qq.id] !== undefined
                      ? 'bg-green-100 text-green-700'
                      : 'bg-stone-100 text-stone-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <span className="hidden text-xs font-bold text-stone-400 sm:inline">{answeredCount}/{order.length}</span>
        </div>

        <Card className="!p-5 sm:!p-7">
          <p className="text-base font-bold leading-relaxed text-stone-800 sm:text-lg">
            {idx + 1}. {q.q}
          </p>
          <div className="mt-4 space-y-2.5">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                  answers[q.id] === oi
                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                    : 'border-stone-150 border-orange-100 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50/50'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  answers[q.id] === oi ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
                }`}>
                  {String.fromCharCode(65 + oi)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button className="btn-ghost" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </button>
            {idx < order.length - 1 ? (
              <button className="btn-primary" onClick={() => setIdx(idx + 1)}>
                Berikutnya <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn-green" onClick={submit} disabled={busy}>
                <Flag className="h-4 w-4" /> {busy ? 'Mengirim…' : 'Kumpulkan'}
              </button>
            )}
          </div>
        </Card>
        {err && <div className="mt-3"><ErrorBox message={err} /></div>}
      </div>
    )
  }

  // ============ INTRO ============
  return (
    <div className="animate-fadeIn">
      <PageHeader emoji="📝" title="Fitur 4 · Kuis Otomatis" subtitle="10 soal pilihan ganda bertema kuliner · 15 menit · nilai lulus 70." badge="Fitur belajar" />
      <Card className="mx-auto max-w-xl text-center !p-8">
        <div className="text-6xl">🧑‍🍳</div>
        <h2 className="mt-3 text-xl font-extrabold text-stone-800">Siap menguji pemahamanmu?</h2>
        <div className="mx-auto mt-5 max-w-sm space-y-2.5 text-left text-sm text-stone-600">
          <p>⏱️ Waktu: <b>15 menit</b> — otomatis terkumpul saat waktu habis.</p>
          <p>✅ Benar = 10 poin. Nilai lulus: <b>≥ 70</b>.</p>
          <p>🔁 Bisa diulang sebanyak bebas — <b>nilai terbaik</b> yang disimpan.</p>
          <p>🔍 Kunci jawaban & pembahasan terbuka <b>setelah lulus</b>.</p>
          <p>🎯 Lulus kuis = siap lanjut ke proyek kelompok!</p>
        </div>
        {data.best !== null && (
          <p className="mt-4 text-sm font-bold text-orange-600">Nilai terbaikmu sejauh ini: {data.best} {data.passed ? '✅' : ''}</p>
        )}
        <button className="btn-primary mt-6 !px-8 !py-3 text-base" onClick={mulai}>
          🚀 Mulai Kuis
        </button>
      </Card>
    </div>
  )
}
