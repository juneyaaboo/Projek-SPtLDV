import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowRight, ChefHat, LineChart, ClipboardCheck, Presentation } from 'lucide-react'
import { useSession, homeFor } from '../store'

export default function Landing() {
  const { me, loading } = useSession()
  const nav = useNavigate()

  useEffect(() => {
    if (!loading && me) nav(homeFor(me), { replace: true })
  }, [me, loading, nav])

  return (
    <div className="min-h-screen">
      {/* dekorasi */}
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-64 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-extrabold text-orange-600">
          <span className="text-2xl">🍳</span> PjBL SPtLDV
        </div>
        <Link to="/guru/masuk" className="btn-secondary !min-h-0 !px-3.5 !py-2 text-xs sm:text-sm">
          👩‍🏫 Untuk Guru
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-16">
        {/* HERO */}
        <div className="grid items-center gap-8 py-8 md:grid-cols-2 md:py-14">
          <div className="animate-fadeIn">
            <span className="chip mb-4">📘 Matematika • SMK Tata Boga</span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-stone-800 sm:text-4xl md:text-[2.7rem]">
              Belajar <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">SPtLDV</span> Lewat Proyek Dapur Kantin Sekolah! 🍰
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600">
              Wawancara data kantin, susun pertidaksamaan linear dua variabel, gambarkan daerah penyelesaian,
              dan temukan kombinasi kue paling menguntungkan — semuanya dalam satu platform proyek berbasis
              pembelajaran (PjBL).
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/masuk" className="btn-primary !px-6 !py-3 text-base">
                🙋 Masuk Siswa <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/guru/masuk" className="btn-secondary !px-6 !py-3 text-base">
                Masuk Guru
              </Link>
            </div>
            <p className="mt-4 text-xs text-stone-400">Masuk siswa cukup dengan nama lengkap — tanpa password. 🔓</p>
          </div>

          <div className="animate-pop">
            <div className="card overflow-hidden !p-0 rotate-1">
              <img src="/media/hero.jpg" alt="Ilustrasi siswa Tata Boga belajar matematika" className="w-full object-cover" loading="eager" />
            </div>
            <div className="card absolute -bottom-5 -left-3 hidden !p-3 md:block animate-floaty">
              <div className="text-xs font-bold text-stone-600">📍 Z = 6.000x + 5.000y</div>
              <div className="text-[11px] text-stone-400">Fungsi tujuan keuntungan kantin</div>
            </div>
          </div>
        </div>

        {/* ALUR */}
        <h2 className="mt-10 text-center text-2xl font-extrabold text-stone-800">Alur Proyek 🧭</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <ChefHat className="h-6 w-6" />, t: '1–2. Pahami Masalah', d: 'Tonton cerita kantin & baca modul materi bertema kuliner.' },
            { icon: <LineChart className="h-6 w-6" />, t: '3–4. Kuasai Alat', d: 'Eksperimen grafik interaktif, lalu buktikan lewat kuis otomatis.' },
            { icon: <ClipboardCheck className="h-6 w-6" />, t: '5–7. Proyek Kelompok', d: 'Wawancara data dapur, susun model, isi jurnal harian.' },
            { icon: <Presentation className="h-6 w-6" />, t: '9–10. Tunjukkan Hasil', d: 'Unggah portofolio karya kelompok & tulis refleksimu.' },
          ].map((s, i) => (
            <div key={i} className="card card-hover !p-5">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">{s.icon}</div>
              <h3 className="font-extrabold text-stone-700">{s.t}</h3>
              <p className="mt-1 text-sm text-stone-500">{s.d}</p>
            </div>
          ))}
        </div>

        <footer className="mt-14 text-center text-xs text-stone-400">
          Dibuat untuk pembelajaran Matematika Kelas X SMK Tata Boga • Kelas X Tata Boga 1 🧑‍🍳
        </footer>
      </main>
    </div>
  )
}
