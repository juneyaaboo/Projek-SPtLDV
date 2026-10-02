import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useSession } from '../../store'
import { ErrorBox } from '../../components/ui'

export default function GuruMasuk() {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [exists, setExists] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const { refresh } = useSession()
  const nav = useNavigate()

  useEffect(() => {
    api<{ teacherExists: boolean }>('/setup/status').then((d) => setExists(d.teacherExists)).catch(() => setExists(true))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await api('/auth/guru', { body: { password } })
      await refresh()
      nav('/guru/dashboard')
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal masuk.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-extrabold text-orange-600">
          <span className="text-2xl">🍳</span> PjBL SPtLDV
        </Link>
        <div className="card animate-pop !p-6 sm:!p-8">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-100 to-amber-50 text-4xl shadow-card">
              👩‍🏫
            </div>
            <h1 className="text-xl font-extrabold text-stone-800">Masuk Guru</h1>
            <p className="mt-1 text-sm text-stone-500">Masukkan password guru untuk membuka dashboard monitoring.</p>
          </div>
          {exists === false ? (
            <div className="space-y-4 text-center">
              <ErrorBox message="Belum ada guru terdaftar. Lakukan pendaftaran pertama kali dulu ya." />
              <Link to="/admin/setup" className="btn-primary w-full">
                🛠️ Pendaftaran Pertama Kali
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label" htmlFor="pw">Password Guru</label>
                <input id="pw" type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              </div>
              {err && <ErrorBox message={err} />}
              <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
                {busy ? 'Memeriksa…' : 'Masuk Dashboard'}
              </button>
            </form>
          )}
          <p className="mt-5 text-center text-xs text-stone-400">
            Belum pernah setup? <Link to="/admin/setup" className="font-bold text-orange-500 underline">Daftar di /admin/setup</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
