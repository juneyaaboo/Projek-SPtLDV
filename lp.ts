// Util program linear sisi klien (untuk Grafik Interaktif Fitur 3).

export interface Constraint {
  id: number
  label: string
  a: number
  b: number
  op: '<=' | '>='
  rhs: number
  color: string
  enabled: boolean
}

export interface Pt {
  x: number
  y: number
}
export interface View {
  xMax: number
  yMax: number
}

export const Warna = ['#F97316', '#0EA5E9', '#22C55E', '#A855F7', '#EAB308', '#EF4444']

function niceCeil(v: number): number {
  if (!isFinite(v) || v <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * pow >= v) return m * pow
  return 10 * pow
}

export function autoView(cons: Constraint[]): View {
  let xMax = 10
  let yMax = 10
  for (const c of cons) {
    if (!c.enabled) continue
    if (c.a > 0) xMax = Math.max(xMax, c.rhs / c.a)
    if (c.b > 0) yMax = Math.max(yMax, c.rhs / c.b)
  }
  return { xMax: niceCeil(xMax * 1.15), yMax: niceCeil(yMax * 1.15) }
}

function feasibleRaw(a: number, b: number, op: '<=' | '>=', rhs: number, x: number, y: number): boolean {
  const v = a * x + b * y
  const eps = 1e-7 * Math.max(1, Math.abs(rhs), Math.abs(v))
  return op === '<=' ? v <= rhs + eps : v >= rhs - eps
}

function intersect(l1: { a: number; b: number; rhs: number }, l2: { a: number; b: number; rhs: number }): Pt | null {
  const det = l1.a * l2.b - l2.a * l1.b
  if (Math.abs(det) < 1e-9) return null
  const x = (l1.rhs * l2.b - l2.rhs * l1.b) / det
  const y = (l1.a * l2.rhs - l2.a * l1.rhs) / det
  return isFinite(x) && isFinite(y) ? { x, y } : null
}

/** Poligon daerah layak: irisan semua pertidaksamaan aktif + x≥0, y≥0 + batas view. */
export function feasiblePolygon(cons: Constraint[], view: View): Pt[] {
  const all = [
    ...cons.filter((c) => c.enabled).map((c) => ({ a: c.a, b: c.b, op: c.op, rhs: c.rhs })),
    { a: 1, b: 0, op: '>=' as const, rhs: 0 },
    { a: 0, b: 1, op: '>=' as const, rhs: 0 },
    { a: 1, b: 0, op: '<=' as const, rhs: view.xMax },
    { a: 0, b: 1, op: '<=' as const, rhs: view.yMax },
  ]
  const pts: Pt[] = []
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const p = intersect(all[i], all[j])
      if (!p) continue
      if (p.x < -1e-6 || p.y < -1e-6) continue
      if (p.x > view.xMax + 1e-6 || p.y > view.yMax + 1e-6) continue
      if (all.every((c) => feasibleRaw(c.a, c.b, c.op, c.rhs, p.x, p.y))) pts.push(p)
    }
  }
  const uniq: Pt[] = []
  for (const p of pts) if (!uniq.some((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6)) uniq.push(p)
  if (uniq.length < 3) return []
  const cx = uniq.reduce((s, p) => s + p.x, 0) / uniq.length
  const cy = uniq.reduce((s, p) => s + p.y, 0) / uniq.length
  return uniq.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx))
}

export function bestVertex(vertices: Pt[], obj: { p: number; q: number }): (Pt & { z: number }) | null {
  if (!vertices.length) return null
  let best = vertices[0]
  let maxZ = -Infinity
  for (const v of vertices) {
    const z = obj.p * v.x + obj.q * v.y
    if (z > maxZ) {
      maxZ = z
      best = v
    }
  }
  return { ...best, z: maxZ }
}
