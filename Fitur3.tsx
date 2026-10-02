import { useEffect, useState } from 'react'
import { api } from '../api'
import { useSession } from '../store'
import { PageHeader, SuccessBox } from '../components/ui'
import Grafik from '../components/Grafik'

// =============================================================
// Fitur 3 — Grafik Interaktif (custom SVG, tanpa GeoGebra)
// =============================================================

export default function Fitur3() {
  const { me, refresh } = useSession()
  const selesai = (me?.progress ?? []).includes(3)
  const [busy, setBusy] = useState(false)
  const [justDone, setJustDone] = useState(false)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTried(true), 8000) // anggap "mencoba" setelah 8 detik bereksperimen
    return () => clearTimeout(t)
  }, [])

  async function tandai() {
    setBusy(true)
    try {
      await api('/siswa/progres', { body: { feature: 3 } })
      await refresh()
      setJustDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        emoji="📈"
        title="Fitur 3 · Grafik Interaktif"
        subtitle="Geser slider, tambah/hapus garis, klik titik pojok — lihat daerah penyelesaian berubah secara langsung!"
        badge="Custom SVG 🛠️"
      />

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-stone-500">
        <span className="chip">🧪 Coba geser koefisien a dan b</span>
        <span className="chip">🔘 Ganti tanda ≤ / ≥</span>
        <span className="chip">➕ Tambah hingga 6 garis</span>
        <span className="chip">⭐ Aktifkan fungsi tujuan Z</span>
      </div>

      <Grafik mode="interaktif" />

      <div className="mt-6 space-y-3">
        {justDone && <SuccessBox message="Keren! Eksperimen grafikmu tercatat. Sekarang uji pemahamanmu di Kuis! 📝" />}
        {selesai ? (
          <div className="card flex items-center gap-3 !border-green-200 !bg-green-50 !p-4">
            <span className="text-2xl">✅</span>
            <div className="text-sm font-bold text-green-700">Fitur ini sudah kamu tandai selesai.</div>
          </div>
        ) : (
          <button className="btn-green w-full sm:w-auto !px-6" onClick={tandai} disabled={busy || !tried}>
            {busy ? 'Menyimpan…' : tried ? '✅ Saya Sudah Mencoba' : 'Eksperimen dulu 8 detik… 🧪'}
          </button>
        )}
      </div>
    </div>
  )
}
