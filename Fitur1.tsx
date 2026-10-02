import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useSession } from '../store'
import { PageHeader, Card, SuccessBox } from '../components/ui'
import { Play, Pause, RotateCcw, VolumeX, Volume2 } from 'lucide-react'

// Cerita masalah: 6 adegan, total 2 menit
const SCENES = [
  { src: '/media/cerita.mp4', t: 0 },
]

const KENDALA = [
  { bahan: '🌾 Tepung', kueA: '200 gram', kueB: '150 gram', total: '10 kg (10.000 gram)' },
  { bahan: '🥚 Telur', kueA: '2 butir', kueB: '1 butir', total: '50 butir' },
  { bahan: '🍬 Gula', kueA: '100 gram', kueB: '50 gram', total: '3 kg (3.000 gram)' },
  { bahan: '⏱️ Waktu produksi', kueA: '20 menit', kueB: '15 menit', total: '10 jam (600 menit)' },
  { bahan: '💰 Untung / kue', kueA: 'Rp6.000', kueB: 'Rp5.000', total: '—' },
]

export default function Fitur1() {
  const { me, refresh } = useSession()
  const selesai = (me?.progress ?? []).includes(1)
  const [busy, setBusy] = useState(false)
  const [justDone, setJustDone] = useState(false)

  async function tandai() {
    setBusy(true)
    try {
      await api('/siswa/progres', { body: { feature: 1 } })
      await refresh()
      setJustDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader emoji="🎬" title="Fitur 1 · Video & Cerita Masalah" subtitle="Tonton kisah dapur kantin, lalu temukan data kendala produksinya di tabel bawah." badge="Fitur belajar" />

      {/* pemutar video */}
      <div className="card overflow-hidden !p-0">
        <video
          className="w-full bg-black"
          src="/media/cerita.mp4"
          poster="/media/scene1.jpg"
          controls
          playsInline
          preload="metadata"
        />
      </div>

      <Card className="mt-4 !bg-orange-50/60">
        <h2 className="font-extrabold text-stone-800">🍜 Cerita Masalahnya</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Kantin Tata Boga bisa membuat <b>dua jenis kue</b>: <b>Kue Lapis</b> dan <b>Risoles</b>. Tapi bahan baku
          terbatas dan waktu produksi juga terbatas. <b>Kombinasi mana yang paling menguntungkan?</b> 🤔
        </p>
      </Card>

      {/* tabel data */}
      <h2 className="mb-3 mt-6 font-extrabold text-stone-700">📊 Data Dapur Kantin (per hari)</h2>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-orange-100 bg-orange-50/70 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-3">Kendala</th>
              <th className="px-4 py-3">Kue Lapis (x)</th>
              <th className="px-4 py-3">Risoles (y)</th>
              <th className="px-4 py-3">Tersedia / Hari</th>
            </tr>
          </thead>
          <tbody>
            {KENDALA.map((k, i) => (
              <tr key={i} className="border-b border-orange-50 last:border-0">
                <td className="px-4 py-3 font-bold text-stone-700">{k.bahan}</td>
                <td className="px-4 py-3">{k.kueA}</td>
                <td className="px-4 py-3">{k.kueB}</td>
                <td className="px-4 py-3 font-semibold text-orange-600">{k.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3">
        {justDone && <SuccessBox message="Mantap! Kamu sudah menyelesaikan Fitur 1. Lanjut ke Modul Materi ya! 📖" />}
        {selesai ? (
          <div className="card flex items-center gap-3 !border-green-200 !bg-green-50 !p-4">
            <span className="text-2xl">✅</span>
            <div className="text-sm font-bold text-green-700">Fitur ini sudah kamu tandai selesai.</div>
          </div>
        ) : (
          <button className="btn-green w-full sm:w-auto !px-6" onClick={tandai} disabled={busy}>
            {busy ? 'Menyimpan…' : '✅ Saya Sudah Menonton'}
          </button>
        )}
      </div>
    </div>
  )
}
