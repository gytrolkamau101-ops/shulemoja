import { useState, useRef, useEffect } from 'react'
import { t } from '../lib/i18n'

const PAGE_LABELS = {
  dashboard: 'dashboard',
  students: 'students',
  finance: 'fees',
  exams: 'exams',
  setup: 'setup',
  support: 'support',
  referrals: 'referrals',
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // Only minutes are shown, so a 1s tick was 60x more re-renders than needed
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function TopBar({
  school,
  user,
  term,
  page,
  onLogout,
  onMenu,
  lang = 'en',
  onLang,
  announcement,
  onHideAnnouncement,
}) {
  const titleKey = PAGE_LABELS[page] || page
  const title = t(lang, titleKey)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const now = useClock()

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="sticky top-0 z-20">
      {announcement ? (
        <div className="sm-announce flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-800 to-teal-700 text-white text-xs font-semibold overflow-hidden">
          <span className="shrink-0 font-black uppercase tracking-wide text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Notice</span>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="sm-announce-track whitespace-nowrap">{announcement}</p>
          </div>
          {onHideAnnouncement && (
            <button type="button" onClick={onHideAnnouncement} className="shrink-0 text-white/90 font-black px-1" aria-label="Hide">
              ×
            </button>
          )}
        </div>
      ) : null}
      <header className="sm-topbar border-b-2 border-blue-100 bg-white px-3 py-3 sm:px-5 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onMenu}
            className="md:hidden inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-xl bg-blue-700 text-white text-sm font-black shadow-lg border-2 border-blue-300 ring-2 ring-blue-200"
            aria-label="Menu"
          >
            <span className="text-xl leading-none" aria-hidden>
              ☰
            </span>
            <span className="font-black tracking-wide">MENU</span>
          </button>

          {school?.logo_url ? (
            <img src={school.logo_url} alt="" loading="lazy" decoding="async" className="hidden sm:block h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" />
          ) : (
            <div className="hidden sm:flex h-10 w-10 rounded-lg bg-blue-700 text-white items-center justify-center text-xs font-black shrink-0">
              SM
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight">
              {school?.school_name || '—'}
            </p>
            <p className="text-xs sm:text-sm text-slate-700 truncate font-semibold">
              <span className="text-slate-900">{title}</span>
              {user?.role ? <span className="text-slate-600"> · {user.role}</span> : null}
              {term ? (
                <span className="text-slate-600">
                  {' '}
                  · {t(lang, 'term')} {term.term}/{term.year}
                </span>
              ) : null}
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0 px-2">
            <span className="text-sm font-black text-slate-900 tabular-nums">{timeStr}</span>
            <span className="text-[10px] font-semibold text-slate-600">{dateStr}</span>
          </div>

          <div className="relative shrink-0" ref={ref}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen((v) => !v)
              }}
              className="h-11 w-11 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-800 text-sm font-bold hover:bg-slate-100"
              aria-label="Language"
            >
              ⚙
            </button>
            {open && (
              <div className="absolute right-0 mt-1.5 w-40 rounded-xl border-2 border-slate-200 bg-white shadow-xl p-2 z-50">
                <p className="text-[10px] font-bold uppercase text-slate-500 px-1 mb-1">Language</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onLang?.('en')}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-black ${lang === 'en' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => onLang?.('sw')}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-black ${lang === 'sw' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    SW
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-black text-red-700 bg-red-50 border-2 border-red-200"
          >
            {t(lang, 'logout')}
          </button>
        </div>
      </header>
    </div>
  )
}
