import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { api, type Me } from './api'

interface SessionCtx {
  me: Me | null
  loading: boolean
  refresh: () => Promise<Me | null>
  logout: () => Promise<void>
}

const Ctx = createContext<SessionCtx>({ me: null, loading: true, refresh: async () => null, logout: async () => {} })

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api<Me>('/me')
      setMe(data)
      return data
    } catch {
      setMe(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await api('/auth/keluar', { method: 'POST' }).catch(() => {})
    setMe(null)
  }, [])

  return <Ctx.Provider value={{ me, loading, refresh, logout }}>{children}</Ctx.Provider>
}

export const useSession = () => useContext(Ctx)

/** Level akses fitur proyek (5–10) butuh PIN. */
export const isL2 = (me: Me | null) => me?.role === 'student_l2'
export const isTeacher = (me: Me | null) => me?.role === 'teacher'
export const homeFor = (me: Me | null): string => {
  if (!me) return '/'
  if (me.role === 'teacher') return '/guru/dashboard'
  if (me.role === 'student') return '/pin'
  return '/beranda'
}
