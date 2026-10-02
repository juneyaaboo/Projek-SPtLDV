import { useEffect, useState } from 'react'
import { api } from '../../api'
import { PageHeader, Card, Spinner, ErrorBox, Modal } from '../../components/ui'
import { Shuffle, Plus, Copy, RefreshCw, Trash2, GripVertical, X, UserPlus } from 'lucide-react'

// =============================================================
// /guru/kelompok — kelola kelompok: acak otomatis, drag & drop,
// PIN otomatis, reset PIN, hapus kelompok.
// =============================================================

interface SiswaRingkas {
  id: number
  fullName: string
  groupName: string | null
  pinEntered: boolean
}
interface Grup {
  id: number
  name: string
  pin: string
  students: SiswaRingkas[]
}
interface Data {
  groups: Grup[]
  ungrouped: { id: number; fullName: string }[]
}

export default function GuruKelompok() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [perGroup, setPerGroup] = useState(4)
  const [drag, setDrag] = useState<number | null>(null)
  const [hapus, setHapus] = useState<Grup | null>(null)
  const [baru, setBaru] = useState('')

  useEffect(() => {
    load().catch(() => setErr('Gagal memuat kelompok.'))
  }, [])

  async function load() {
    const d = await api<Data>('/guru/kelompok')
    setData(d)
  }

  async function aksi<T>(fn: () => Promise<T>, pesan?: string) {
    setErr('')
    setMsg('')
    try {
      await fn()
      if (pesan) setMsg(pesan)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Terjadi kesalahan.')
    }
  }

  async function acakOtomatis() {
    if (!window.confirm(`Bagi ${data?.ungrouped.length ?? 0} siswa tanpa kelompok menjadi kelompok berisi ±${perGroup} orang secara acak?`)) return
    await aksi(() => api('/guru/kelompok/acak', { body: { perGroup } }), '🎲 Pembagian acak selesai!')
  }

  async function buatBaru() {
    await aksi(() => api('/guru/kelompok', { body: { name: baru.trim() || undefined } }), '✅ Kelompok baru dibuat (PIN otomatis).')
    setBaru('')
  }

  function onDrop(gid: number) {
    if (drag === null) return
    const sid = drag
    setDrag(null)
    aksi(() => api(`/guru/kelompok/${gid}/anggota`, { body: { studentId: sid, action: 'add' } }), '✅ Anggota dipindahkan.')
  }

  if (!data) return <Spinner />

  return (
    <div className="animate-fadeIn">
      <PageHeader emoji="👥" title="Kelompok & PIN" subtitle="Seret kartu siswa ke kelompok untuk memindahkan. PIN 4 angka dibuat otomatis." />

      {err && <div className="mb-4"><ErrorBox message={err} /></div>}
      {msg && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{msg}</div>}

      {/* aksi cepat */}
      <Card className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="label !mb-1 !text-xs">Jumlah per kelompok (acak otomatis)</label>
          <input type="number" min={2} max={8} className="input !w-28" value={perGroup} onChange={(e) => setPerGroup(Number(e.target.value) || 4)} />
        </div>
        <button className="btn-primary" onClick={acakOtomatis} disabled={data.ungrouped.length === 0}>
          <Shuffle className="h-4 w-4" /> 🎲 Acak Otomatis ({data.ungrouped.length} siswa)
        </button>
        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className="label !mb-1 !text-xs">Nama kelompok baru</label>
            <input className="input !w-44" placeholder="cth. Kelompok Brownis" value={baru} onChange={(e) => setBaru(e.target.value)} />
          </div>
          <button className="btn-secondary" onClick={buatBaru}>
            <Plus className="h-4 w-4" /> Buat
          </button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* ===== pool siswa ===== */}
        <Card className="h-fit lg:sticky lg:top-20">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-stone-700">
            <UserPlus className="h-4 w-4 text-orange-400" /> Belum punya kelompok ({data.ungrouped.length})
          </h3>
          {data.ungrouped.length === 0 ? (
            <p className="rounded-xl bg-green-50 px-3 py-2.5 text-xs font-bold text-green-700">🎉 Semua siswa sudah punya kelompok!</p>
          ) : (
            <div className="space-y-2">
              {data.ungrouped.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDrag(s.id)}
                  onDragEnd={() => setDrag(null)}
                  className={`flex cursor-grab items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold text-stone-600 transition active:cursor-grabbing ${
                    drag === s.id ? 'border-orange-400 bg-orange-100' : 'border-orange-100 bg-orange-50/60 hover:border-orange-300'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-stone-300" />
                  <span className="min-w-0 flex-1 truncate">{s.fullName}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-stone-400">💡 Seret kartu di atas ke kartu kelompok di kanan.</p>
        </Card>

        {/* ===== daftar kelompok ===== */}
        <div className="grid gap-4 sm:grid-cols-2">
          {data.groups.map((g) => (
            <div
              key={g.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(g.id)}
              className={`card !p-4 transition ${drag !== null ? 'border-dashed border-2 border-orange-300 ring-4 ring-orange-100' : ''}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold text-stone-700">{g.name}</h3>
                <span className="badge bg-amber-100 text-amber-700">PIN {g.pin}</span>
                <button
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-amber-50 hover:text-amber-600"
                  title="Salin PIN"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(g.pin).catch(() => {})
                    setMsg(`PIN ${g.name} (${g.pin}) disalin!`)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-[90px] space-y-1.5 rounded-xl bg-orange-50/40 p-2">
                {g.students.map((s) => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => setDrag(s.id)}
                    className="flex cursor-grab items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-stone-600 shadow-sm active:cursor-grabbing"
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-stone-300" />
                    <span className="min-w-0 flex-1 truncate">
                      {s.fullName} {s.pinEntered && '🔓'}
                    </span>
                    <button
                      className="rounded p-0.5 text-stone-300 hover:bg-red-50 hover:text-red-400"
                      title="Keluarkan dari kelompok"
                      onClick={() => aksi(() => api(`/guru/kelompok/${g.id}/anggota`, { body: { studentId: s.id, action: 'remove' } }))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {g.students.length === 0 && <p className="px-2 py-3 text-center text-xs text-stone-400">Kosong — seret siswa ke sini</p>}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className="btn-secondary !min-h-0 flex-1 !px-2 !py-2 text-xs"
                  onClick={() => aksi(() => api(`/guru/kelompok/${g.id}/pin-reset`, { method: 'POST' }), `🔁 PIN ${g.name} direset.`)}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reset PIN
                </button>
                <button className="btn-secondary !min-h-0 !px-3 !py-2 text-red-500 hover:!bg-red-50" onClick={() => setHapus(g)} title="Hapus kelompok">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {data.groups.length === 0 && (
            <Card className="sm:col-span-2 text-center text-sm text-stone-400">
              Belum ada kelompok. Gunakan <b>Acak Otomatis</b> atau <b>Buat</b> kelompok baru. 👆
            </Card>
          )}
        </div>
      </div>

      {/* daftar PIN siap bagikan */}
      {data.groups.length > 0 && (
        <Card className="mt-5">
          <h3 className="mb-2 text-sm font-extrabold text-stone-700">📋 Daftar PIN (siap dibagikan)</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3.5 py-2.5 text-sm">
                <span className="font-bold text-stone-600">{g.name}</span>
                <span className="font-mono text-base font-extrabold tracking-widest text-orange-600">{g.pin}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* modal hapus */}
      <Modal open={!!hapus} onClose={() => setHapus(null)} title={`Hapus ${hapus?.name}?`}>
        <p className="text-sm text-stone-500">
          Anggota kelompok akan menjadi tanpa kelompok (harus PIN ulang setelah dimasukkan lagi). Riwayat jurnal & nilai tetap tersimpan.
        </p>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setHapus(null)}>
            Batal
          </button>
          <button
            className="btn flex-1 bg-red-500 text-white hover:bg-red-600"
            onClick={async () => {
              const g = hapus
              setHapus(null)
              if (g) await aksi(() => api(`/guru/kelompok/${g.id}`, { method: 'DELETE' }), '🗑️ Kelompok dihapus.')
            }}
          >
            Ya, Hapus
          </button>
        </div>
      </Modal>
    </div>
  )
}
