import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession, isL2 } from '../store'
import { ErrorBox } from '../components/ui'

export default function Pin() {
  const { me, refresh } = useSession()
  const nav = useNavigate()
  const [digits, setDigits] = useState(['', '', '', ''])
  const [err, setErr] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (isL2(me)) nav('/beranda', { replace: true })
  }, [me, nav])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const lockedSecs = lockedUntil ? Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - now) / 1000)) : 0
  useEffect(() => {
    if (lockedSecs === 0) setLockedUntil(null)
  }, [lockedSecs])

  function setDigit(i: number, v: string) {
    const only = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = only
    setDigits(next)
    if (only && i < 3) refs.current[i + 1]?.focus()
    if (next.every((d) => d !== '')) submit(next.join(''))
  }

  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  async function submit(pin: string) {
    setErr('')
    setBusy(true)
    try {
      await api('/auth/pin', { body: { pin } })
      await refresh()
      nav('/beranda')
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'PIN salah.')
      if (e2 && typeof e2 === 'object' && 'data' in e2) {
        const data = (e2 as { data: Record<string, unknown> }).data
        if (typeof data.attemptsLeft === 'number') setAttemptsLeft(data.attemptsLeft)
        if (typeof data.lockedUntil === 'string') setLockedUntil(data.lockedUntil)
      }
      setDigits(['', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  const noGroup = err.includes('belum memiliki kelompok')

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <Link to="/beranda" className="mb-6 flex items-center justify-center gap-2 font-extrabold text-orange-600">
          <span className="text-2xl">🍳</span> PjBL SPtLDV
        </Link>
        <div className="card animate-pop !p-6 text-center sm:!p-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-100 to-amber-50 text-4xl shadow-card">
            🔐
          </div>
          <h1 className="text-xl font-extrabold text-stone-800">Masukkan PIN Kelompok</h1>
          <p className="mx-auto mt-1 max-w-xs text-sm text-stone-500">
            Hai, <b>{me?.student?.fullName ?? 'Siswa'}!</b> PIN 4 angka diberikan oleh gurumu untuk membuka fitur proyek kelompok (5–10).
          </p>

          <div className="mt-6 flex justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                className="h-14 w-13 rounded-2xl border-2 border-orange-200 bg-white text-center text-2xl font-extrabold text-orange-600 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                style={{ width: 56 }}
                inputMode="numeric"
                autoFocus={i === 0}
                value={d}
                disabled={busy || lockedSecs > 0}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                aria-label={`Angka PIN ke-${i + 1}`}
              />
            ))}
          </div>

          {lockedSecs > 0 ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">
              🔒 Terkunci {Math.floor(lockedSecs / 60)}:{String(lockedSecs % 60).padStart(2, '0')} — coba lagi nanti ya.
            </div>
          ) : (
            err && <div className="mt-5 text-left"><ErrorBox message={err} /></div>
          )}

          {!noGroup && !lockedSecs && (
            <p className="mt-4 text-xs text-stone-400">Percobaan tersisa: <b>{attemptsLeft}</b> — setelah 3 kali salah, PIN terkunci 5 menit.</p>
          )}

          {noGroup && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              🙏 <b>Kamu belum memiliki kelompok. Minta PIN ke gurumu.</b>
              <br />
              Sementara itu, kamu sudah bisa belajar dulu di Fitur 1–4 👇
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Link to="/beranda" className="btn-secondary w-full">
              📚 Lanjut ke Fitur 1–4 dulu
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
