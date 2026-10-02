import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { LogOut, PieChart, Users, Layers } from 'lucide-react'
import { useSession } from '../store'

export default function GuruLayout() {
  const { me, logout } = useSession()
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <span className="flex items-center gap-2 font-extrabold text-orange-600">
            <span className="text-xl">👩‍🏫</span> Panel Guru
          </span>
          {me?.teacher && <span className="chip hidden sm:inline-flex">{me.teacher.name}{me.teacher.className ? ` · ${me.teacher.className}` : ''}</span>}
          <button
            onClick={async () => {
              await logout()
              nav('/guru/masuk')
            }}
            className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-stone-500 hover:bg-orange-50"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-orange-100 bg-white/50 p-3 md:block">
          <nav className="space-y-1">
            <GuruItem to="/guru/dashboard" icon={<PieChart className="h-4.5 w-4.5 h-5 w-5" />} label="Dashboard" />
            <GuruItem to="/guru/siswa" icon={<Users className="h-5 w-5" />} label="Data Siswa" />
            <GuruItem to="/guru/kelompok" icon={<Layers className="h-5 w-5" />} label="Kelompok & PIN" />
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-7">
          {/* nav mobile */}
          <div className="mb-4 grid grid-cols-3 gap-2 md:hidden">
            <GuruItemMobile to="/guru/dashboard" label="Dashboard" />
            <GuruItemMobile to="/guru/siswa" label="Siswa" />
            <GuruItemMobile to="/guru/kelompok" label="Kelompok" />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function GuruItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-orange-100/80 text-orange-700' : 'text-stone-600 hover:bg-orange-50'}`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function GuruItemMobile({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-xl border px-3 py-2 text-center text-xs font-bold ${isActive ? 'border-orange-300 bg-orange-100 text-orange-700' : 'border-orange-100 bg-white text-stone-500'}`
      }
    >
      {label}
    </NavLink>
  )
}
