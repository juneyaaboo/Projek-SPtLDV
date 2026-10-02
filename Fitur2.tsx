import { useState } from 'react'
import { api } from '../api'
import { useSession } from '../store'
import { PageHeader, Card, SuccessBox } from '../components/ui'

// =============================================================
// Fitur 2 — Modul Materi SPtLDV (4 bab, semua contoh bertema kuliner)
// =============================================================

interface Bab {
  id: number // 21..24
  emoji: string
  judul: string
  render: () => JSX.Element
}

function MiniGraph({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-orange-100 bg-orange-50/40 p-2">
      <svg viewBox="0 0 460 300" className="mx-auto w-full max-w-md">
        {children}
      </svg>
    </div>
  )
}

const sx = (x: number) => 40 + (x / 10) * 380
const sy = (y: number) => 260 - (y / 8) * 220

function Sumbu() {
  return (
    <g>
      {[2, 4, 6, 8, 10].map((t) => (
        <g key={t}>
          <line x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(8)} stroke="#FDBA74" strokeOpacity="0.5" />
          <text x={sx(t)} y={278} textAnchor="middle" fontSize="12" fill="#A8A29E">{t}</text>
        </g>
      ))}
      {[2, 4, 6, 8].map((t) => (
        <g key={t}>
          <line x1={sx(0)} y1={sy(t)} x2={sx(10)} y2={sy(t)} stroke="#FDBA74" strokeOpacity="0.5" />
          <text x={28} y={sy(t) + 4} textAnchor="end" fontSize="12" fill="#A8A29E">{t}</text>
        </g>
      ))}
      <line x1={sx(0)} y1={sy(0)} x2={sx(10.4)} y2={sy(0)} stroke="#78716C" strokeWidth="2" />
      <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(8.3)} stroke="#78716C" strokeWidth="2" />
      <text x={sx(10.4)} y={sy(0) + 4} fontSize="12" fontWeight="700" fill="#78716C">x</text>
      <text x={sx(0) - 14} y={sy(8.3)} fontSize="12" fontWeight="700" fill="#78716C">y</text>
    </g>
  )
}

function Bab1() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-stone-600">
      <p>
        Di dapur, kamu sering bertanya: <i>"Tepung masih cukup untuk berapa kue?"</i> Pertanyaan itu bisa ditulis
        sebagai <b>pertidaksamaan linear dua variabel</b> (PtLDV) — kalimat matematika yang memuat dua bilangan
        belum tentu (biasanya <b>x</b> dan <b>y</b>) serta tanda &lt;, &gt;, ≤, atau ≥.
      </p>
      <div className="rounded-2xl bg-orange-50 p-4">
        <p className="font-extrabold text-orange-700">Bentuk umum: ax + by ≤ c &nbsp;(atau ≥, &lt;, &gt;, =)</p>
        <p className="mt-1.5 text-xs text-stone-500">a dan b bukan nol sekaligus; c konstanta.</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Contoh dari dapur kantin</p>
        <ul className="mt-2 space-y-1.5">
          <li>🌾 Tepung: <b>200x + 150y ≤ 10.000</b> → tiap Kue Lapis pakai 200 g, tiap Risoles 150 g, stok 10 kg.</li>
          <li>⏱️ Waktu: <b>20x + 15y ≤ 600</b> → kue A 20 menit, kue B 15 menit, oven dipakai maksimal 10 jam.</li>
          <li>📦 Kemasan: <b>x + y ≤ 50</b> → kotak kue tinggal 50 buah.</li>
        </ul>
      </div>
      <p>
        Kenapa disebut <b>"sistem"</b>? Karena kendala dapur selalu lebih dari satu — ada tepung, telur, waktu — dan
        semua harus dipenuhi <i>secara bersamaan</i>. Himpunan semua pasangan (x, y) yang memenuhi seluruh
        pertidaksamaan disebut <b>daerah penyelesaian</b>: berupa suatu <b>daerah</b>, bukan hanya satu garis! 🗺️
      </p>
      <div className="rounded-2xl bg-green-50 p-4 text-green-800">
        💡 <b>Arti praktisnya:</b> setiap titik (x, y) di daerah itu adalah <i>resep jumlah produksi yang bisa
        dijalankan</i> — misalnya (20, 30) artinya membuat 20 Kue Lapis dan 30 Risoles tanpa kehabisan bahan.
      </div>
    </div>
  )
}

