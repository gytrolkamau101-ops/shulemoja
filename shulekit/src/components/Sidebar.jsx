import { useState, useEffect } from 'react'
import { canAccessModule, planEntitlements } from '../lib/plans'
import { canAccessPage } from '../lib/roles'
import { canInstall, onInstallAvailability, promptInstall, isStandalone, getInstallHelp } from '../lib/installApp'
import { LOGO_C2, BRAND_NAME } from '../brand'
import { getSettings } from '../lib/platform'

/**
 * Nav: brand + How it works top; profile/lang live in TopBar.
 * No "Daily Work" label — Premium / Pro section titles kept.
 */
const MAIN = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'students', label: 'Students', icon: '👥' },
  { id: 'admissions', label: 'Admissions', icon: '📝' },
  { id: 'finance', label: 'Student fees', icon: '💰', live: true },
  { id: 'reports-hub', label: 'Examinations', icon: '📊' },
  { id: 'school-finance', label: 'School finance', icon: '📒' },
  { id: 'setup', label: 'Setup', icon: '⚙️' },
]

const PREMIUM = [
  { id: 'comms-hub', label: 'Communications', icon: '💬', live: true },
  { id: 'attendance', label: 'Attendance', icon: '✅', live: true },
  { id: 'timetable', label: 'Timetable', icon: '🗓️' },
  { id: 'resources', label: 'Resources', icon: '📦' },
  { id: 'import', label: 'Import', icon: '📥' },
  { id: 'support', label: 'Support', icon: '🎧', live: true },
  { id: 'referrals', label: 'Referrals', icon: '⭐' },
]

const PRO = [
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'boarding', label: 'Boarding', icon: '🛏️' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
  { id: 'finance-analysis', label: 'Fee analysis', icon: '📈' },
]

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

function NavBtn({ item, page, locked, tone, onGo }) {
  const on = isActive(page, item.id)
  const base =
    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-black transition text-left border-2'
  let cls = base
  if (tone === 'gold') {
    // Premium — always golden glow + neon blue outer ring
    cls += on
      ? ' bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-amber-950 border-sky-400 shadow-[0_0_18px_rgba(251,191,36,0.65),0_0_8px_rgba(56,189,248,0.45)] ring-1 ring-sky-400/60'
      : locked
        ? ' bg-gradient-to-r from-amber-900/50 to-yellow-900/40 text-amber-100/90 border-sky-500/40 shadow-[0_0_12px_rgba(251,191,36,0.25)] opacity-90'
        : ' bg-gradient-to-r from-amber-500/25 to-yellow-600/20 text-amber-100 border-sky-400/50 shadow-[0_0_14px_rgba(251,191,36,0.35)] hover:shadow-[0_0_20px_rgba(251,191,36,0.55)] hover:border-sky-300'
  } else if (tone === 'silver') {
    // Pro — silver + glowing Prussian blue (#003153 family)
    cls += on
      ? ' bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 text-slate-900 border-[#1a4a6e] shadow-[0_0_20px_rgba(0,49,83,0.65),0_0_10px_rgba(56,189,248,0.35)] ring-2 ring-[#003153]/80'
      : locked
        ? ' bg-gradient-to-r from-[#003153]/70 to-slate-900/80 text-slate-100 border-[#1a4a6e]/70 shadow-[0_0_14px_rgba(0,49,83,0.45)] opacity-95'
        : ' bg-gradient-to-r from-[#003153]/35 to-slate-800/40 text-slate-50 border-[#2a5a7e] shadow-[0_0_16px_rgba(0,49,83,0.4)] hover:shadow-[0_0_22px_rgba(0,49,83,0.55)] hover:border-sky-400'
  } else {
    // Basic / main — sky neon
    cls += on
      ? ' bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.55)]'
      : ' bg-slate-900/90 text-slate-100 border-sky-500/30 hover:border-sky-400 hover:bg-slate-800 hover:shadow-[0_0_12px_rgba(56,189,248,0.3)]'
  }
  return (
    <button type="button" onClick={() => onGo(item.id)} className={cls}>
      <span className="text-base leading-none w-5 text-center" aria-hidden>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.live && !locked && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#34d399]" title="Live" />}
      {locked && (
        <span className="text-[9px] font-black uppercase tracking-wide text-sky-100/90 border border-sky-400/50 bg-slate-950/40 px-1.5 py-0.5 rounded">
          Lock
        </span>
      )}
    </button>
  )
}

function Section({ title, titleCls, line, children }) {
  return (
    <div className="mt-3">
      <p className={`px-3 mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${titleCls}`}>{title}</p>
      <div className={`mx-3 mb-2 h-px bg-gradient-to-r ${line}`} />
      <div className="space-y-1 px-2">{children}</div>
    </div>
  )
}

