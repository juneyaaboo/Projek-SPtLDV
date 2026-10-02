import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useSession } from '../../store'
import { ErrorBox, SuccessBox, Spinner } from '../../components/ui'

// /admin/setup — pendaftaran guru pertama kali
export default function Setup() {
  const [status, setStatus] = useState<'loading' | 'baru' | 'sudah'>('loading')
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [password, setPassword] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const { refresh } = useSession()
  const nav = useNavigate()

  useEffect(() => {
    api<{ teacherExists: boolean }>('/setup/status')
      .then((d) => setStatus(d.teacherExists ? 'sudah' : 'baru'))
      .catch(() => setStatus('sudah'))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (name.trim().length < 3) return setErr('Nama guru minimal 3 karakter.')
    if (password.length < 6) return setErr('Password minimal 6 karakter.')
    if (password !== pw2) return setErr('Konfirmasi password tidak sama.')
    setBusy(true)
    try {
      await api('/setup', { body: { name, password, className } })
      await refresh()
      setOk('Pendaftaran berhasil! Mengalihkan ke dashboard…')
      setTimeout(() => nav('/guru/dashboard'), 900)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal mendaftar.')
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
              🛠️
            </div>
            <h1 className="text-xl font-extrabold text-stone-800">Setup Pertama Kali</h1>
            <p className="mt-1 text-sm text-stone-500">Daftarkan akun guru & kelas untuk memulai.</p>
          </div>

          {status === 'loading' && <Spinner />}
          {status === 'sudah' && (
            <div className="space-y-4 text-center">
              <SuccessBox message="Guru sudah terdaftar di kelas ini." />
              <Link to="/guru/masuk" className="btn-primary w-full">
                Masuk sebagai Guru
              </Link>
            </div>
          )}
          {status === 'baru' && (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Nama Guru</label>
                <input className="input" placeholder="cth. Bu Sari Wijaya" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Nama Kelas</label>
                <input className="input" placeholder="cth. X Tata Boga 1" value={className} onChange={(e) => setClassName(e.target.value)} />
              </div>
              <div>
                <label className="label">Password (min. 6 karakter)</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="label">Ulangi Password</label>
                <input className="input" type="password" placeholder="••••••••" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              {err && <ErrorBox message={err} />}
              {ok && <SuccessBox message={ok} />}
              <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
                {busy ? 'Mendaftarkan…' : '✅ Daftarkan Guru'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