function Bab2() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-stone-600">
      <p>Contoh: gambar daerah penyelesaian dari <b>3x + 2y ≤ 12</b> (dalam ratusan gram tepung), x ≥ 0, y ≥ 0.</p>
      <ol className="ml-4 list-decimal space-y-3">
        <li>
          <b>Gambar garis batas</b> 3x + 2y = 12 dengan mencari dua titik:
          <div className="mt-1 rounded-xl bg-stone-50 p-3 font-mono text-xs">
            x = 0 → y = 6 → titik (0, 6)<br />
            y = 0 → x = 4 → titik (4, 0)
          </div>
        </li>
        <li>
          <b>Uji satu titik</b> yang mudah, biasanya (0, 0): &nbsp;3(0) + 2(0) = 0 ≤ 12 → <b>benar</b> ✅. Berarti
          daerah yang memuat (0, 0) yang diarsir.
        </li>
        <li>
          <b>Padatkan garisnya:</b> tanda ≤ atau ≥ → garis <b>penuh</b> (titik pada garis ikut). Tanda &lt; atau
          &gt; → garis <b>putus-putus</b> (titik pada garis tidak ikut).
        </li>
        <li>
          <b>Tambahkan x ≥ 0 dan y ≥ 0</b> → hanya kuadran I yang berarti (jumlah kue tak mungkin negatif 🍰).
        </li>
      </ol>
      <MiniGraph>
        <Sumbu />
        <polygon points={`${sx(0)},${sy(0)} ${sx(4)},${sy(0)} ${sx(0)},${sy(6)}`} fill="#F97316" fillOpacity="0.25" />
        <line x1={sx(4)} y1={sy(0)} x2={sx(0)} y2={sy(6)} stroke="#EA580C" strokeWidth="3" />
        <circle cx={sx(0.8)} cy={sy(1)} r="5" fill="#16A34A" />
        <text x={sx(0.8) + 8} y={sy(1) - 8} fontSize="11" fill="#16A34A" fontWeight="700">titik uji (0,0)✓</text>
        <text x={sx(1.4)} y={sy(1.6)} fontSize="12" fontWeight="800" fill="#C2410C">3x + 2y ≤ 12</text>
      </MiniGraph>
      <div className="rounded-2xl bg-red-50 p-4 text-red-700">
        ⚠️ <b>Jebakan umum:</b> kalau titik uji <i>tidak</i> memenuhi, arsir bagian yang <b>tidak memuat</b> titik uji.
      </div>
    </div>
  )
}

function Bab3() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-stone-600">
      <p>
        <b>Titik pojok</b> adalah sudut-sudut daerah penyelesaian — tempat dua garis batas berpotongan. Titik inilah
        "kandidat juara" saat mencari keuntungan maksimum! 🏆
      </p>
      <p>Contoh: daerah dibatasi x ≥ 0, y ≥ 0, x + y ≤ 8 (kemasan) dan 2x + y ≤ 10 (telur, dalam butir puluhan).</p>
      <MiniGraph>
        <Sumbu />
        <polygon points={`${sx(0)},${sy(0)} ${sx(5)},${sy(0)} ${sx(2)},${sy(6)} ${sx(0)},${sy(8)}`} fill="#F97316" fillOpacity="0.25" />
        <line x1={sx(8)} y1={sy(0)} x2={sx(0)} y2={sy(8)} stroke="#0EA5E9" strokeWidth="2.5" />
        <line x1={sx(5)} y1={sy(0)} x2={sx(0)} y2={sy(10)} stroke="#A855F7" strokeWidth="2.5" />
        {[[0, 0], [5, 0], [2, 6], [0, 8]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={sx(x)} cy={sy(y)} r="5.5" fill="#fff" stroke="#16A34A" strokeWidth="3" />
            <text x={sx(x) + 9} y={sy(y) + 4} fontSize="11.5" fontWeight="800" fill="#166534">({x},{y})</text>
          </g>
        ))}
      </MiniGraph>
      <div className="rounded-2xl bg-stone-50 p-4">
        <p className="font-bold text-stone-700">Cara mencari titik pojok (tanpa grafik): eliminasi–substitusi</p>
        <div className="mt-2 space-y-1 font-mono text-xs leading-relaxed">
          <p>x + y = 8 &nbsp;dan&nbsp; 2x + y = 10 → kurangkan:</p>
          <p>(2x + y) − (x + y) = 10 − 8 → <b>x = 2</b></p>
          <p>Substitusi: 2 + y = 8 → <b>y = 6</b> → titik potong (2, 6) ✅</p>
        </div>
      </div>
      <p>
        Jadi titik pojoknya: <b>(0,0)</b>, <b>(5,0)</b>, <b>(2,6)</b>, dan <b>(0,8)</b>. Perhatikan (5,0) berasal dari
        garis telur di sumbu x, dan (0,8) dari garis kemasan di sumbu y.
      </p>
    </div>
  )
}

