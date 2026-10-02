import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { useSession } from '../store'
import { PageHeader, Card, Spinner, ErrorBox, Stars } from '../components/ui'

// =============================================================
// Fitur 10 — Refleksi + grafik perbandingan kuis vs pemahaman
// =============================================================

interface Refleksi {
  whatLearned: string
  whatWasHard: string
  rating: number
  createdAt: string
}

export default function Fitur10() {
  const { me, refresh } = useSession()
  const [data, setData] = useState<Refleksi | null>(null)
  const [quizBest, setQuizBest] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [learned, setLearned] = useState('')
  const [hard, setHard] = useState('')
  const [rating, setRating] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api<{ data: Refleksi | null; quiz: { best: number | null; passed: boolean; attempts: number } }>('/refleksi')
      .then((d) => {
        setData(d.data)
        setQuizBest(d.quiz.best)
        if (d.data) {
          setLearned(d.data.whatLearned)
          setHard(d.data.whatWasHard)
          setRating(d.data.rating)
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!learned.trim()) return setErr('Ceritakan dulu hal baru yang kamu pelajari ya.')
    if (!hard.trim()) return setErr('Ceritakan dulu bagian yang paling sulit ya.')
    if (!rating) return setErr('Beri rating pemahamanmu dari 1 sampai 5 bintang.')
    setBusy(true)
    try {
      await api('/refleksi', { body: { whatLearned: learned, whatWasHard: hard, rating } })
      setDone(true)
      await refresh()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal menyimpan refleksi.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <Spinner />

  const chartData = [
    { nama: 'Nilai Kuis Terbaik', nilai: quizBest ?? 0, fill: '#F97316' },
    { nama: 'Rating Pemahaman (×20)', nilai: rating * 20, fill: '#EAB308' },
  ]

  // ===== layar selesai =====
  if (done || data) {
    return (
      <div className="animate-fadeIn">
        <PageHeader emoji="⭐" title="Fitur 10 · Refleksi Akhir" badge="Selesai ✅" />
        <Card className="!border-green-200 !bg-gradient-to-br !from-green-50 !to-amber-50 text-center !p-8">
          <div className="text-6xl">🎉</div>
          <h2 className="mt-3 text-xl font-extrabold text-green-700">Selamat! Kamu telah menyelesaikan seluruh proyek PjBL SPtLDV!</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            Dari cerita kantin sampai solusi optimum — kamu sudah melalui semuanya. pertahankan semangat belajarmu, chef muda! 🧑‍🍳✨
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <h3 className="mb-2 text-sm font-extrabold text-stone-600">📊 Perbandingan Kuis vs Pemahaman Akhir</h3>
            <div className="h-56 rounded-2xl bg-white/70 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid horizontal={false} stroke="#FFEDD5" />
                  <XAxis type="number" domain={[0, 100]} fontSize={11} tick={{ fill: '#A8A29E' }} />
                  <YAxis type="category" dataKey="nama" width={150} fontSize={11} tick={{ fill: '#57534E' }} />
                  <Tooltip formatter={(v: number) => `${v}${String(v) === 'NaN' ? '' : ''}`} labelStyle={{ fontWeight: 700 }} />
                  <Bar dataKey="nilai" radius={[0, 8, 8, 0]} barSize={26}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Nilai kuis terbaik: <b>{quizBest ?? '-'}</b> · Rating pemahaman: <b>{rating}/5</b> ⭐
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-lg space-y-3 text-left">
            <div className="rounded-xl bg-white/80 p-4 text-sm text-stone-600">
              <b className="text-stone-700">🌟 Hal baru yang dipelajari:</b>
              <p className="mt-1">{data?.whatLearned ?? learned}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-4 text-sm text-stone-600">
              <b className="text-stone-700">🧗 Paling sulit & cara mengatasi:</b>
              <p className="mt-1">{data?.whatWasHard ?? hard}</p>
            </div>
          </div>
          <Link to="/beranda" className="btn-primary mt-7">🏠 Kembali ke Beranda</Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader emoji="⭐" title="Fitur 10 · Refleksi Akhir" subtitle="Ceritakan pengalamanmu selama proyek — jawabanmu membantu gurumu memperbaiki pembelajaran." badge="Langkah terakhir" />

      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
        <Card>
          <label className="label">1. Apa hal baru yang kamu pelajari dari proyek ini? *</label>
          <textarea className="input min-h-[120px] resize-y" placeholder="cth. Saya jadi paham cara mengubah data dapur jadi pertidaksamaan, dan bahwa keuntungan terbesar selalu ada di titik pojok…" value={learned} onChange={(e) => setLearned(e.target.value)} />
        </Card>
        <Card>
          <label className="label">2. Apa yang paling sulit dan bagaimana kamu mengatasinya? *</label>
          <textarea className="input min-h-[120px] resize-y" placeholder="cth. Awalnya bingung mencari titik pojok. Saya mengatasinya dengan mencoba grafik interaktif berulang kali…" value={hard} onChange={(e) => setHard(e.target.value)} />
        </Card>
        <Card>
          <label className="label">3. Seberapa baik pemahamanmu tentang SPtLDV sekarang? *</label>
          <div className="flex flex-wrap items-center gap-4">
            <Stars value={rating} onChange={setRating} />
            <span className="text-sm font-bold text-stone-500">
              {['', '😁 Masih perlu banyak bimbingan', '🙂 Cukup paham', '😊 Paham', '😃 Paham baik', '🤩 Sangat paham!'][rating] ?? ''}
            </span>
          </div>
        </Card>
        {err && <ErrorBox message={err} />}
        <button type="submit" className="btn-primary w-full !py-3.5 text-base sm:w-auto !px-9" disabled={busy}>
          {busy ? 'Menyimpan…' : '🚀 Kirim Refleksi'}
        </button>
      </form>
    </div>
  )
}
