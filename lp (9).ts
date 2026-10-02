// =============================================================
// Solver program linear kecil: daerah layak (feasible region),
// titik pojok, dan nilai optimum. Dipakai untuk "hadiah" Fitur 6
// (grafik interaktif setelah semua jawaban benar).
// =============================================================

export interface LPConstraint {
  a: number
  b: number
  op: '<=' | '>='
  rhs: number
}

export interface Pt {
  x: number
  y: number
}

export interface View {
  xMax: number
  yMax: number
}

function niceCeil(v: number): number {
  if (!isFinite(v) || v <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (m * pow >= v) return m * pow
  }
  return 10 * pow
}

/** Batas tampilan grafik otomatis dari kendala. */
export function autoView(cons: LPConstraint[]): View {
  let xMax = 10
  let yMax = 10
  for (const c of cons) {
    if (c.a > 0) xMax = Math.max(xMax, c.rhs / c.a)
    if (c.b > 0) yMax = Math.max(yMax, c.rhs / c.b)
  }
  return { xMax: niceCeil(xMax * 1.15), yMax: niceCeil(yMax * 1.15) }
}

function feasible(c: LPConstraint, x: number, y: number): boolean {
  const v = c.a * x + c.b * y
  const eps = 1e-7 * Math.max(1, Math.abs(c.rhs), Math.abs(v))
  return c.op === '<=' ? v <= c.rhs + eps : v >= c.rhs - eps
}

function intersect(l1: LPConstraint, l2: LPConstraint): Pt | null {
  const det = l1.a * l2.b - l2.a * l1.b
  if (Math.abs(det) < 1e-9) return null
  const x = (l1.rhs * l2.b - l2.rhs * l1.b) / det
  const y = (l1.a * l2.rhs - l2.a * l1.rhs) / det
  if (!isFinite(x) || !isFinite(y)) return null
  return { x, y }
}

/** Semua titik pojok daerah layak (termasuk sumbu x=0, y=0 dan batas view). */
export function feasibleVertices(cons: LPConstraint[], view: View): Pt[] {
  const all: LPConstraint[] = [
    ...cons,
    { a: 1, b: 0, op: '>=', rhs: 0 },
    { a: 0, b: 1, op: '>=', rhs: 0 },
    { a: 1, b: 0, op: '<=', rhs: view.xMax },
    { a: 0, b: 1, op: '<=', rhs: view.yMax },
  ]
  const pts: Pt[] = []
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const p = intersect(all[i], all[j])
      if (!p) continue
      if (p.x < -1e-6 || p.y < -1e-6) continue
      if (p.x > view.xMax + 1e-6 || p.y > view.yMax + 1e-6) continue
      if (all.every((c) => feasible(c, p.x, p.y))) pts.push(p)
    }
  }
  // dedupe
  const uniq: Pt[] = []
  for (const p of pts) {
    if (!uniq.some((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6)) uniq.push(p)
  }
  if (uniq.length < 3) return uniq.length >= 1 ? uniq : [] // 0–2 titik: daerah degenerate
  // urutkan searah jarum jam di sekitar centroid
  const cx = uniq.reduce((s, p) => s + p.x, 0) / uniq.length
  const cy = uniq.reduce((s, p) => s + p.y, 0) / uniq.length
  return uniq.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx))
}

export interface LPSolution {
  vertices: Pt[]
  optimal: (Pt & { z: number }) | null
  maxZ: number | null
}

/** Selesaikan maksimasi Z = px + qy pada daerah layak. */
export function solveLP(cons: LPConstraint[], obj: { p: number; q: number }, view?: View): LPSolution {
  const v = view ?? autoView(cons)
  const vertices = feasibleVertices(cons, v)
  if (vertices.length === 0) return { vertices: [], optimal: null, maxZ: null }
  let best: (Pt & { z: number }) | null = null
  let maxZ = -Infinity
  for (const p of vertices) {
    const z = obj.p * p.x + obj.q * p.y
    if (z > maxZ + 1e-9) {
      maxZ = z
      best = { ...p, z }
    }
  }
  return { vertices, optimal: best, maxZ: isFinite(maxZ) ? maxZ : null }
}
