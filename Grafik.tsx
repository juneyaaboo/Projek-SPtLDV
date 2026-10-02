import { useMemo, useState } from 'react'
import { Plus, Trash2, MousePointerClick, Wand2 } from 'lucide-react'
import { autoView, bestVertex, feasiblePolygon, Warna, type Constraint, type Pt, type View } from '../lib/lp'
import { fmtID } from '../api'

// =============================================================
// Grafik Interaktif — dibangun custom 100% dengan SVG + React.
// TANPA GeoGebra / pustaka grafik eksternal mana pun.
// =============================================================

interface ObjFunc {
  p: number
  q: number
}

const W = 640
const H = 480
const M = { l: 54, r: 20, t: 20, b: 44 }

/** garis a·x + b·y = rhs dipotong pada kotak [0..xMax]×[0..yMax] */
function clipLine(a: number, b: number, rhs: number, v: View): [Pt, Pt] | null {
  const pts: Pt[] = []
  if (Math.abs(b) > 1e-9) {
    pts.push({ x: 0, y: rhs / b })
    pts.push({ x: v.xMax, y: (rhs - a * v.xMax) / b })
  }
  if (Math.abs(a) > 1e-9) {
    pts.push({ x: rhs / a, y: 0 })
    pts.push({ x: (rhs - b * v.yMax) / a, y: v.yMax })
  }
  const inBox = pts.filter((p) => p.x >= -1e-9 && p.x <= v.xMax + 1e-9 && p.y >= -1e-9 && p.y <= v.yMax + 1e-9)
  const uniq = inBox.filter((p, i) => !inBox.slice(0, i).some((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6))
  if (uniq.length >= 2) return [uniq[0], uniq[uniq.length - 1]]
  // garis di luar kotak: proyeksikan dua kandidat terdekat
  if (pts.length >= 2) return [pts[0], pts[pts.length - 1]]
  return null
}

function niceTicks(max: number): number[] {
  const step = niceStep(max / 5)
  const out: number[] = []
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}
function niceStep(v: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1e-9))))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow
  return 10 * pow
}
const round2 = (n: number) => Math.round(n * 100) / 100

