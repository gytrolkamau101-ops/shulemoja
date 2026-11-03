import { useState, useEffect } from 'react'
import { canAccessModule, planEntitlements } from '../lib/plans'
import { canAccessPage } from '../lib/roles'
import { canInstall, onInstallAvailability, promptInstall, isStandalone } from '../lib/installApp'
import { LOGO_C2, BRAND_NAME } from '../brand'

/**
 * Professional nav — fewer items, hubs for Communications & Reports.
 * Complements dark brand: slate rail + blue active + restrained gold/silver for tiers.
 */
const DAILY = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'students', label: 'Students', icon: '◎' },
  { id: 'admissions', label: 'Admissions', icon: '＋' },
  { id: 'finance', label: 'Student fees', icon: '¢', live: true },
  { id: 'reports-hub', label: 'Reports', icon: '☰' },
  { id: 'school-finance', label: 'School finance', icon: '▣' },
  { id: 'setup', label: 'Setup', icon: '⚙' },
]

const PREMIUM = [
  { id: 'comms-hub', label: 'Communications', icon: '✉', live: true },
  { id: 'attendance', label: 'Attendance', icon: '✓', live: true },
  { id: 'timetable', label: 'Timetable', icon: '▦' },
  { id: 'resources', label: 'Resources', icon: '▤' },
  { id: 'import', label: 'Import', icon: '⇩' },
  { id: 'support', label: 'Support', icon: '☎', live: true },
  { id: 'referrals', label: 'Referrals', icon: '★' },
]

