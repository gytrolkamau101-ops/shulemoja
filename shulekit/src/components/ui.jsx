import { useEffect, useState } from 'react'

export const input =
  'w-full p-3 border-2 border-slate-300 rounded-xl bg-white text-base text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition sm-input'

/** Dark UI fields — always visible on slate-950 backgrounds */
export const darkField =
  'w-full p-3 rounded-xl border-2 border-slate-500 bg-slate-800 text-white text-base placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400'

/** 3D raised primary button */
export const btn =
  'sm-btn-3d sm-btn-3d-blue inline-flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-black text-sm tracking-wide disabled:opacity-50 disabled:pointer-events-none transition-transform select-none'

export const btnGreen =
  'sm-btn-3d sm-btn-3d-green inline-flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-black text-sm tracking-wide disabled:opacity-50 disabled:pointer-events-none transition-transform select-none'

export const btnGhost =
  'sm-btn-3d sm-btn-3d-ghost inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 disabled:opacity-50 transition-transform select-none'

export const btnDanger =
  'sm-btn-3d sm-btn-3d-red inline-flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-black text-sm tracking-wide disabled:opacity-50 transition-transform select-none'

export const th =
  'px-3 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 whitespace-nowrap bg-slate-100 border-b-2 border-slate-200'

export const td = 'px-3 py-3 text-sm text-slate-800 border-b border-slate-100'

export const fmt = (n) => Number(n || 0).toLocaleString('en-KE')

/** Visible field label + control */
export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block space-y-1.5 sm-field ${className}`}>
      {label ? (
        <span className="sm-label block text-xs font-black uppercase tracking-wide text-slate-700">
          {label}
        </span>
      ) : null}
      {children}
      {hint ? (
        <span className="block text-[11px] text-slate-600 leading-snug font-medium">{hint}</span>
      ) : null}
    </label>
  )
}

export function Card({ title, children, className = '', action }) {
  return (
    <div className={`sk-card p-4 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-200">
          {title ? (
            <h2 className="text-lg font-black text-slate-900 tracking-tight sk-card-title">{title}</h2>
          ) : (
            <span />
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className="sk-card-body text-slate-800">{children}</div>
    </div>
  )
}

export function Scroll({ children, dark = false }) {
  return (
    <div
      className={
        dark
          ? 'overflow-x-auto sk-scroll rounded-xl border border-slate-600 bg-slate-900'
          : 'overflow-x-auto sk-scroll rounded-xl border border-slate-200 bg-white'
      }
    >
      {children}
    </div>
  )
}

const alertStyles = {
  error: 'bg-red-50 border-red-400 text-red-950',
  ok: 'bg-emerald-50 border-emerald-400 text-emerald-950',
  info: 'bg-sky-50 border-sky-400 text-sky-950',
  warn: 'bg-amber-50 border-amber-400 text-amber-950',
}

const alertIcons = {
  error: '!',
  ok: '✓',
  info: 'i',
  warn: '!',
}

export function Alert({ children, kind = 'error', onClose }) {
  if (children == null || children === false || children === '') return null
  const k = alertStyles[kind] ? kind : 'error'
  return (
    <div
      role="alert"
      className={`relative rounded-xl border-2 px-3 py-2.5 pr-8 text-sm font-semibold leading-snug ${alertStyles[k]}`}
    >
      <span className="inline-flex gap-2 items-start">
        <span
          className="shrink-0 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[11px] font-black"
          aria-hidden
        >
          {alertIcons[k]}
        </span>
        <span className="min-w-0 break-words">{children}</span>
      </span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-1.5 right-2 w-7 h-7 rounded-lg text-base leading-none font-black opacity-70 hover:opacity-100 hover:bg-black/5"
          aria-label="Dismiss"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export function PageTitle({ title, subtitle, children, right }) {
  const heading = title || children
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight sk-page-title">
          {heading}
        </h1>
        {subtitle ? (
          <p className="text-sm text-slate-600 mt-0.5 font-medium sk-page-sub">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0 flex flex-wrap gap-2 items-center">{right}</div> : null}
    </div>
  )
}

export function NeedTerm() {
  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 font-semibold">
      Set a <strong>current term</strong> in School Setup before recording fees, exams or attendance.
    </div>
  )
}

/** Spinner — defaults to visible on light backgrounds */
export function Spinner({ dark = true, className = '', label = 'Loading' }) {
  return (
    <span
      className={`${dark ? 'sk-spinner-dark' : 'sk-spinner'} ${className}`}
      role="status"
      aria-label={label}
    />
  )
}

/** Full-page / section loading */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
      <Spinner dark className="!w-8 !h-8 !border-[3px]" label={label} />
      <p className="text-sm font-bold text-slate-600">{label}</p>
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-800">{title}</p>
      {hint ? <p className="text-xs text-slate-600 mt-1 font-medium max-w-sm mx-auto">{hint}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function StatPill({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-600 to-cyan-500',
    pink: 'from-pink-500 to-rose-500',
    violet: 'from-violet-600 to-purple-500',
    green: 'from-emerald-600 to-teal-500',
    red: 'from-red-500 to-orange-500',
  }
  return (
    <div
      className={`rounded-2xl p-4 text-white bg-gradient-to-br ${tones[tone] || tones.blue} shadow-lg border border-white/25`}
    >
      <p className="text-[11px] font-black uppercase tracking-wide text-white drop-shadow-sm">{label}</p>
      <p className="text-2xl font-black mt-1 tabular-nums text-white drop-shadow-sm">{value ?? '—'}</p>
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm sk-backdrop-in" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border-2 border-slate-200 p-5 sk-modal-in">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="text-slate-800">{children}</div>
      </div>
    </div>
  )
}

const toastListeners = new Set()

export function toast(message, kind = 'ok') {
  const payload = { id: Date.now() + Math.random(), message, kind }
  toastListeners.forEach((fn) => fn(payload))
  if (toastListeners.size === 0 && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl border-2 shadow-xl text-sm font-bold max-w-sm ${
      kind === 'error'
        ? 'bg-red-50 border-red-400 text-red-950'
        : kind === 'info'
          ? 'bg-sky-50 border-sky-400 text-sky-950'
          : 'bg-emerald-50 border-emerald-400 text-emerald-950'
    }`
    el.textContent = message
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3200)
  }
}

export function ToastHost() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const onToast = (payload) => {
      setItems((prev) => [...prev.slice(-4), payload])
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== payload.id))
      }, 3200)
    }
    toastListeners.add(onToast)
    return () => toastListeners.delete(onToast)
  }, [])
  if (!items.length) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,24rem)] pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`px-4 py-3 rounded-xl border-2 shadow-xl text-sm font-bold sk-toast-in ${
            t.kind === 'error'
              ? 'bg-red-50 border-red-400 text-red-950'
              : t.kind === 'info'
                ? 'bg-sky-50 border-sky-400 text-sky-950'
                : 'bg-emerald-50 border-emerald-400 text-emerald-950'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function PasswordInput({ value, onChange, placeholder = 'Password', className = '', ...rest }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`${input} pr-14 ${className}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={rest.autoComplete || 'current-password'}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-blue-800 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
