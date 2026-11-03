import { useState, useEffect, useCallback, lazy, Suspense, Component } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'

function safeLazy(factory) {
  return lazy(() =>
    factory().catch((err) => {
      console.error('Chunk load failed', err)
      return {
        default: function ChunkError() {
          return (
            <div className="max-w-md mx-auto mt-10 p-6 rounded-2xl border border-red-200 bg-red-50">
              <p className="font-black text-red-800">Page failed to load</p>
              <p className="text-sm text-slate-600 mt-1">Check your connection, then reload. On Termux, restart npm run dev after copying a new zip.</p>
              <button type="button" className="mt-3 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          )
        },
      }
    })
  )
}
import { getTheme, setTheme as persistTheme, getLang, setLang as persistLang, applyTheme } from '../lib/prefs'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { flushQueue, queueCount, isOnline } from '../lib/offline'
import { buildOfflineHandlers } from '../lib/offlineHandlers'
import SyncBanner from '../components/SyncBanner'
import { toast, btn, Spinner } from '../components/ui'
import PremiumGate from '../components/PremiumGate'
import { canAccessPage } from '../lib/roles'
import { canAccessModule } from '../lib/plans'

const MainDashboard = safeLazy(() => import('../components/pages/MainDashboard'))
const Students = safeLazy(() => import('../components/pages/Students'))
const StudentFinance = safeLazy(() => import('../components/pages/StudentFinance'))
const Exams = safeLazy(() => import('../components/pages/Exams'))
const Attendance = safeLazy(() => import('../components/pages/Attendance'))
const SchoolFinance = safeLazy(() => import('../components/pages/SchoolFinance'))
const Resources = safeLazy(() => import('../components/pages/Resources'))
const Library = safeLazy(() => import('../components/pages/Library'))
const Timetable = safeLazy(() => import('../components/pages/Timetable'))
const ReportCards = safeLazy(() => import('../components/pages/ReportCards'))
const Setup = safeLazy(() => import('../components/pages/Setup'))
const Messaging = safeLazy(() => import('../components/pages/Messaging'))
const ImportCenter = safeLazy(() => import('../components/pages/ImportCenter'))
const Circulars = safeLazy(() => import('../components/pages/Circulars'))
const ParentNotices = safeLazy(() => import('../components/pages/ParentNotices'))
const Admissions = safeLazy(() => import('../components/pages/Admissions'))
const SupportCenter = safeLazy(() => import('../components/pages/SupportCenter'))
const ReferralsCenter = safeLazy(() => import('../components/pages/ReferralsCenter'))
const Boarding = safeLazy(() => import('../components/pages/Boarding'))
const Transport = safeLazy(() => import('../components/pages/Transport'))
const BomPortal = safeLazy(() => import('../components/pages/BomPortal'))
const RecordsVault = safeLazy(() => import('../components/pages/RecordsVault'))
const StaffDesk = safeLazy(() => import('../components/pages/StaffDesk'))
const Games = safeLazy(() => import('../components/pages/Games'))
const Capitation = safeLazy(() => import('../components/pages/Capitation'))
const FinanceAnalysis = safeLazy(() => import('../components/pages/FinanceAnalysis'))
const CommunicationsHub = safeLazy(() => import('../components/pages/CommunicationsHub'))
const ReportsHub = safeLazy(() => import('../components/pages/ReportsHub'))

function PageFallback() {
  return (
    // themed shell
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner dark />
      <p className="text-sm text-slate-500 font-medium">Loading page…</p>
    </div>
  )
}

export default function Dashboard({ session }) {
  const [user, setUser] = useState(null)
  const [school, setSchool] = useState(null)
  const [term, setTerm] = useState(null)
  const [page, setPage] = useState('dashboard')
  const deskOnlyRoles = ['Kitchen', 'Watchman', 'Driver', 'Staff']
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setThemeState] = useState(() => getTheme())
  const [announcement, setAnnouncement] = useState('')
  const [hideAnnounce, setHideAnnounce] = useState(false)
  const [lang, setLangState] = useState(() => getLang())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!school?.id) return
      try {
        const { data } = await supabase
          .from('school_events')
          .select('event_name, event_date')
          .eq('school_id', school.id)
          .gte('event_date', new Date().toISOString().slice(0, 10))
          .order('event_date', { ascending: true })
          .limit(3)
        if (!alive) return
        if (data?.length) {
          setAnnouncement(data.map((e) => `${e.event_name} (${new Date(e.event_date).toLocaleDateString('en-GB')})`).join('  ·  '))
        }
      } catch (_) {}
    })()
    return () => { alive = false }
  }, [school?.id])


  const changeTheme = (th) => {
    setThemeState(th)
    persistTheme(th)
  }
  const changeLang = (l) => {
    setLangState(l)
    persistLang(l)
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (!session?.user?.id) {
        setError('Session expired. Sign in again.')
        return
      }
      const { data: u, error: ue } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (ue) throw ue
      if (!u) {
        setError('No staff profile found for this login. Ask the Principal to approve your account under School Setup → Staff.')
        return
      }
      setUser(u)
      if (!u.school_id) {
        setError('Your profile is not linked to a school yet.')
        setSchool(null)
        return
      }
      const [{ data: sch, error: se }, { data: terms, error: te }] = await Promise.all([
        supabase.from('schools').select('*').eq('id', u.school_id).maybeSingle(),
        supabase.from('terms').select('*').eq('school_id', u.school_id).order('year', { ascending: false }),
      ])
      if (se) throw se
      if (te) console.warn(te.message)
      if (!sch) {
        setError('School record not found. Contact Super Admin.')
        setSchool(null)
        return
      }
      setSchool(sch)
      const list = terms || []
      const cur = list.find((t) => t.is_current) || list[0] || null
      setTerm(cur)
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const sync = async () => {
      if (!isOnline()) return
      const n = queueCount()
      if (n > 0) {
        const r = await flushQueue(buildOfflineHandlers(supabase))
        if (r.flushed) toast(`Synced ${r.flushed} offline item(s)`, 'ok')
      }
    }
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [])

  const logout = () => supabase.auth.signOut()
  const go = (p) => {
    if (user?.role && !canAccessPage(user?.role, p)) {

      return
    }
    setPage(p)
    setMenuOpen(false)
  }

  // Hooks must run every render — never after early returns (React #310)
  const isDeskOnly = !!(
    user &&
    deskOnlyRoles.includes(user?.role) &&
    !['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher'].includes(user?.role)
  )
  useEffect(() => {
    if (isDeskOnly && page !== 'staff-desk') setPage('staff-desk')
  }, [isDeskOnly, page])
  useEffect(() => {
    if (user?.role === 'Matron' && !['boarding', 'dashboard', 'staff-desk'].includes(page)) {
      setPage('boarding')
    }
  }, [user?.role, page])

  if (loading) {
    return (
      <div className="min-h-screen sk-mesh-light flex flex-col items-center justify-center gap-3 sm-app-shell">
        <Spinner dark />
        <p className="text-slate-600 text-sm">Loading school…</p>
      </div>
    )
  }

  if (error || !user || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full text-center space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-lg font-black text-slate-900">Could not open dashboard</p>
          <p className="text-red-600 text-sm font-semibold">{error || 'School profile missing'}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button type="button" className={btn} onClick={() => load()}>
              Try again
            </button>
            <button type="button" className={btn} onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  const props = { school, user, term, onTermChange: setTerm, session }

  return (
    <div className={`min-h-screen flex sm-app-shell theme-root plan-${(school?.plan || "basic").toLowerCase()}`} data-theme="standard">
      <Sidebar school={school} user={user} open={menuOpen} onClose={() => setMenuOpen(false)} page={page} onPage={go} />
      <div className="flex-1 flex flex-col min-w-0">
        <SyncBanner />
        <TopBar school={school} user={user} term={term} page={page} onLogout={logout} onMenu={() => setMenuOpen(true)} lang={lang} onLang={changeLang} announcement={!hideAnnounce ? announcement : ''} onHideAnnouncement={() => setHideAnnounce(true)} />
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <ErrorBoundary
            resetKey={page}
            fallback={(err, reset) => (
              <div className="max-w-md mx-auto mt-10 p-6 rounded-2xl border border-red-200 bg-red-50 space-y-3">
                <p className="font-black text-red-800">This page hit a snag</p>
                <p className="text-sm text-slate-600">
                  The rest of ShuleMoja is still working — you don't need to reload. {err?.message ? `(${err.message})` : ''}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold"
                    onClick={reset}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700"
                    onClick={() => { reset(); setPage('dashboard') }}
                  >
                    Back to dashboard
                  </button>
                </div>
              </div>
            )}
          >
          <Suspense fallback={<PageFallback />}>
            {user?.role && !canAccessPage(user?.role, page) && (
              <div className="max-w-md mx-auto mt-12 p-6 rounded-2xl border border-amber-200 bg-amber-50 text-center">
                <p className="font-black text-slate-900">Not available for your role</p>
                <p className="text-sm text-slate-600 mt-1">Your role ({user?.role}) cannot open this section. Contact the Principal if you need access.</p>
                <button type="button" className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold" onClick={() => setPage('dashboard')}>Back to dashboard</button>
              </div>
            )}
            {page === 'dashboard' && canAccessPage(user?.role, 'dashboard') && <MainDashboard {...props} onPage={go} onNavigate={go} lang={lang} />}
            {page === 'students' && canAccessPage(user?.role, 'students') && <Students {...props} />}
            {page === 'admissions' && canAccessPage(user?.role, 'admissions') && <Admissions {...props} />}
            {page === 'finance' && canAccessPage(user?.role, 'finance') && (
              <PremiumGate school={school} moduleName="finance">
                <StudentFinance {...props} />
              </PremiumGate>
            )}
            {page === 'comms-hub' && canAccessPage(user?.role, 'comms-hub') && (
              <PremiumGate school={school} moduleName="messages">
                <CommunicationsHub {...props} />
              </PremiumGate>
            )}
            {page === 'reports-hub' && canAccessPage(user?.role, 'reports-hub') && (
              <PremiumGate school={school} moduleName="exams">
                <ReportsHub {...props} />
              </PremiumGate>
            )}
            {page === 'exams' && canAccessPage(user?.role, 'exams') && (
              <PremiumGate school={school} moduleName="exams">
                <Exams {...props} />
              </PremiumGate>
            )}
            {page === 'reports' && canAccessPage(user?.role, 'reports') && (
              <PremiumGate school={school} moduleName="reports">
                <ReportCards {...props} />
              </PremiumGate>
            )}
            {page === 'school-finance' && canAccessPage(user?.role, 'school-finance') && (
              <PremiumGate school={school} moduleName="school-finance">
                <SchoolFinance {...props} />
              </PremiumGate>
            )}
            {page === 'resources' && canAccessPage(user?.role, 'resources') && (
              <PremiumGate school={school} moduleName="resources">
                <Resources {...props} />
              </PremiumGate>
            )}
            {page === 'library' && canAccessPage(user?.role, 'library') && (
              <PremiumGate school={school} moduleName="library">
                <Library {...props} />
              </PremiumGate>
            )}
            {page === 'setup' && canAccessPage(user?.role, 'setup') && <Setup {...props} />}
            {page === 'attendance' && canAccessPage(user?.role, 'attendance') && (
              <PremiumGate school={school} moduleName="attendance">
                <Attendance {...props} />
              </PremiumGate>
            )}
            {page === 'timetable' && canAccessPage(user?.role, 'timetable') && (
              <PremiumGate school={school} moduleName="timetable">
                <Timetable {...props} />
              </PremiumGate>
            )}
            {page === 'messages' && canAccessPage(user?.role, 'messages') && (
              <PremiumGate school={school} moduleName="messages">
                <Messaging {...props} />
              </PremiumGate>
            )}
            {page === 'import' && canAccessPage(user?.role, 'import') && (
              <PremiumGate school={school} moduleName="import">
                <ImportCenter {...props} />
              </PremiumGate>
            )}
            {page === 'parent-notices' && canAccessPage(user?.role, 'parent-notices') && (
              <Suspense fallback={<PageFallback />}>
                <PremiumGate school={school} moduleName="parent-notices">
                  <ParentNotices {...props} />
                </PremiumGate>
              </Suspense>
            )}
            {page === 'circulars' && canAccessPage(user?.role, 'circulars') && (
              <PremiumGate school={school} moduleName="circulars">
                <Circulars {...props} />
              </PremiumGate>
            )}
            {page === 'support' && canAccessPage(user?.role, 'support') && (
              <PremiumGate school={school} moduleName="support">
                <SupportCenter {...props} lang={lang} />
              </PremiumGate>
            )}
            {page === 'referrals' && canAccessPage(user?.role, 'referrals') && (
              <PremiumGate school={school} moduleName="referrals">
                <ReferralsCenter {...props} lang={lang} />
              </PremiumGate>
            )}
            {page === 'boarding' && canAccessPage(user?.role, 'boarding') && (
              <PremiumGate school={school} moduleName="boarding">
                <Boarding {...props} />
              </PremiumGate>
            )}
            {page === 'transport' && canAccessPage(user?.role, 'transport') && (
              <PremiumGate school={school} moduleName="transport">
                <Transport {...props} />
              </PremiumGate>
            )}
            {page === 'bom' && canAccessPage(user?.role, 'bom') && (
              <PremiumGate school={school} moduleName="bom">
                <BomPortal {...props} />
              </PremiumGate>
            )}
            {page === 'records' && canAccessPage(user?.role, 'records') && (
              <PremiumGate school={school} moduleName="records">
                <RecordsVault {...props} />
              </PremiumGate>
            )}
            {page === 'staff-desk' && canAccessPage(user?.role, 'staff-desk') && (
              <PremiumGate school={school} moduleName="staff-desk">
                <StaffDesk {...props} />
              </PremiumGate>
            )}
            {page === 'games' && canAccessPage(user?.role, 'games') && (
              <PremiumGate school={school} moduleName="games">
                <Games {...props} />
              </PremiumGate>
            )}

            {page === 'capitation' && canAccessPage(user?.role, 'capitation') && (
              <PremiumGate school={school} moduleName="capitation">
                <Suspense fallback={<PageFallback />}><Capitation {...props} /></Suspense>
              </PremiumGate>
            )}
            {page === 'finance-analysis' && canAccessPage(user?.role, 'finance-analysis') && (
              <PremiumGate school={school} moduleName="finance-analysis">
                <Suspense fallback={<PageFallback />}><FinanceAnalysis {...props} /></Suspense>
              </PremiumGate>
            )}

          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
