import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { PageHeader, Card, Spinner, ErrorBox } from '../../components/ui'
import { Search, UserPlus } from 'lucide-react'

// /guru/siswa — daftar siswa yang pernah masuk (berdasarkan nama)
interface Siswa {
  id: number
  fullName: string
  groupName: string | null
  groupId: number | null
  pinEntered: boolean
  joinedAt: string
}

export default function GuruSiswa() {
  const [students, setStudents] = useState<Siswa[] | null>(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    api<{ students: Siswa[] }>('/guru/siswa').then((d) => setStudents(d.students)).catch(() => setErr('Gagal memuat siswa.'))
  }, [])

  const filtered = useMemo(() => {
    if (!students) return []
    const s = q.trim().toLowerCase()
    return s ? students.filter((x) => x.fullName.toLowerCase().includes(s)) : students
  }, [students, q])

  const berKelompok = filtered.filter((s) => s.groupId)
  const tanpaKelompok = filtered.filter((s) => !s.groupId)

  if (!students) return <Spinner />

  return (
    <div className="animate-fadeIn">
      <PageHeader emoji="🧑‍🎓" title="Data Siswa" subtitle="Semua siswa yang pernah masuk dengan nama mereka." />
      {err && <div className="mb-4"><ErrorBox message={err} /></div>}

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input className="input !pl-9" placeholder="Cari nama siswa…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-xs text-stone-400">{filtered.length} siswa</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-orange-100 bg-orange-50/60 px-4 py-3 text-sm font-extrabold text-stone-700">
            ✅ Sudah bergabung kelompok ({berKelompok.length})
          </div>
          <Daftar items={berKelompok} kosong="Belum ada siswa yang bergabung kelompok. Atur di menu Kelompok & PIN." />
        </Card>
        <Card className="!p-0 overflow-hidden !border-amber-200">
          <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-3 text-sm font-extrabold text-amber-700">
            ⏳ Belum punya kelompok ({tanpaKelompok.length})
          </div>
          <Daftar items={tanpaKelompok} kosong="Semua siswa sudah berkelompok. 🎉" />
        </Card>
      </div>
    </div>
  )
}

function Daftar({ items, kosong }: { items: Siswa[]; kosong: string }) {
  if (items.length === 0) return <p className="px-4 py-6 text-sm text-stone-400">{kosong}</p>
  return (
    <ul className="divide-y divide-orange-50">
      {items.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-amber-50 text-sm font-extrabold text-orange-600">
            {s.fullName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-stone-700">
              {s.fullName} {s.pinEntered && <span title="Sudah pakai PIN">🔓</span>}
            </p>
            <p className="text-xs text-stone-400">
              {s.groupName ? `👥 ${s.groupName} · ` : ''}pertama masuk: {s.joinedAt}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
