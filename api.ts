// Klien API — semua data di D1/R2 (server), tidak ada penyimpanan lokal.

export class ApiError extends Error {
  status: number
  data: Record<string, unknown>
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET')
  const res = await fetch('/api' + path, {
    method,
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  })
  let data: Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    /* respons kosong */
  }
  if (!res.ok) throw new ApiError(String(data.error ?? 'Terjadi kesalahan. Coba lagi.'), res.status, data)
  return data as T
}

// ---------- tipe ----------

export interface Me {
  role: 'student' | 'student_l2' | 'teacher'
  student?: {
    id: number
    fullName: string
    groupId: number | null
    groupName: string | null
    pinEntered: boolean
  }
  teacher?: { id: number; name: string; className: string | null }
  progress?: number[]
  journalToday?: boolean
  unreadNotifications?: number
  quiz?: { best: number | null; passed: boolean; attempts: number }
  today?: string
}

export interface Reward {
  lines: { label: string; eq: string; a: number; b: number; rhs: number }[]
  objective: { eq: string; p: number; q: number }
  products: { a: string; b: string }
  vertices: { x: number; y: number }[]
  optimal: { x: number; y: number; z: number } | null
  view: { xMax: number; yMax: number }
}

export interface Ingredient {
  name: string
  unit: string
  perA: number
  perB: number
  total: number
}

export interface InterviewData {
  productA: string
  productB: string
  ingredients: Ingredient[]
  timePerA: number
  timePerB: number
  timeTotal: number
  timeUnit: string
  priceA: number
  costA: number
  priceB: number
  costB: number
}

export const fmtID = (n: number | null | undefined): string =>
  n === null || n === undefined || isNaN(Number(n))
    ? '-'
    : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n)

export const fmtRupiah = (n: number | null | undefined): string =>
  n === null || n === undefined ? '-' : 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(n))

export const fmtTgl = (iso?: string | null): string => {
  if (!iso) return '-'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

export const LEVELS = ['gram', 'kg', 'butir', 'ml', 'liter', 'sdm', 'sdt'] as const
export const BAHAN_OPSI = ['Tepung', 'Telur', 'Gula', 'Mentega', 'Susu', 'Cokelat', 'Keju'] as const