export default function Grafik({
  mode = 'interaktif',
  initialConstraints,
  fixedConstraints,
  objective,
  highlightOptimal = false,
  height = 440,
}: {
  mode?: 'interaktif' | 'baca'
  initialConstraints?: Partial<Constraint>[]
  fixedConstraints?: { label: string; a: number; b: number; op: '<=' | '>='; rhs: number }[]
  objective?: ObjFunc
  highlightOptimal?: boolean
  height?: number
}) {
  const [cons, setCons] = useState<Constraint[]>(
    initialConstraints && initialConstraints.length
      ? initialConstraints.map((c, i) => ({
          id: i + 1,
          label: c.label ?? `Kendala ${i + 1}`,
          a: c.a ?? 2,
          b: c.b ?? 1,
          op: c.op ?? '<=',
          rhs: c.rhs ?? 12,
          color: Warna[i % Warna.length],
          enabled: c.enabled ?? true,
        }))
      : [
          { id: 1, label: 'Tepung (gram)', a: 200, b: 150, op: '<=', rhs: 10000, color: Warna[0], enabled: true },
          { id: 2, label: 'Waktu (menit)', a: 20, b: 15, op: '<=', rhs: 1200, color: Warna[1], enabled: true },
        ],
  )
  const [obj, setObj] = useState<ObjFunc>(objective ?? { p: 6000, q: 5000 })
  const [objEnabled, setObjEnabled] = useState(!!objective)
  const [selected, setSelected] = useState<Pt | null>(null)

  const view = useMemo(() => autoView(cons), [cons])
  const vertices = useMemo(() => feasiblePolygon(cons, view), [cons, view])
  const best = objEnabled && vertices.length ? bestVertex(vertices, obj) : null

  const sx = (x: number) => M.l + (x / view.xMax) * (W - M.l - M.r)
  const sy = (y: number) => H - M.b - (y / view.yMax) * (H - M.t - M.b)
  const ticksX = niceTicks(view.xMax)
  const ticksY = niceTicks(view.yMax)
  const polygonStr = vertices.length ? vertices.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ') : ''

  // ===== mode baca (hadiah Fitur 6) =====
  if (mode === 'baca' && fixedConstraints) {
    const fixed: Constraint[] = fixedConstraints.map((c, i) => ({
      id: i + 1,
      label: c.label,
      a: c.a,
      b: c.b,
      op: c.op,
      rhs: c.rhs,
      color: Warna[i % Warna.length],
      enabled: true,
    }))
    return <StaticGraph fixed={fixed} objective={objective} highlightOptimal={highlightOptimal} height={height} />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
      {/* ====== KANVAS SVG ====== */}
      <div className="card overflow-hidden !p-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ maxHeight: height }} role="img" aria-label="Grafik daerah penyelesaian">
          {ticksX.map((t) => (
            <g key={`gx${t}`}>
              <line x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(view.yMax)} stroke="#FDBA74" strokeOpacity="0.35" strokeWidth="1" />
              <text x={sx(t)} y={H - M.b + 20} textAnchor="middle" fontSize="12" fill="#A8A29E">
                {fmtID(t)}
              </text>
            </g>
          ))}
          {ticksY.map((t) => (
            <g key={`gy${t}`}>
              <line x1={sx(0)} y1={sy(t)} x2={sx(view.xMax)} y2={sy(t)} stroke="#FDBA74" strokeOpacity="0.35" strokeWidth="1" />
              <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="12" fill="#A8A29E">
                {fmtID(t)}
              </text>
            </g>
          ))}

          {polygonStr && <polygon points={polygonStr} fill="#F97316" fillOpacity="0.22" stroke="#EA580C" strokeOpacity="0.5" strokeWidth="1.5" />}

          {cons.filter((c) => c.enabled).map((c) => {
            const seg = clipLine(c.a, c.b, c.rhs, view)
            if (!seg) return null
            return (
              <line
                key={c.id}
                x1={sx(seg[0].x)}
                y1={sy(seg[0].y)}
                x2={sx(seg[1].x)}
                y2={sy(seg[1].y)}
                stroke={c.color}
                strokeWidth="2.5"
              />
            )
          })}

          <line x1={sx(0)} y1={sy(0)} x2={sx(view.xMax)} y2={sy(0)} stroke="#78716C" strokeWidth="2" />
          <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(view.yMax)} stroke="#78716C" strokeWidth="2" />
          <text x={W - M.r} y={sy(0) - 8} textAnchor="end" fontSize="13" fontWeight="700" fill="#78716C">
            x (Produk A) →
          </text>
          <text x={sx(0) + 10} y={M.t + 12} fontSize="13" fontWeight="700" fill="#78716C">
            ↑ y (Produk B)
          </text>

          {vertices.map((p, i) => (
            <g key={`v${i}`} onClick={() => setSelected(p)} className="cursor-pointer">
              <circle cx={sx(p.x)} cy={sy(p.y)} r="11" fill="transparent" />
              <circle cx={sx(p.x)} cy={sy(p.y)} r="5" fill="#fff" stroke="#EA580C" strokeWidth="2.5" />
            </g>
          ))}

          {best && (
            <g>
              <circle cx={sx(best.x)} cy={sy(best.y)} r="12" fill="#EAB308" opacity="0.35">
                <animate attributeName="r" values="9;16;9" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={sx(best.x)} cy={sy(best.y)} r="6" fill="#EAB308" stroke="#A16207" strokeWidth="2" />
              <text x={sx(best.x)} y={sy(best.y) - 15} textAnchor="middle" fontSize="12" fontWeight="800" fill="#A16207">
                ⭐ optimum
              </text>
            </g>
          )}

          {selected && (
            <g>
              <rect x={Math.min(sx(selected.x) + 10, W - 152)} y={Math.max(sy(selected.y) - 42, 6)} width="140" height="32" rx="9" fill="#1C1917" opacity="0.92" />
              <text x={Math.min(sx(selected.x) + 18, W - 144)} y={Math.max(sy(selected.y) - 21, 27)} fontSize="13.5" fontWeight="700" fill="#FFF7ED">
                ({fmtID(round2(selected.x))} ; {fmtID(round2(selected.y))})
              </text>
            </g>
          )}
        </svg>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-orange-100 bg-orange-50/50 px-4 py-2.5 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded bg-orange-500/30 ring-1 ring-orange-500" /> Daerah penyelesaian
          </span>
          <span className="inline-flex items-center gap-1">
            <MousePointerClick className="h-3.5 w-3.5" /> Klik • titik pojok untuk koordinat
          </span>
          {selected && (
            <button className="ml-auto font-bold text-orange-600 underline" onClick={() => setSelected(null)}>
              hapus tooltip
            </button>
          )}
        </div>
      </div>

      {/* ====== PANEL KENDALA ====== */}
      <div className="space-y-3">
        {cons.map((c, idx) => (
          <div key={c.id} className="card !p-3.5" style={{ borderColor: `${c.color}55` }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
              <input
                className="w-full min-w-0 flex-1 rounded-lg border-none bg-transparent px-1 text-sm font-bold text-stone-700 outline-none focus:bg-orange-50"
                value={c.label}
                onChange={(e) => setCons(cons.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))}
                placeholder={`Nama kendala ${idx + 1}`}
              />
              <button
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${c.enabled ? 'bg-green-400' : 'bg-stone-300'}`}
                onClick={() => setCons(cons.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled } : x)))}
                aria-label="Aktif / nonaktif"
                type="button"
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${c.enabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              <button
                className="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => setCons(cons.filter((x) => x.id !== c.id))}
                aria-label="Hapus pertidaksamaan"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 rounded-lg bg-stone-50 px-2 py-1.5 text-center text-sm font-extrabold" style={{ color: c.color }}>
              {fmtID(c.a)}x + {fmtID(c.b)}y {c.op === '<=' ? '≤' : '≥'} {fmtID(c.rhs)}
            </div>
            <SliderRow label="a — koefisien x" value={c.a} onChange={(v) => setCons(cons.map((x) => (x.id === c.id ? { ...x, a: v } : x)))} max={sliderMax(c.rhs)} />
            <SliderRow label="b — koefisien y" value={c.b} onChange={(v) => setCons(cons.map((x) => (x.id === c.id ? { ...x, b: v } : x)))} max={sliderMax(c.rhs)} />
            <SliderRow label="batas ruas kanan" value={c.rhs} onChange={(v) => setCons(cons.map((x) => (x.id === c.id ? { ...x, rhs: v } : x)))} max={20000} big />
            <div className="mt-2 flex gap-1.5">
              {(['<=', '>='] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setCons(cons.map((x) => (x.id === c.id ? { ...x, op } : x)))}
                  className={`min-h-[36px] flex-1 rounded-lg border py-1.5 text-sm font-bold transition ${
                    c.op === op ? 'border-transparent text-white' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                  }`}
                  style={c.op === op ? { background: c.color } : undefined}
                >
                  {op === '<=' ? '≤ batas maksimal' : '≥ batas minimal'}
                </button>
              ))}
            </div>
          </div>
        ))}
        {cons.length < 6 && (
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() =>
              setCons([
                ...cons,
                {
                  id: Date.now(),
                  label: `Kendala ${cons.length + 1}`,
                  a: 1,
                  b: 1,
                  op: '<=',
                  rhs: Math.round(view.xMax),
                  color: Warna[cons.length % Warna.length],
                  enabled: true,
                },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Tambah Pertidaksamaan
          </button>
        )}

        <div className="card !p-3.5">
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
            <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={objEnabled} onChange={(e) => setObjEnabled(e.target.checked)} />
            Tampilkan Fungsi Tujuan Z
          </label>
          {objEnabled && (
            <div className="mt-2 space-y-2">
              <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-center text-sm font-extrabold text-amber-700">
                Z = {fmtID(obj.p)}x + {fmtID(obj.q)}y
              </div>
              <SliderRow label="untung per unit x" value={obj.p} onChange={(v) => setObj({ ...obj, p: v })} max={10000} big />
              <SliderRow label="untung per unit y" value={obj.q} onChange={(v) => setObj({ ...obj, q: v })} max={10000} big />
              {best ? (
                <div className="rounded-lg bg-yellow-100 px-3 py-2 text-xs font-bold text-yellow-800">
                  ⭐ Maksimum <b>Z = {fmtID(best.z)}</b> di titik ({fmtID(round2(best.x))} ; {fmtID(round2(best.y))})
                </div>
              ) : (
                <p className="text-xs text-stone-400">Daerah penyelesaian kosong — atur ulang pertidaksamaanmu.</p>
              )}
            </div>
          )}
        </div>

        <p className="flex items-center gap-1.5 px-1 text-xs text-stone-400">
          <Wand2 className="h-3.5 w-3.5" /> Skala grafik menyesuaikan otomatis
        </p>
      </div>
    </div>
  )
}

// ---------- grafik statis (hadiah Fitur 6) ----------

function StaticGraph({
  fixed,
  objective,
  highlightOptimal,
  height,
}: {
  fixed: Constraint[]
  objective?: ObjFunc
  highlightOptimal: boolean
  height: number
}) {
  const v = useMemo(() => autoView(fixed), [fixed])
  const verts = useMemo(() => feasiblePolygon(fixed, v), [fixed, v])
  const best = highlightOptimal && objective ? bestVertex(verts, objective) : null
  const sx = (x: number) => M.l + (x / v.xMax) * (W - M.l - M.r)
  const sy = (y: number) => H - M.b - (y / v.yMax) * (H - M.t - M.b)
  const ticksX = niceTicks(v.xMax)
  const ticksY = niceTicks(v.yMax)
  return (
    <div className="card overflow-hidden !p-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: height }}>
        {ticksX.map((t) => (
          <g key={`gx${t}`}>
            <line x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(v.yMax)} stroke="#FDBA74" strokeOpacity="0.35" />
            <text x={sx(t)} y={H - M.b + 20} textAnchor="middle" fontSize="12" fill="#A8A29E">{fmtID(t)}</text>
          </g>
        ))}
        {ticksY.map((t) => (
          <g key={`gy${t}`}>
            <line x1={sx(0)} y1={sy(t)} x2={sx(v.xMax)} y2={sy(t)} stroke="#FDBA74" strokeOpacity="0.35" />
            <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="12" fill="#A8A29E">{fmtID(t)}</text>
          </g>
        ))}
        {verts.length > 0 && (
          <polygon points={verts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="#22C55E" fillOpacity="0.25" stroke="#16A34A" strokeWidth="1.5" />
        )}
        {fixed.map((c) => {
          const seg = clipLine(c.a, c.b, c.rhs, v)
          if (!seg) return null
          return <line key={c.id} x1={sx(seg[0].x)} y1={sy(seg[0].y)} x2={sx(seg[1].x)} y2={sy(seg[1].y)} stroke={c.color} strokeWidth="2.5" />
        })}
        <line x1={sx(0)} y1={sy(0)} x2={sx(v.xMax)} y2={sy(0)} stroke="#78716C" strokeWidth="2" />
        <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(v.yMax)} stroke="#78716C" strokeWidth="2" />
        <text x={W - M.r} y={sy(0) - 8} textAnchor="end" fontSize="13" fontWeight="700" fill="#78716C">x (Produk A) →</text>
        <text x={sx(0) + 10} y={M.t + 12} fontSize="13" fontWeight="700" fill="#78716C">↑ y (Produk B)</text>
        {verts.map((p, i) => (
          <g key={i}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r="5" fill="#fff" stroke="#16A34A" strokeWidth="2.5" />
            <text x={sx(p.x)} y={sy(p.y) - 10} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#166534">
              ({fmtID(round2(p.x))} ; {fmtID(round2(p.y))})
            </text>
          </g>
        ))}
        {best && (
          <g>
            <circle cx={sx(best.x)} cy={sy(best.y)} r="13" fill="#EAB308" opacity="0.4">
              <animate attributeName="r" values="10;17;10" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={sx(best.x)} cy={sy(best.y)} r="6" fill="#EAB308" stroke="#A16207" strokeWidth="2" />
            <text x={sx(best.x)} y={sy(best.y) - 16} textAnchor="middle" fontSize="12" fontWeight="800" fill="#A16207">⭐ optimum</text>
          </g>
        )}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-orange-100 bg-orange-50/50 px-4 py-2.5 text-xs text-stone-500">
        <span>🟢 Titik hijau = titik pojok daerah penyelesaian</span>
        {best && <span className="font-bold text-yellow-700">Z maksimum = {fmtID(best.z)}</span>}
      </div>
    </div>
  )
}

function SliderRow({ label, value, onChange, max, big = false }: { label: string; value: number; onChange: (v: number) => void; max: number; big?: boolean }) {
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
        <span className="shrink-0">{label}</span>
        <input
          type="number"
          className="w-24 rounded-md border border-orange-100 bg-white px-1.5 py-0.5 text-right text-xs font-bold text-stone-700 outline-none focus:border-orange-400"
          value={value}
          min={0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
      <input type="range" min={0} max={max} step={max > 200 ? 50 : max > 20 ? 1 : 0.5} value={Math.min(value, max)} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

const sliderMax = (rhs: number) => (rhs > 5000 ? 20000 : rhs > 500 ? 5000 : rhs > 100 ? 1000 : rhs > 20 ? 200 : 50)
