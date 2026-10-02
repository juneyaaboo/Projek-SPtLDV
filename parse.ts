// =============================================================
// Parser & normalisasi jawaban pertidaksamaan (Fitur 6).
// PENTING: modul ini TIDAK PERNAH mengirim kunci jawaban ke siswa —
// hanya menghasilkan benar/salah + petunjuk (hint) kontekstual.
// =============================================================

export type Op = '<=' | '>=' | '='

export interface ParsedConstraint {
  a: number // koefisien x
  b: number // koefisien y
  op: Op
  rhs: number
}

export interface KeyConstraint {
  label: string
  a: number
  b: number
  op: Op
  rhs: number
  // konteks hint
  unit?: string
  productA?: string
  productB?: string
  isTime?: boolean
}

/** Normalisasi string jawaban siswa → bentuk kanonik tanpa spasi. */
export function normalizeIneq(raw: string): string {
  let s = (raw ?? '').toString().normalize('NFKC').toLowerCase()
  s = s
    .replace(/[\u2212\u2012\u2013\u2014]/g, '-') // minus aneka unicode → '-'
    .replace(/[×⨯⋅·\u00B7]/g, '*')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/\s+/g, '')
    .replace(/,(?=\d)/g, '.') // desimal koma → titik
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2') // pemisah ribuan: 10.000 / 6.000x → 10000 / 6000x
    .replace(/\*/g, '') // tanda kali dihapus: "200*x" → "200x"
  // "<" dan ">" tunggal dimaknai "<=" / ">="
  s = s.replace(/<=|>=|<|>/g, (m) => (m === '<' ? '<=' : m === '>' ? '>=' : m))
  return s
}

function coeffOf(s: string, v: 'x' | 'y'): { val: number | undefined; consumed: string[] } {
  const re = new RegExp(`([+-]?)(\\d+(?:\\.\\d+)?)?${v}`, 'g')
  let val: number | undefined
  const consumed: string[] = []
  for (const m of s.matchAll(re)) {
    consumed.push(m[0])
    const c = (m[1] === '-' ? -1 : 1) * (m[2] ? parseFloat(m[2]) : 1)
    val = (val ?? 0) + c
  }
  return { val, consumed }
}

export type ParseResult =
  | { ok: true; parsed: ParsedConstraint }
  | { ok: false; error: 'format' | 'novar' | 'empty' }

/** Parse "200x + 150y <= 10000" → {a:200,b:150,op:'<=',rhs:10000} */
export function parseConstraint(raw: string): ParseResult {
  const s = normalizeIneq(raw)
  if (!s) return { ok: false, error: 'empty' }
  const m = s.match(/<=|>=|=/)
  if (!m || m.index === undefined) return { ok: false, error: 'format' }
  const op = m[0] as Op
  const lhs = s.slice(0, m.index)
  const rhsStr = s.slice(m.index + m[0].length)
  const rx = coeffOf(lhs, 'x')
  const ry = coeffOf(lhs, 'y')
  let rest = lhs
  for (const c of [...rx.consumed, ...ry.consumed]) rest = rest.split(c).join('')
  rest = rest.replace(/[+]/g, '')
  if (/[0-9]/.test(rest)) return { ok: false, error: 'format' }
  if (rx.val === undefined && ry.val === undefined) return { ok: false, error: 'novar' }
  const rhs = parseFloat(rhsStr)
  if (!isFinite(rhs)) return { ok: false, error: 'format' }
  return { ok: true, parsed: { a: rx.val ?? 0, b: ry.val ?? 0, op, rhs } }
}

export interface ParsedObjective {
  p: number
  q: number
}

/** Parse "Z = 6000x + 5000y" → {p:6000,q:5000} */
export function parseObjective(raw: string): ParsedObjective | null {
  let s = normalizeIneq(raw)
  if (!s) return null
  s = s.replace(/^[a-z]\s*=/, '').replace(/^[a-z]+=/, '')
  if (!/[xy]/.test(s)) return null
  const rx = coeffOf(s, 'x')
  const ry = coeffOf(s, 'y')
  if (rx.val === undefined && ry.val === undefined) return null
  return { p: rx.val ?? 0, q: ry.val ?? 0 }
}

