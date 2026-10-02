import { type ReactNode } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export function PageHeader({
  emoji,
  title,
  subtitle,
  badge,
  children,
}: {
  emoji: string
  title: string
  subtitle?: string
  badge?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 text-2xl shadow-card">
          {emoji}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-stone-800 md:text-2xl">{title}</h1>
            {badge && <span className="chip">{badge}</span>}
          </div>
          {subtitle && <p className="mt-0.5 max-w-2xl text-sm text-stone-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function Spinner({ text = 'Memuat…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-500">
      <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4.5 w-4.5 h-5 w-5 shrink-0 text-red-500" />
      <span>{message}</span>
    </div>
  )
}

export function SuccessBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
      <span>{message}</span>
    </div>
  )
}

export function ProgressRing({ value, total, size = 76 }: { value: number; total: number; size?: number }) {
  const pct = total ? Math.min(value / total, 1) : 0
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FFEDD5" strokeWidth="9" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#gradRing)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-stone-800 font-extrabold" style={{ fontSize: size * 0.28 }}>
        {value}
      </text>
      <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle" className="fill-stone-400 font-semibold" style={{ fontSize: size * 0.15 }}>
        dari {total}
      </text>
    </svg>
  )
}

export function Stars({ value, onChange, disabled = false }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(i)}
          className={`text-3xl transition-transform ${disabled ? 'cursor-default' : 'hover:scale-125 active:scale-95'} ${i <= value ? '' : 'opacity-25 grayscale'}`}
          aria-label={`${i} bintang`}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ emoji, title, text, children }: { emoji: string; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-5xl">{emoji}</div>
      <h3 className="mt-1 font-extrabold text-stone-700">{title}</h3>
      {text && <p className="max-w-md text-sm text-stone-500">{text}</p>}
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-stone-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost !min-h-0 !px-2 !py-1 text-xl leading-none" aria-label="Tutup">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
