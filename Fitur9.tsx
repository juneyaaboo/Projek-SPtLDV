import { useEffect, useState, type ChangeEvent } from 'react'
import { api, fmtTgl } from '../api'
import { useSession } from '../store'
import { PageHeader, Card, Spinner, ErrorBox, SuccessBox } from '../components/ui'
import { CheckCircle2, UploadCloud } from 'lucide-react'

// =============================================================
// Fitur 9 — Upload Portofolio Kelompok (satu kiriman per kelompok)
// =============================================================

const FORMAT: { key: string; emoji: string; desc: string; accept: string; ext: string[] }[] = [
  { key: 'Laporan Tertulis', emoji: '📄', desc: 'PDF / DOC / DOCX', accept: '.pdf,.doc,.docx', ext: ['pdf', 'doc', 'docx'] },
  { key: 'Infografis', emoji: '📊', desc: 'PNG / PDF', accept: '.png,.pdf', ext: ['png', 'pdf'] },
  { key: 'Presentasi', emoji: '📑', desc: 'PPT / PPTX / PDF', accept: '.ppt,.pptx,.pdf', ext: ['ppt', 'pptx', 'pdf'] },
  { key: 'Video', emoji: '🎥', desc: 'MP4 · maks 5 menit', accept: '.mp4', ext: ['mp4'] },
  { key: 'Booklet', emoji: '📖', desc: 'PDF', accept: '.pdf', ext: ['pdf'] },
  { key: 'Lainnya', emoji: '🎨', desc: 'tulis formatmu sendiri', accept: '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4', ext: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4'] },
]
const MAX_MB = 50

interface Porto {
  formatType: string
  fileUrl: string | null
  fileName: string | null
  notes: string
  createdAt: string
}

export default function Fitur9() {
  const { me, refresh } = useSession()
  const [porto, setPorto] = useState<Porto | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [format, setFormat] = useState('')
  const [customFormat, setCustomFormat] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ data: Porto | null }>('/portofolio')
      .then((d) => {
        setPorto(d.data)
        if (d.data) {
          if (d.data.formatType.startsWith('Lainnya')) {
            setFormat('Lainnya')
            setCustomFormat(d.data.formatType.replace('Lainnya:', '').trim())
          } else setFormat(d.data.formatType)
          setNotes(d.data.notes ?? '')
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  function pilih(e: ChangeEvent<HTMLInputElement>) {
    setErr(''); setOk('')
    const f = e.target.files?.[0]
    if (!f) return setFile(null)
    const fmt = FORMAT.find((x) => x.key === format)
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (fmt && !fmt.ext.includes(ext)) {
      setErr(`Format "${format}" menerima: ${fmt.desc}. Berkasmu .${ext}`)
      e.target.value = ''
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErr(`Ukuran berkas maksimal ${MAX_MB} MB.`)
      e.target.value = ''
      return
    }
    setFile(f)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!format) return setErr('Pilih format portofolio dulu ya.')
    if (format === 'Lainnya' && !customFormat.trim()) return setErr('Tulis dulu format lain yang kamu pilih.')
    if (!file) return setErr('Pilih berkas portofoliomu dulu ya.')
    setBusy(true)
    try {
      const form = new FormData()
      form.append('formatType', format)
      form.append('customFormat', customFormat)
      form.append('notes', notes)
      form.append('file', file)
      await api('/portofolio', { form })
      setOk('🎉 Portofolio kelompok berhasil diunggah! Guru dapat melihatnya di dashboard.')
      const d = await api<{ data: Porto | null }>('/portofolio')
      setPorto(d.data)
      setFile(null)
      await refresh()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Gagal mengunggah.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <Spinner />

  const fmtAktif = FORMAT.find((x) => x.key === format)

  return (
    <div className="animate-fadeIn">
      <PageHeader
        emoji="🗂️"
        title="Fitur 9 · Upload Portofolio"
        subtitle="Karya akhir kelompokmu — satu kiriman per kelompok, bisa diganti dengan versi terbaru."
        badge={me?.student?.groupName ? `👥 ${me.student.groupName}` : 'Proyek kelompok'}
      />

      {ok && <div className="mb-4"><SuccessBox message={ok} /></div>}
      {err && <div className="mb-4"><ErrorBox message={err} /></div>}

      {porto && !ok && (
        <Card className="mb-5 !border-green-200 !bg-green-50/60">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-green-700">Portofolio sudah diunggah ✓</p>
              <p className="text-xs text-stone-500">
                {porto.formatType} · {porto.fileName} · {fmtTgl(porto.createdAt)}
              </p>
            </div>
            {porto.fileUrl && (
              <a href={porto.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary !min-h-0 !px-3.5 !py-2 text-xs">
                👁️ Lihat berkas
              </a>
            )}
          </div>
          {porto.notes && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-stone-500">📝 {porto.notes}</p>}
          <p className="mt-2 text-xs text-stone-400">Ingin memperbaiki? Unggah versi terbaru lewat form di bawah — berkas lama otomatis diganti.</p>
        </Card>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Card>
          <h2 className="mb-3 font-extrabold text-stone-700">1️⃣ Pilih format karya</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {FORMAT.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFormat(f.key)
                  setFile(null)
                  setErr('')
                }}
                className={`rounded-2xl border-2 p-3.5 text-left transition ${
                  format === f.key ? 'border-orange-400 bg-orange-50 shadow-soft' : 'border-orange-100 bg-white hover:border-orange-200'
                }`}
              >
                <div className="text-2xl">{f.emoji}</div>
                <div className="mt-1 text-sm font-extrabold text-stone-700">{f.key}</div>
                <div className="text-[11px] text-stone-400">{f.desc}</div>
              </button>
            ))}
          </div>
          {format === 'Lainnya' && (
            <div className="mt-3">
              <label className="label">Format apa yang kamu buat?</label>
              <input className="input" placeholder="cth. Video stop-motion, poster kanvas, podcast…" value={customFormat} onChange={(e) => setCustomFormat(e.target.value)} />
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-extrabold text-stone-700">2️⃣ Unggah berkas (maks {MAX_MB} MB)</h2>
          {fmtAktif && <p className="mb-2 text-xs text-stone-400">Format diterima: {fmtAktif.desc}</p>}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/40 px-6 py-10 text-center transition hover:bg-orange-50">
            <UploadCloud className="h-9 w-9 text-orange-400" />
            <span className="text-sm font-bold text-stone-600">{file ? file.name : 'Ketuk untuk memilih berkas'}</span>
            <span className="text-xs text-stone-400">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB terpilih` : 'atau seret ke sini'}</span>
            <input type="file" className="hidden" accept={fmtAktif?.accept} onChange={pilih} />
          </label>
          <div className="mt-4">
            <label className="label">Catatan untuk guru (opsional)</label>
            <textarea className="input min-h-[80px] resize-y" placeholder="cth. Video durasi 4 menit, dibuat oleh seluruh anggota kelompok…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Card>

        <button type="submit" className="btn-primary w-full !px-7 sm:w-auto" disabled={busy}>
          {busy ? 'Mengunggah…' : porto ? '🔄 Ganti Portofolio' : '🚀 Unggah Portofolio'}
        </button>
      </form>
    </div>
  )
}
