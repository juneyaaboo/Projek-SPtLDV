import type { Context } from 'hono'
import type { Env, Role, SessionInfo } from './types'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

export const SESSION_COOKIE = 'pjbl_session'
const SESSION_DAYS = 7

// ---------- util dasar ----------

export function toB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

export function newToken(): string {
  const a = new Uint8Array(32)
  crypto.getRandomValues(a)
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function randomPin(): string {
  return String(1000 + Math.floor(Math.random() * 9000))
}

// ---------- password (PBKDF2-SHA256) ----------

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iterations = 100_000
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return `pbkdf2$${iterations}$${toB64(salt)}$${toB64(new Uint8Array(bits))}`
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$')
    if (scheme !== 'pbkdf2') return false
    const iterations = parseInt(iterStr, 10)
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
    const got = toB64(new Uint8Array(bits))
    // perbandingan konstan-waktu sederhana
    if (got.length !== hashB64.length) return false
    let diff = 0
    for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ hashB64.charCodeAt(i)
    return diff === 0
  } catch {
    return false
  }
}

// ---------- tanggal (zona Asia/Jakarta, UTC+7) ----------

/** Tanggal hari ini (YYYY-MM-DD) menurut zona Asia/Jakarta. */
export function jakartaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

/** Konversi kolom DATETIME (UTC, "YYYY-MM-DD HH:MM:SS") → tanggal Jakarta YYYY-MM-DD */
export function jakartaDateOf(dbTs: string | null | undefined): string {
  if (!dbTs) return ''
  const iso = dbTs.includes('T') ? dbTs : dbTs.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return dbTs.slice(0, 10)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime()
  const db = new Date(b + 'T00:00:00Z').getTime()
  return Math.round((da - db) / 86400000)
}

/** Menit sejak tengah malam di Jakarta — untuk hitung mundur lock PIN. */
export function jakartaClockMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  return h * 60 + m
}

export function nowIsoUtc(): string {
  return new Date().toISOString()
}

// ---------- format angka Indonesia ----------

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n)
}

// ---------- sesi ----------

export async function createSession(
  c: Context<any>,
  role: Role,
  ids: { studentId?: number | null; teacherId?: number | null },
): Promise<string> {
  const token = newToken()
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString()
  await c.env.DB.prepare(
    'INSERT INTO sessions (token, role, student_id, teacher_id, pin_fails, expires_at) VALUES (?,?,?,?,0,?)',
  )
    .bind(token, role, ids.studentId ?? null, ids.teacherId ?? null, expires)
    .run()
  setCookie(c, SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
    maxAge: SESSION_DAYS * 86400,
  })
  return token
}

export async function getSession(c: Context<any>): Promise<SessionInfo | null> {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return null
  const row = await c.env.DB.prepare(
    'SELECT token, role, student_id, teacher_id, pin_fails, locked_until, expires_at FROM sessions WHERE token = ?',
  )
    .bind(token)
    .first()
  if (!row) return null
  if (new Date(String(row.expires_at)).getTime() < Date.now()) return null
  return {
    token: String(row.token),
    role: row.role as Role,
    studentId: row.student_id == null ? null : Number(row.student_id),
    teacherId: row.teacher_id == null ? null : Number(row.teacher_id),
    pinFails: Number(row.pin_fails ?? 0),
    lockedUntil: (row.locked_until as string) ?? null,
  }
}

export async function destroySession(c: Context<any>): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}
