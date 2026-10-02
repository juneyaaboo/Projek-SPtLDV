import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import { api } from '../api'
import { useSession, isL2 } from '../store'

export const FITUR: { n: number; href: string; emoji: string; title: string; short: string; needPin: boolean }[] = [
  { n: 1, href: '/fitur/1', emoji: '🎬', title: 'Video & Cerita Masalah', short: 'Cerita', needPin: false },
  { n: 2, href: '/fitur/2', emoji: '📖', title: 'Modul Materi SPtLDV', short: 'Materi', needPin: false },
  { n: 3, href: '/fitur/3', emoji: '📈', title: 'Grafik Interaktif', short: 'Grafik', needPin: false },
  { n: 4, href: '/fitur/4', emoji: '📝', title: 'Kuis Otomatis', short: 'Kuis', needPin: false },
  { n: 5, href: '/fitur/5', emoji: '🎤', title: 'Wawancara Terstruktur', short: 'Wawancara', needPin: true },
  { n: 6, href: '/fitur/6', emoji: '✅', title: 'Feedback Pertidaksamaan', short: 'Feedback', needPin: true },
  { n: 7, href: '/fitur/7', emoji: '📔', title: 'Jurnal Harian', short: 'Jurnal', needPin: true },
  { n: 8, href: '/guru/dashboard', emoji: '👩‍🏫', title: 'Dashboard Monitoring', short: 'Guru', needPin: true },
  { n: 9, href: '/fitur/9', emoji: '🗂️', title: 'Upload Portofolio', short: 'Portofolio', needPin: true },
  { n: 10, href: '/fitur/10', emoji: '⭐', title: 'Refleksi Akhir', short: 'Refleksi', needPin: true },
]

export default function Layout() {
  const { me, logout } = useSession()
  const nav = useNavigate()
  const loc = useLocation()
  const [sheet, setSheet] = useState(false)
  const l2 = isL2(me)

  useEffect(() => {
    setSheet(false)
    window.scrollTo(0, 0)
  }, [loc.pathname])

  const progress = me?.progress ?? []
  const done = [1, 2, 3, 4, 5, 6, 7, 9, 10].filter((f) => progress.includes(f)).length

  return (
    <div className="min-h-screen">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/beranda" className="flex items-center gap-2 font-extrabold text-orange-600">
            <span className="text-xl">🍳</span>
            <span className="hidden sm:inline">PjBL SPtLDV</span>
          </Link>

          {/* progress */}
          <div className="mx-auto hidden w-full max-w-sm items-center gap-3 md:flex">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-orange-100">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all" style={{ width: `${(done / 9) * 100}%` }} />
            </div>
            <span className="shrink-0 text-xs font-bold text-stone-600">Langkah {done} dari 10</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {me?.student?.groupName && <span className="chip hidden sm:inline-flex">👥 {me.student.groupName}</span>}
            <Link to="/beranda#notifikasi" className="relative rounded-full p-2 hover:bg-orange-50" aria-label="Notifikasi">
              <Bell className="h-5 w-5 text-stone-500" />
              {!!me?.unreadNotifications && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {me.unreadNotifications}
                </span>
              )}
            </Link>
            <button
              onClick={async () => {
                await logout()
                nav('/')
              }}
              className="rounded-full p-2 text-stone-500 hover:bg-orange-50"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* progress mobile */}
        <div className="flex items-center gap-2 px-4 pb-2 md:hidden">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-orange-100">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all" style={{ width: `${(done / 9) * 100}%` }} />
          </div>
          <span className="shrink-0 text-[11px] font-bold text-stone-600">Langkah {done}/10</span>
        </div>
      </header>

      {/* peringatan jurnal harian */}
      {l2 && me?.journalToday === false && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-800">
          ⚠️ Kamu belum mengisi jurnal hari ini! Segera isi sebelum pukul 23.59.{' '}
          <Link to="/fitur/7" className="underline">
            Isi sekarang →
          </Link>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl">
        {/* ===== SIDEBAR DESKTOP ===== */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-orange-100 bg-white/50 p-3 md:block">
          <nav className="space-y-1">
            <NavItem href="/beranda" emoji="🏠" title="Beranda" done={-1} />
            {FITUR.filter((f) => f.n !== 8).map((f) => (
              <NavItem key={f.n} href={f.href} emoji={f.emoji} title={`${f.n}. ${f.title}`} locked={f.needPin && !l2} done={progress.includes(f.n) ? 1 : 0} />
            ))}
          </nav>
        </aside>

        {/* ===== KONTEN ===== */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* ===== BOTTOM NAV MOBILE ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          <BottomItem href="/beranda" emoji="🏠" label="Beranda" />
          <BottomItem href="/fitur/2" emoji="📖" label="Materi" />
          <BottomItem href="/fitur/3" emoji="📈" label="Grafik" />
          <BottomItem href="/fitur/4" emoji="📝" label="Kuis" />
          <button onClick={() => setSheet(true)} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold text-stone-500">
            <Menu className="h-5 w-5" />
            Lainnya
          </button>
        </div>
      </nav>

      {/* sheet "Lainnya" */}
      {sheet && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm md:hidden" onClick={() => setSheet(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-800">Semua Fitur</h3>
              <button onClick={() => setSheet(false)} className="rounded-full p-1.5 hover:bg-orange-50" aria-label="Tutup">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FITUR.filter((f) => f.n !== 8).map((f) => {
                const locked = f.needPin && !l2
                return (
                  <Link
                    key={f.n}
                    to={locked ? '/pin' : f.href}
                    className={`card card-hover flex items-center gap-2 !p-3 ${locked ? 'opacity-60' : ''}`}
                  >
                    <span className="text-xl">{f.emoji}</span>
                    <span className="min-w-0 flex-1 text-xs font-bold text-stone-700">
                      {f.n}. {f.short}
                      {locked && ' 🔒'}
                      {progress.includes(f.n) && ' ✅'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({ href, emoji, title, locked = false, done = -1 }: { href: string; emoji: string; title: string; locked?: boolean; done?: number }) {
  return (
    <NavLink
      to={locked ? '/pin' : href}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          isActive && !locked ? 'bg-orange-100/80 text-orange-700' : 'text-stone-600 hover:bg-orange-50'
        }`
      }
    >
      <span>{emoji}</span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {locked && <span>🔒</span>}
      {done === 1 && <span className="text-green-500">✓</span>}
    </NavLink>
  )
}

function BottomItem({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        `flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold ${isActive ? 'text-orange-600' : 'text-stone-500'}`
      }
    >
      <span className="text-lg leading-none">{emoji}</span>
      {label}
    </NavLink>
  )
}
