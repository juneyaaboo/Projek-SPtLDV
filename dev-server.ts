// =============================================================
// Server pengembangan lokal — menjalankan KODE YANG SAMA dengan
// Cloudflare Worker (worker/index.ts) memakai:
//   - better-sqlite3 sebagai shim D1
//   - sistem berkas lokal sebagai shim R2
//   - aset statis dari client-dist/ dengan fallback SPA
// Produksi tetap berjalan di Cloudflare Workers + D1 + R2
// (lihat wrangler.toml). Tidak ada perubahan kode yang diperlukan.
// =============================================================
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import Database from 'better-sqlite3'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs'
import { join, dirname, normalize, extname } from 'node:path'
import workerApp from './worker/index'
import type { D1Like, D1Result, Env, R2Like, R2ObjectLike } from './worker/types'

const PORT = Number(process.env.PORT || 8787)
const DATA_DIR = join(process.cwd(), '.data')
const DB_PATH = join(DATA_DIR, 'dev.sqlite3')
const R2_DIR = join(DATA_DIR, 'r2')
const CLIENT_DIST = join(process.cwd(), 'client-dist')

// ---------- shim D1 ----------

function boolToNum(v: unknown): unknown {
  if (v === true) return 1
  if (v === false) return 0
  if (v === undefined) return null
  return v
}

class D1Shim implements D1Like {
  private db: Database.Database
  constructor(db: Database.Database) {
    this.db = db
  }
  prepare(sql: string) {
    const stmt = this.db.prepare(sql)
    const make = (params: unknown[]) => ({
      async run(): Promise<D1Result> {
        const info = stmt.run(...params)
        return { success: true, meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes } }
      },
      async all<T>(): Promise<D1Result<T>> {
        return { results: stmt.all(...params) as T[], success: true }
      },
      async first<T>(): Promise<T | null> {
        return (stmt.get(...params) as T) ?? null
      },
    })
    return {
      bind: (...args: unknown[]) => make(args.map(boolToNum)),
      ...make([]),
    }
  }
  async exec(sql: string) {
    this.db.exec(sql)
  }
}

// ---------- shim R2 (berkas lokal) ----------

class R2Shim implements R2Like {
  private dir: string
  constructor(dir: string) {
    this.dir = dir
    mkdirSync(dir, { recursive: true })
  }
  private path(key: string): string {
    return join(this.dir, normalize(key).replace(/^(\.\.[/\\])+/, ''))
  }
  async put(
    key: string,
    value: ArrayBuffer | Uint8Array | string | ReadableStream,
    opts?: { httpMetadata?: Record<string, string> },
  ): Promise<R2ObjectLike> {
    if (typeof value === 'object' && value !== null && 'getReader' in (value as ReadableStream)) {
      throw new Error('Stream belum didukung shim lokal — gunakan ArrayBuffer.')
    }
    const p = this.path(key)
    mkdirSync(dirname(p), { recursive: true })
    const buf = typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value as ArrayBuffer)
    writeFileSync(p, buf)
    writeFileSync(p + '.meta.json', JSON.stringify(opts?.httpMetadata ?? {}), 'utf8')
    return {
      key,
      size: buf.length,
      httpMetadata: opts?.httpMetadata,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      text: async () => buf.toString('utf8'),
    }
  }
  async get(key: string): Promise<R2ObjectLike | null> {
    const p = this.path(key)
    if (!existsSync(p)) return null
    const buf = readFileSync(p)
    let meta: Record<string, string> = {}
    try {
      meta = JSON.parse(readFileSync(p + '.meta.json', 'utf8'))
    } catch {
      /* abaikan */
    }
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    return {
      key,
      size: buf.length,
      httpMetadata: meta,
      arrayBuffer: async () => ab,
      text: async () => buf.toString('utf8'),
    }
  }
  async head(key: string): Promise<R2ObjectLike | null> {
    const p = this.path(key)
    if (!existsSync(p)) return null
    const buf = readFileSync(p)
    return {
      key,
      size: buf.length,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      text: async () => buf.toString('utf8'),
    }
  }
  async delete(key: string) {
    const p = this.path(key)
    try {
      if (existsSync(p)) unlinkSync(p)
      if (existsSync(p + '.meta.json')) unlinkSync(p + '.meta.json')
    } catch {
      /* abaikan */
    }
  }
}

// ---------- siapkan database ----------

mkdirSync(DATA_DIR, { recursive: true })
const isNew = !existsSync(DB_PATH)
const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
if (isNew) {
  console.log('→ Database baru dibuat. Jalankan `npm run seed` untuk data demo.')
}
const env: Env = {
  DB: new D1Shim(sqlite),
  R2: new R2Shim(R2_DIR),
  // mode "deploy manual": SPA disajikan worker dari bucket WEB (di lokal = folder client-dist)
  WEB: new R2Shim(join(process.cwd(), 'client-dist')),
}

// ---------- app: API + statis + fallback SPA ----------

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

const app = new Hono()
app.route('/', workerApp as never)

// rute /api yang tidak dikenal → JSON 404 (bukan fallback SPA)
app.all('/api/*', (c) => c.json({ error: 'Rute API tidak ditemukan.' }, 404))

app.get('*', (c) => {
  let rel = decodeURIComponent(c.req.path)
  if (rel === '/') rel = '/index.html'
  const fp = join(CLIENT_DIST, normalize(rel))
  let target = fp
  try {
    if (!existsSync(fp) || !statSync(fp).isFile()) target = join(CLIENT_DIST, 'index.html')
    if (!existsSync(target)) return c.text('client-dist belum ada. Jalankan: npm run build', 503)
    const body = readFileSync(target)
    const type = MIME[extname(target).toLowerCase()] ?? 'application/octet-stream'
    return c.body(body, 200, { 'Content-Type': type })
  } catch (e) {
    return c.text('Gagal memuat aset.', 500)
  }
})

console.log(`✓ Server PjBL SPtLDV berjalan di http://localhost:${PORT}`)
serve({ fetch: (req) => app.fetch(req, env as never), port: PORT })
