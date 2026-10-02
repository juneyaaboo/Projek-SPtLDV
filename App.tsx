import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSession, homeFor } from './store'
import { Spinner } from './components/ui'
import Layout from './components/Layout'
import GuruLayout from './components/GuruLayout'

import Landing from './pages/Landing'
import Masuk from './pages/Masuk'
import Pin from './pages/Pin'
import Beranda from './pages/Beranda'
import Fitur1 from './pages/Fitur1'
import Fitur2 from './pages/Fitur2'
import Fitur3 from './pages/Fitur3'
import Fitur4 from './pages/Fitur4'
import Fitur5 from './pages/Fitur5'
import Fitur6 from './pages/Fitur6'
import Fitur7 from './pages/Fitur7'
import Fitur9 from './pages/Fitur9'
import Fitur10 from './pages/Fitur10'
import GuruMasuk from './pages/guru/GuruMasuk'
import Setup from './pages/guru/Setup'
import GuruDashboard from './pages/guru/Dashboard'
import GuruSiswa from './pages/guru/Siswa'
import GuruKelompok from './pages/guru/Kelompok'

function Guard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { me, loading } = useSession()
  if (loading) return <Spinner text="Menyiapkan halaman…" />
  if (!me) return <Navigate to="/" replace />
  if (!roles.includes(me.role)) return <Navigate to={homeFor(me)} replace />
  return <>{children}</>
}

const StudentShell = (
  <Guard roles={['student', 'student_l2']}>
    <Layout />
  </Guard>
)
const L2Only = (el: ReactNode) => (
  <Guard roles={['student_l2']}>{el}</Guard>
)

export default function App() {
  return (
    <Routes>
      {/* ===== publik ===== */}
      <Route path="/" element={<Landing />} />
      <Route path="/masuk" element={<Masuk />} />
      <Route path="/guru/masuk" element={<GuruMasuk />} />
      <Route path="/admin/setup" element={<Setup />} />

      {/* ===== siswa (layout dengan sidebar/bottom-nav) ===== */}
      <Route element={StudentShell}>
        <Route path="/beranda" element={<Beranda />} />
        <Route path="/fitur/1" element={<Fitur1 />} />
        <Route path="/fitur/2" element={<Fitur2 />} />
        <Route path="/fitur/3" element={<Fitur3 />} />
        <Route path="/fitur/4" element={<Fitur4 />} />
        <Route path="/fitur/5" element={L2Only(<Fitur5 />)} />
        <Route path="/fitur/6" element={L2Only(<Fitur6 />)} />
        <Route path="/fitur/7" element={L2Only(<Fitur7 />)} />
        <Route path="/fitur/9" element={L2Only(<Fitur9 />)} />
        <Route path="/fitur/10" element={L2Only(<Fitur10 />)} />
      </Route>

      {/* ===== guru ===== */}
      <Route
        path="/guru"
        element={
          <Guard roles={['teacher']}>
            <GuruLayout />
          </Guard>
        }
      >
        <Route path="dashboard" element={<GuruDashboard />} />
        <Route path="siswa" element={<GuruSiswa />} />
        <Route path="kelompok" element={<GuruKelompok />} />
      </Route>

      <Route path="/pin" element={<Guard roles={['student', 'student_l2']}><Pin /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