/** Cek syarat x>=0, y>=0 (menerima "x>=0, y>=0", "0<=x dan 0<=y", dll). */
export function nonNegOk(raw: string): boolean {
  const s = normalizeIneq(raw).replace(/dan|and/g, ',')
  const parts = s.split(/[,;]/).filter(Boolean)
  let hasX = false
  let hasY = false
  for (const p of parts) {
    if (/^(x>=0|0<=x)$/.test(p)) hasX = true
    if (/^(y>=0|0<=y)$/.test(p)) hasY = true
  }
  return hasX && hasY
}

export function numEq(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 0.001)
}

export interface ItemFeedback {
  label: string
  correct: boolean
  hint: string
}

/** Bandingkan satu kendala dengan kunci → umpan balik + hint kontekstual. */
export function checkConstraint(input: string, key: KeyConstraint): ItemFeedback {
  const res = parseConstraint(input)
  if (!res.ok) {
    const errKind = (res as { error?: string }).error
    const why =
      errKind === 'empty'
        ? 'Jawaban masih kosong. Tulis pertidaksamaannya terlebih dahulu.'
        : 'Format belum dikenali. Tulis seperti contoh: 200x + 150y <= 10000 — gunakan x untuk jumlah produk A dan y untuk jumlah produk B.'
    return { label: key.label, correct: false, hint: why }
  }
  const p = res.parsed
  const hints: string[] = []
  if (p.op !== key.op) {
    hints.push(
      `Pikirkan: apakah ${key.label} itu batas maksimal (≤) atau minimal (≥)? ${
        key.isTime ? 'Waktu kerja per hari ada batasnya, bukan minimum.' : 'Stok bahan yang tersedia ada batasnya, bukan minimum.'
      }`,
    )
  }
  const wrongA = !numEq(p.a, key.a)
  const wrongB = !numEq(p.b, key.b)
  if (wrongA || wrongB) {
    hints.push(
      `Cek data wawancaramu: berapa ${key.unit ?? 'satuan'} ${key.label} untuk 1 ${key.productA ?? 'produk A'} dan 1 ${
        key.productB ?? 'produk B'
      }? (koefisien x = kebutuhan untuk ${key.productA ?? 'produk A'}, koefisien y = untuk ${key.productB ?? 'produk B'})`,
    )
  }
  if (!numEq(p.rhs, key.rhs)) {
    hints.push(
      `Ruas kanan harus berisi total ${key.label} yang tersedia per hari. Cek kembali form data wawancaramu.`,
    )
  }
  const correct = hints.length === 0
  return { label: key.label, correct, hint: correct ? '' : hints.slice(0, 2).join(' ') }
}

export function checkNonNeg(input: string): ItemFeedback {
  const ok = nonNegOk(input)
  return {
    label: 'Syarat x ≥ 0, y ≥ 0',
    correct: ok,
    hint: ok ? '' : 'Apakah mungkin memproduksi jumlah negatif? Tambahkan syarat yang kurang: tulis x >= 0 dan y >= 0.',
  }
}

export function checkObjective(input: string, keyP: number, keyQ: number): ItemFeedback {
  const p = parseObjective(input)
  if (!p) {
    return {
      label: 'Fungsi Tujuan',
      correct: false,
      hint: 'Format belum dikenali. Tulis seperti contoh: Z = 6000x + 5000y (x = jumlah produk A, y = jumlah produk B).',
    }
  }
  const ok = numEq(p.p, keyP) && numEq(p.q, keyQ)
  return {
    label: 'Fungsi Tujuan',
    correct: ok,
    hint: ok
      ? ''
      : 'Fungsi tujuan harus berdasarkan KEUNTUNGAN (harga jual − modal), bukan harga jual. Hitung dulu untung per unit tiap produk.',
  }
}
