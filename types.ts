// Tipe lingkungan Worker — kompatibel dengan Cloudflare D1/R2 bindings
// maupun shim lokal (dev-server.ts).

export interface D1Meta {
  last_row_id?: number
  changes?: number
}

export interface D1Result<T = Record<string, unknown>> {
  results?: T[]
  success?: boolean
  meta?: D1Meta
}

export interface D1StmtLike {
  bind(...args: unknown[]): {
    run(): Promise<D1Result>
    all<T = Record<string, unknown>>(): Promise<D1Result<T>>
    first<T = Record<string, unknown>>(): Promise<T | null>
  }
  run(): Promise<D1Result>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  first<T = Record<string, unknown>>(): Promise<T | null>
}

export interface D1Like {
  prepare(sql: string): D1StmtLike
  exec(sql: string): Promise<unknown>
}

export interface R2ObjectLike {
  key: string
  size?: number
  httpMetadata?: Record<string, string>
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
}

export interface R2Like {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string | ReadableStream,
    opts?: { httpMetadata?: Record<string, string> },
  ): Promise<R2ObjectLike>
  get(key: string): Promise<R2ObjectLike | null>
  head(key: string): Promise<R2ObjectLike | null>
  delete(key: string): Promise<void>
}

export type Role = 'student' | 'student_l2' | 'teacher'

export interface Env {
  DB: D1Like
  R2: R2Like
  ASSETS?: { fetch(req: Request): Promise<Response> }
  /** Bucket R2 berisi hasil build SPA — khusus mode deploy manual lewat dashboard
   *  (tanpa wrangler/[assets]). Jika tidak diisi, berkas statis disajikan oleh
   *  Static Assets Cloudflare seperti biasa. */
  WEB?: R2Like
}

export interface SessionInfo {
  token: string
  role: Role
  studentId: number | null
  teacherId: number | null
  pinFails: number
  lockedUntil: string | null
}

// Baris tabel
export interface StudentRow {
  id: number
  full_name: string
  group_id: number | null
  pin_entered: number
  created_at: string
}

export interface GroupRow {
  id: number
  name: string
  pin: string
  created_at: string
}

export interface InterviewRow {
  id: number
  group_id: number
  product_a_name: string
  product_b_name: string
  ingredients: string
  time_per_a: number
  time_per_b: number
  time_total: number
  time_unit: string
  price_a: number
  cost_a: number
  price_b: number
  cost_b: number
  created_at: string
}

export interface Ingredient {
  name: string
  unit: string
  per_a: number
  per_b: number
  total: number
}