const PRO = [
  { id: 'library', label: 'Library', icon: '📘' },
  { id: 'boarding', label: 'Boarding', icon: '⌂' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
  { id: 'staff-desk', label: 'Staff desk', icon: '⚒' },
  { id: 'finance-analysis', label: 'Fee analysis', icon: '↗' },
  { id: 'games', label: 'Games', icon: '⚽' },
  { id: 'bom', label: 'BOM', icon: '🏛' },
  { id: 'records', label: 'Records', icon: '🗄' },
]

// Map hub pages so old deep links still highlight
const ACTIVE_ALIASES = {
  'reports-hub': ['reports-hub', 'exams', 'reports'],
  'comms-hub': ['comms-hub', 'messages', 'circulars', 'parent-notices'],
  'school-finance': ['school-finance', 'capitation'],
}

function isActive(page, id) {
  if (page === id) return true
  const aliases = ACTIVE_ALIASES[id]
  return aliases ? aliases.includes(page) : false
}

function NavItem({ id, label, icon, page, locked, tone, onGo, live }) {
  const active = isActive(page, id)
  const base =
    'w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 transition border'
  const styles = {
    basic: active
      ? 'bg-sky-500 text-white border-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.65)] ring-1 ring-sky-300/80'
      : locked
        ? 'bg-sky-950/30 text-slate-500 border-sky-900/40'
        : 'bg-sky-900/40 text-sky-50 border-sky-600/40 shadow-[0_0_12px_rgba(14,165,233,0.2)] hover:bg-sky-700/50 hover:shadow-[0_0_18px_rgba(14,165,233,0.45)]',
    gold: active
      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 border-amber-200 shadow-[0_0_22px_rgba(251,191,36,0.7)] ring-1 ring-amber-200'
      : locked
        ? 'bg-amber-950/30 text-slate-500 border-amber-900/40'
        : 'bg-amber-950/50 text-amber-50 border-amber-600/50 shadow-[0_0_12px_rgba(251,191,36,0.22)] hover:shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:border-amber-400/70',
    silver: active
      ? 'bg-gradient-to-r from-slate-100 via-white to-slate-200 text-slate-900 border-white shadow-[0_0_22px_rgba(226,232,240,0.55)] ring-1 ring-slate-200'
      : locked
        ? 'bg-slate-800/40 text-slate-500 border-slate-700/50'
        : 'bg-slate-700/50 text-slate-50 border-slate-400/40 shadow-[0_0_12px_rgba(148,163,184,0.25)] hover:shadow-[0_0_20px_rgba(226,232,240,0.4)] hover:border-slate-200/60',
  }
  return (
    <button type="button" onClick={() => onGo(id)} className={`${base} ${styles[tone] || styles.basic}`}>
      <span className="w-5 text-center opacity-90 text-xs">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {live && !locked && <span className="sm-live-dot" title="Live" aria-hidden="true" />}
      {locked && <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Pro</span>}
    </button>
  )
}

function Section({ title, tone, children }) {
  const titleCls =
    tone === 'gold'
      ? 'text-amber-300/90'
      : tone === 'silver'
        ? 'text-slate-300'
        : 'text-sky-300/90'
  return (
    <div className="mb-4">
      <p className={`px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${titleCls}`}>{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export default function Sidebar({ page, onPage, user, school, open, onClose }) {
  const role = user?.role
  const ent = planEntitlements(school || {})
  const [installOk, setInstallOk] = useState(canInstall())

  useEffect(() => onInstallAvailability(() => setInstallOk(canInstall())), [])

  const go = (id) => {
    if (!canAccessPage(role, id) && !['comms-hub', 'reports-hub'].includes(id)) return
    // Hub access: if user can open any child
    if (id === 'comms-hub') {
      const ok =
        canAccessPage(role, 'messages') ||
        canAccessPage(role, 'circulars') ||
        canAccessPage(role, 'parent-notices')
      if (!ok) return
    }
    if (id === 'reports-hub') {
      const ok = canAccessPage(role, 'exams') || canAccessPage(role, 'reports')
      if (!ok) return
    }
    onPage?.(id)
    onClose?.()
  }

  const locked = (id) => {
    if (id === 'comms-hub') return !canAccessModule(school, 'messages') && !canAccessModule(school, 'circulars')
    if (id === 'reports-hub') return !canAccessModule(school, 'exams') && !canAccessModule(school, 'reports')
    return !canAccessModule(school, id)
  }

  const show = (id) => {
    if (id === 'comms-hub') {
      return (
        canAccessPage(role, 'messages') ||
        canAccessPage(role, 'circulars') ||
        canAccessPage(role, 'parent-notices')
      )
    }
    if (id === 'reports-hub') {
      return canAccessPage(role, 'exams') || canAccessPage(role, 'reports')
    }
    return canAccessPage(role, id)
  }

  const rail = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 border-r border-slate-800">
      <div className="px-4 pt-4 pb-3 border-b border-slate-800 flex items-center gap-3">
        <img src={LOGO_C2} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-sky-500/40" />
        <div className="min-w-0">
          <p className="font-black text-white text-sm leading-tight truncate">{BRAND_NAME}</p>
          <p className="text-[10px] text-slate-400 truncate">{school?.school_name || 'School console'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <Section title="Daily work" tone="basic">
          {DAILY.filter((i) => show(i.id)).map((i) => (
            <NavItem key={i.id} {...i} page={page} locked={locked(i.id)} tone="basic" onGo={go} />
          ))}
        </Section>
        <Section title="Premium" tone="gold">
          {PREMIUM.filter((i) => show(i.id)).map((i) => (
            <NavItem key={i.id} {...i} page={page} locked={locked(i.id)} tone="gold" onGo={go} />
          ))}
        </Section>
        <Section title="Pro" tone="silver">
          {PRO.filter((i) => show(i.id)).map((i) => (
            <NavItem key={i.id} {...i} page={page} locked={locked(i.id)} tone="silver" onGo={go} />
          ))}
        </Section>
      </div>

      <div className="p-3 border-t border-slate-800 space-y-2">
        {!isStandalone() && installOk && (
          <button
            type="button"
            onClick={() => promptInstall()}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white"
          >
            Install app
          </button>
        )}
        <p className="text-[10px] text-center text-slate-500">
          {(ent.planId || 'free').toUpperCase()}
          {ent.expired ? ' · expired' : ''}
        </p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-full">{rail}</aside>
      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="relative w-[min(18rem,88vw)] h-full shadow-2xl">{rail}</aside>
        </div>
      )}
    </>
  )
}