const DEFAULT_APP_HOW = `How to run ShuleMoja (inside the app)

1. Dashboard — School identity, term, quick actions, install app.
2. Setup — School identity, term, grades, subjects, fee structure, staff.
3. Students & Admissions — Enrol learners; promote at year end.
4. Student fees — Structure, opening arrears, record payments, balances.
5. Reports — Exams and report cards (CBC bands where used).
6. School finance — Capitation, PTA, projects, in-kind (records only — money stays with the school).
7. Premium — Communications, attendance, timetable, import.
8. Pro — Library, boarding, transport, deeper analysis.

Use MENU on mobile. Profile (top bar) edits your name. Support is under Premium when unlocked.`

export default function Sidebar({ page, onPage, user, school, open, onClose }) {
  const [howOpen, setHowOpen] = useState(false)
  const [howBody, setHowBody] = useState('')
  useEffect(() => {
    getSettings(['how_it_works_app']).then((s) => {
      const h = s?.how_it_works_app
      if (typeof h === 'string') setHowBody(h)
      else if (h?.body) setHowBody((h.title ? h.title + '\n\n' : '') + (h.body || ''))
      else if (h?.title) setHowBody(h.title)
    }).catch(() => {})
  }, [])

  const role = user?.role
  const ent = planEntitlements(school || {})
  const [installOk, setInstallOk] = useState(canInstall())

  useEffect(() => onInstallAvailability(() => setInstallOk(canInstall())), [])

  const go = (id) => {
    if (id === 'comms-hub') {
      const ok =
        canAccessPage(role, 'messages') ||
        canAccessPage(role, 'circulars') ||
        canAccessPage(role, 'parent-notices')
      if (!ok) return
    } else if (id === 'reports-hub') {
      const ok = canAccessPage(role, 'exams') || canAccessPage(role, 'reports')
      if (!ok) return
    } else if (!canAccessPage(role, id)) {
      return
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
      {/* Top wall: brand left, How it works tight opposite */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800">
        <div className="flex items-start gap-2">
          <img src={LOGO_C2} alt="" className="w-9 h-9 rounded-lg object-cover ring-1 ring-sky-500/40 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-black text-white text-sm leading-tight truncate">{BRAND_NAME}</p>
            <p className="text-[10px] text-slate-400 truncate">{school?.school_name || 'School console'}</p>
          </div>
          <button
            type="button"
            onClick={() => setHowOpen(true)}
            className="shrink-0 max-w-[5.5rem] text-[9px] font-black uppercase leading-tight text-sky-300 border border-sky-500/50 bg-sky-950/60 hover:bg-sky-800/50 rounded-lg px-1.5 py-1.5 text-center shadow-[0_0_10px_rgba(56,189,248,0.25)]"
          >
            How it works
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-1">
        {/* Main nav — no Daily Work label */}
        <div className="space-y-1 px-2">
          {MAIN.filter((i) => show(i.id)).map((i) => (
            <NavBtn key={i.id} item={i} page={page} locked={locked(i.id)} tone="blue" onGo={go} />
          ))}
        </div>

        <Section title="Premium" titleCls="text-amber-400" line="from-amber-500/80 via-amber-400/40 to-transparent">
          {PREMIUM.filter((i) => show(i.id)).map((i) => (
            <NavBtn key={i.id} item={i} page={page} locked={locked(i.id)} tone="gold" onGo={go} />
          ))}
        </Section>

        <Section title="Pro" titleCls="text-slate-300" line="from-slate-300/70 via-slate-400/30 to-transparent">
          {PRO.filter((i) => show(i.id)).map((i) => (
            <NavBtn key={i.id} item={i} page={page} locked={locked(i.id)} tone="silver" onGo={go} />
          ))}
        </Section>
      </div>

      <div className="p-3 border-t border-slate-800 space-y-2">
        {!isStandalone() && installOk && (
          <button
            type="button"
            onClick={async () => {
              const ok = await promptInstall()
              if (!ok) window.alert(getInstallHelp())
            }}
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
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-full">{rail}</aside>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="relative w-[min(18rem,88vw)] h-full shadow-2xl">{rail}</aside>
        </div>
      )}
      {howOpen && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setHowOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-600 text-slate-100 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-sky-300">How to use the app</h2>
              <button type="button" className="w-9 h-9 rounded-full bg-slate-800 font-bold" onClick={() => setHowOpen(false)}>
                ×
              </button>
            </div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {howBody || DEFAULT_APP_HOW}
            </div>
            <p className="text-[10px] text-slate-500 mt-3">Editable by Super Admin → Pages → How it works (in-app).</p>
          </div>
        </div>
      )}
    </>
  )
}