function Bab4() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-stone-600">
      <p>
        <b>Fungsi tujuan</b> Z biasanya = keuntungan: <b>Z = (harga jual − modal)·x + (harga jual − modal)·y</b>.
        Misal untung Kue Lapis Rp6 ribu dan Risoles Rp5 ribu → <b>Z = 6x + 5y</b> (dalam ribuan rupiah).
      </p>
      <div className="rounded-2xl bg-orange-50 p-4 font-extrabold text-orange-700">
        🏆 Teorema titik pojok: nilai maksimum / minimum Z tercapai di salah satu titik pojok daerah penyelesaian.
      </div>
      <p>Cara termudah: <b>substitusikan setiap titik pojok ke Z</b>, lalu pilih yang terbesar (maksimum) atau terkecil (minimum):</p>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[380px] text-sm">
          <thead>
            <tr className="border-b border-orange-100 bg-orange-50/70 text-left text-xs uppercase text-stone-500">
              <th className="px-4 py-2.5">Titik pojok</th>
              <th className="px-4 py-2.5">Z = 6x + 5y</th>
              <th className="px-4 py-2.5">Nilai</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {[
              ['(0, 0)', '6(0)+5(0)', '0'],
              ['(5, 0)', '6(5)+5(0)', '30'],
              ['(2, 6)', '6(2)+5(6)', '42 ⭐ maks'],
              ['(0, 8)', '6(0)+5(8)', '40'],
            ].map((row, i) => (
              <tr key={i} className={`border-b border-orange-50 last:border-0 ${i === 2 ? 'bg-yellow-50 font-extrabold text-yellow-700' : ''}`}>
                <td className="px-4 py-2.5">{row[0]}</td>
                <td className="px-4 py-2.5">{row[1]}</td>
                <td className="px-4 py-2.5">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl bg-green-50 p-4 text-green-800">
        ✅ <b>Kesimpulan:</b> buat <b>2 puluhan Kue Lapis</b> dan <b>6 puluhan Risoles</b> → keuntungan maksimum
        <b> Rp420 ribu</b> per hari. Interpretasi jawaban sama pentingnya dengan hitungannya! 💰
      </div>
    </div>
  )
}

const BAB: Bab[] = [
  { id: 21, emoji: '🧁', judul: 'Bab 1 · Apa itu Pertidaksamaan Linear Dua Variabel?', render: Bab1 },
  { id: 22, emoji: '🎨', judul: 'Bab 2 · Cara Menggambar Daerah Penyelesaian', render: Bab2 },
  { id: 23, emoji: '📌', judul: 'Bab 3 · Cara Mencari Titik Pojok', render: Bab3 },
  { id: 24, emoji: '🏆', judul: 'Bab 4 · Nilai Optimum: Maksimum & Minimum', render: Bab4 },
]

export default function Fitur2() {
  const { me, refresh } = useSession()
  const progress = me?.progress ?? []
  const [open, setOpen] = useState<number | null>(BAB.find((b) => !progress.includes(b.id))?.id ?? 21)
  const [busy, setBusy] = useState(false)
  const [just, setJust] = useState<number | null>(null)

  async function tandai(id: number) {
    setBusy(true)
    try {
      await api('/siswa/progres', { body: { feature: id } })
      await refresh()
      setJust(id)
      // buka bab berikutnya
      const idx = BAB.findIndex((b) => b.id === id)
      if (idx < BAB.length - 1) setOpen(BAB[idx + 1].id)
    } finally {
      setBusy(false)
    }
  }

  const semuaSelesai = BAB.every((b) => progress.includes(b.id))

  return (
    <div className="animate-fadeIn">
      <PageHeader emoji="📖" title="Fitur 2 · Modul Materi SPtLDV" subtitle="Empat bab ringkas dengan contoh bertema dapur & kantin. Tandai selesai setiap bab!" badge="Fitur belajar" />
      {semuaSelesai && <SuccessBox message="🌟 Semua bab sudah selesai! Kamu siap lanjut ke Grafik Interaktif dan Kuis." />}

      <div className="space-y-3">
        {BAB.map((b) => {
          const done = progress.includes(b.id)
          const isOpen = open === b.id
          const Body = b.render
          return (
            <div key={b.id} className={`card overflow-hidden !p-0 ${isOpen ? 'border-orange-200' : ''}`}>
              <button className="flex w-full items-center gap-3 px-4 py-4 text-left" onClick={() => setOpen(isOpen ? null : b.id)}>
                <span className="text-2xl">{b.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-stone-800 sm:text-base">{b.judul}</span>
                </span>
                {done && <span className="badge bg-green-100 text-green-700">✓ Selesai</span>}
                <span className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {isOpen && (
                <div className="border-t border-orange-100 px-4 py-5 sm:px-6">
                  <Body />
                  <div className="mt-5 flex items-center gap-3">
                    {done ? (
                      <span className="badge bg-green-100 px-4 py-2 text-green-700">✅ Bab ini sudah ditandai selesai</span>
                    ) : (
                      <button className="btn-green" disabled={busy} onClick={() => tandai(b.id)}>
                        {busy ? 'Menyimpan…' : '✅ Tandai Selesai'}
                      </button>
                    )}
                    {just === b.id && <span className="text-xs font-bold text-green-600">Tersimpan!</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
