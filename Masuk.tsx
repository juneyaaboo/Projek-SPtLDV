import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession, homeFor } from '../store'
import { ErrorBox } from '../components/ui'

export default function Masuk() {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const { refresh } = useSession()
  const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (name.trim().length < 3) {
      setErr('Tulis nama lengkapmu ya (minimal 3 huruf).')
      return
    }
    setBusy(true)
    try {
      await api('/auth/siswa', { body: { fullName: name } })
      const me = await refresh()
      nav(me?.role === 'student_l2' ? '/beranda' : '/pin')
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
              🙋
            </div>
            <h1 className="text-xl font-extrabold text-stone-800">Masuk Siswa</h1>
            <p className="mt-1 text-sm text-stone-500">Cukup tulis nama lengkapmu — tanpa password.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="nama">Nama Lengkap</label>
              <input
                id="nama"
                className="input text-base"
                placeholder="cth. Andi Pratama Wijaya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>
            {err && <ErrorBox message={err} />}
            <button type="submit" className="btn-primary w-full !py-3 text-base" disabled={busy}>
              {busy ? 'Memproses…' : 'Masuk 🚀'}
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-stone-400">
            Nama belum terdaftar? Langsung masuk saja — namamu otomatis tercatat untuk gurumu. 😉
          </p>
        </div>
        <p className="mt-5 text-center text-xs text-stone-400">
          Guru? <Link to="/guru/masuk" className="font-bold text-orange-500 underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  )
}
