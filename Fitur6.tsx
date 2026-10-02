import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, fmtID, fmtRupiah, type InterviewData, type Reward } from '../api'
import { useSession } from '../store'
import { PageHeader, Card, Spinner, ErrorBox, SuccessBox } from '../components/ui'
import Grafik from '../components/Grafik'
import { CheckCircle2, XCircle, Eye, RotateCcw } from 'lucide-react'

// =============================================================
// Fitur 6 — Sistem Feedback Bertahap.
// BUKAN kalkulator: server TIDAK PERNAH mengirim kunci jawaban.
// Yang dikirim hanya benar/salah + petunjuk kontekstual.
// =============================================================

interface ItemResult {
  label: string
  correct: boolean
  hint: string
  input?: string
}

interface CekResponse {
  attempt: number
  allCorrect: boolean
  results: ItemResult[]
  reward: Reward | null
}

export default function Fitur6() {
  const [data, setData] = useState<InterviewData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<{ attempts: number; solved: boolean; items: ItemResult[] } | null>(null)
  const [hasil, setHasil] = useState<CekResponse | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [reward, setReward] = useState<Reward | null>(null)

  // jawaban siswa
  const [ingInputs, setIngInputs] = useState<Record<string, string>>({})
  const [timeInput, setTimeInput] = useState('')
  const [nonnegInput, setNonnegInput] = useState('')
  const [objInput, setObjInput] = useState('')

  useEffect(() => {
    Promise.all([
      api<{ data: InterviewData | null }>('/wawancara'),
      api<{ attempts: number; solved: boolean; items: ItemResult[] }>('/pertidaksamaan/status'),
    ])
      .then(async ([w, s]) => {
        setData(w.data)
        setStatus(s)
        // pra-isi dari percobaan terakhir
        for (const it of s.items) {
          if (it.label === 'Waktu Produksi') setTimeInput(it.input ?? '')
          else if (it.label.startsWith('Syarat')) setNonnegInput(it.input ?? '')
          else if (it.label.startsWith('Fungsi')) setObjInput(it.input ?? '')
          else setIngInputs((m) => ({ ...m, [it.label]: it.input ?? '' }))
        }
        if (s.solved) {
          const r = await api<{ solved: boolean; reward?: Reward }>('/pertidaksamaan/hadiah')
          if (r.solved && r.reward) setReward(r.reward)
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  const profitA = useMemo(() => (data ? data.priceA - data.costA : 0), [data])
  const profitB = useMemo(() => (data ? data.priceB - data.costB : 0), [data])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!data) return
    setErr('')
    setBusy(true)
    try {
      const res = await api<CekResponse>('/pertidaksamaan/cek', {
        body: {
          ingredients: data.ingredients.map((i) => ({ name: i.name, input: ingInputs[i.name] ?? '' })),
          time: timeInput,
          nonneg: nonnegInput,
          objective: objInput,
        },
      })
      setHasil(res)
      setStatus({ attempts: res.attempt, solved: res.allCorrect, items: res.results })
      if (res.allCorrect && res.reward) {
        setReward(res.reward)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal memeriksa.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <Spinner />

  if (!data) {
    return (
      <div className="animate-fadeIn">
        <PageHeader emoji="✅" title="Fitur 6 · Feedback Pertidaksamaan" badge="Proyek kelompok" />
        <Card className="text-center">
          <div className="text-5xl">🎤</div>
          <p className="mx-auto mt-3 max-w-md text-sm text-stone-500">
            Data wawancara kelompokmu belum ada. Isi dulu <b>Fitur 5</b>, lalu kembali ke sini untuk menyusun model
            pertidaksamaan.
          </p>
          <Link to="/fitur/5" className="btn-primary mt-5">🎤 Isi Wawancara Dulu</Link>
        </Card>
      </div>
    )
  }

  const feedbackFor = (label: string): ItemResult | undefined =>
    (hasil?.results ?? status?.items ?? []).find((i) => i.label === label)

  return (
    <div className="animate-fadeIn">
      <PageHeader
        emoji="✅"
        title="Fitur 6 · Feedback Pertidaksamaan"
        subtitle="Susun sendiri model matematikanya dari data wawancara. Sistem hanya memberi PETUNJUK — bukan jawaban. Perbaiki bertahap sampai benar! 💪"
        badge={`Percobaan: ${status?.attempts ?? 0}`}
      />

      {/* ===== hadiah setelah semua benar ===== */}
      {reward && (
        <div className="card mb-6 !border-green-200 !bg-gradient-to-br !from-green-50 !to-amber-50 !p-6 animate-pop">
          <h2 className="text-center text-lg font-extrabold text-green-700">🎉 Selamat! Semua modelmu TEPAT!</h2>
          <p className="mt-1 text-center text-sm text-stone-500">
            Ini hadiahmu: grafik daerah penyelesaian lengkap dengan titik pojok & solusi optimum.
          </p>
          <div className="mt-5">
            <Grafik
              mode="baca"
              fixedConstraints={reward.lines.map((l) => ({ label: l.label, a: l.a, b: l.b, op: '<=' as const, rhs: l.rhs }))}
              objective={{ p: reward.objective.p, q: reward.objective.q }}
              highlightOptimal
            />
          </div>
          {reward.optimal && (
            <div className="mt-4 rounded-2xl bg-yellow-100 p-4 text-center text-sm font-extrabold text-yellow-800">
              ⭐ Produksi optimal: {fmtID(reward.optimal.x)} {reward.products.a} dan {fmtID(reward.optimal.y)}{' '}
              {reward.products.b} → keuntungan maksimum <b>{fmtRupiah(reward.optimal.z)}</b> per hari!
            </div>
          )}
        </div>
      )}

      {/* ===== langkah 1: data wawancara ===== */}
      <Card className="mb-5 !bg-sky-50/60">
        <h2 className="mb-1 font-extrabold text-stone-700">📋 Langkah 1 — Data wawancara kelompokmu</h2>
        <p className="text-xs text-stone-500">Ini acuan menyusun model. x = {data.productA}, y = {data.productB}.</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {data.ingredients.map((i) => (
            <div key={i.name} className="flex justify-between rounded-lg bg-white px-3 py-2">
              <span className="font-bold text-stone-600">🧺 {i.name}</span>
              <span className="text-stone-500">{fmtID(i.perA)} {i.unit} / {fmtID(i.perB)} {i.unit} · stok <b>{fmtID(i.total)} {i.unit}</b></span>
            </div>
          ))}
          <div className="flex justify-between rounded-lg bg-white px-3 py-2">
            <span className="font-bold text-stone-600">⏱️ Waktu</span>
            <span className="text-stone-500">{fmtID(data.timePerA)} / {fmtID(data.timePerB)} {data.timeUnit} · total <b>{fmtID(data.timeTotal)} {data.timeUnit}</b></span>
          </div>
          <div className="flex justify-between rounded-lg bg-white px-3 py-2">
            <span className="font-bold text-stone-600">💰 Keuntungan</span>
            <span className="text-stone-500">{data.productA}: <b>{fmtRupiah(profitA)}</b> · {data.productB}: <b>{fmtRupiah(profitB)}</b></span>
          </div>
        </div>
      </Card>

      {/* ===== langkah 2: input ===== */}
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <h2 className="mb-1 font-extrabold text-stone-700">✍️ Langkah 2 — Tulis modelmu</h2>
          <p className="mb-4 text-xs text-stone-500">
            Gunakan <b>x</b> untuk {data.productA} dan <b>y</b> untuk {data.productB}. Contoh format: <code className="rounded bg-stone-100 px-1.5 py-0.5">200x + 150y &lt;= 10000</code>
          </p>
          <div className="space-y-4">
            {data.ingredients.map((i) => {
              const fb = feedbackFor(i.name)
              return (
                <ModelInput
                  key={i.name}
                  label={`Pertidaksamaan bahan ${i.name}`}
                  placeholder={`${fmtID(i.perA)}x + ${fmtID(i.perB)}y <= ${fmtID(i.total)}`}
                  value={ingInputs[i.name] ?? ''}
                  onChange={(v) => setIngInputs({ ...ingInputs, [i.name]: v })}
                  fb={fb}
                />
              )
            })}
            <ModelInput
              label="Pertidaksamaan waktu produksi"
              placeholder={`${fmtID(data.timePerA)}x + ${fmtID(data.timePerB)}y <= ${fmtID(data.timeTotal)}`}
              value={timeInput}
              onChange={setTimeInput}
              fb={feedbackFor('Waktu Produksi')}
            />
            <ModelInput
              label="Syarat non-negatif"
              placeholder="x >= 0, y >= 0"
              value={nonnegInput}
              onChange={setNonnegInput}
              fb={feedbackFor('Syarat x ≥ 0, y ≥ 0')}
            />
            <ModelInput
              label="Fungsi tujuan (keuntungan)"
              placeholder={`Z = ${fmtID(profitA)}x + ${fmtID(profitB)}y`}
              value={objInput}
              onChange={setObjInput}
              fb={feedbackFor('Fungsi Tujuan')}
            />
          </div>
        </Card>

        {err && <ErrorBox message={err} />}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary !px-7" disabled={busy}>
            {busy ? 'Memeriksa…' : '🔍 Cek Jawaban Saya'}
          </button>
          <span className="text-xs text-stone-400">
            <RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Salah? Perbaiki lalu cek lagi — percobaan tidak dibatasi.
          </span>
        </div>
      </form>

      {/* ===== langkah 4: hasil ===== */}
      {hasil && !hasil.allCorrect && (
        <Card className="mt-5 !border-amber-200 !bg-amber-50/60">
          <h2 className="font-extrabold text-amber-700">📮 Umpan balik percobaan ke-{hasil.attempt}</h2>
          <p className="mt-1 text-sm text-stone-600">
            Masih ada yang kurang tepat — baca petunjuknya pelan-pelan, lalu perbaiki di atas. Kamu pasti bisa! 💪
          </p>
        </Card>
      )}
    </div>
  )
}

function ModelInput({
  label,
  placeholder,
  value,
  onChange,
  fb,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  fb?: ItemResult
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          className={`input pr-11 font-mono !text-[15px] ${
            fb ? (fb.correct ? '!border-green-400 !bg-green-50/60' : '!border-red-300 !bg-red-50/40') : ''
          }`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {fb && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {fb.correct ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-400" />}
          </span>
        )}
      </div>
      {fb && !fb.correct && fb.hint && (
        <div className="mt-1.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <b>Petunjuk:</b> {fb.hint}
          </span>
        </div>
      )}
      {fb && fb.correct && <div className="mt-1 text-xs font-bold text-green-600">✓ Tepat!</div>}
    </div>
  )
}
