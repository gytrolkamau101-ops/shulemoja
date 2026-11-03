import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, NeedTerm, fmt, StatPill } from '../ui'
import { planEntitlements } from '../../lib/plans'
import { referralProgress, whatsappShareUrl } from '../../lib/referral'
import { ADMIN, FINANCE_ROLES, EXAM_ROLES } from '../../lib/roles'
import { whatsappUrl, smsUrl } from '../../lib/support'
import { canAccessPage, canEditData, canEditFinance, roleCapabilities } from '../../lib/roles'
import { getSettings } from '../../lib/platform'
import { t } from '../../lib/i18n'
import { canInstall, onInstallAvailability, promptInstall, isStandalone } from '../../lib/installApp'
import { toast } from '../ui'

export default function MainDashboard({ user, school, term, onNavigate, onPage, lang = 'en' }) {
  const go = onPage || onNavigate
  const ent = planEntitlements(school || {})
  const isPrem = !!(ent.prioritySupport || ent.messages)
  const [stats, setStats] = useState({ total: 0, girls: 0, boys: 0, collected: 0, expenses: 0 })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [support, setSupport] = useState({ whatsapp: '', phone: '' })
  const [installable, setInstallable] = useState(false)
  const [installBusy, setInstallBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const s = await getSettings(['contacts', 'support'])
        if (!alive) return
        const c = s.contacts || {}
        const sup = s.support || {}
        setSupport({
          whatsapp: sup.whatsapp || c.whatsapp || '',
          phone: sup.phone || c.phone || '',
        })
      } catch (_) {}
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    return onInstallAvailability(setInstallable)
  }, [])

  useEffect(() => {
    let alive = true
    if (!school?.id) {
      setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        // Counts only — avoids downloading one row per student just to tally
        // gender (matters once a school has hundreds/thousands of students).
        const baseQ = () => supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', school?.id).eq('status', 'Active')
        const [{ count: total }, { count: girls }, { count: boys }] = await Promise.all([
          baseQ(),
          baseQ().eq('gender', 'Female'),
          baseQ().eq('gender', 'Male'),
        ])

        let collected = 0
        let expenses = 0
        if (term?.id) {
          if (FINANCE_ROLES.includes(user?.role)) {
            const { data: payments } = await supabase
              .from('fee_payments')
              .select('amount_paid')
              .eq('school_id', school?.id)
              .eq('term_id', term.id)
            collected = (payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0)
          }
          if (ADMIN.includes(user?.role)) {
            const { data: exp } = await supabase
              .from('expenses')
              .select('amount')
              .eq('school_id', school?.id)
              .eq('term_id', term.id)
            expenses = (exp || []).reduce((s, e) => s + Number(e.amount || 0), 0)
          }
        }

        const { data: upcoming } = await supabase
          .from('school_events')
          .select('*')
          .eq('school_id', school?.id)
          .order('event_date', { ascending: true })
          .limit(12)

        if (!alive) return
        setStats({
          total: total || 0,
          girls: girls || 0,
          boys: boys || 0,
          collected,
          expenses,
        })
        setEvents(upcoming || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [school?.id, term?.id, user?.role])

  const canFinance = FINANCE_ROLES.includes(user?.role)
  const canExams = EXAM_ROLES.includes(user?.role)
  const isLeader = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'].includes(user?.role)
  const rp = referralProgress(school || {})
  const trialActive =
    school?.trial_ends_at &&
    new Date(school.trial_ends_at) > new Date() &&
    (school.plan === 'trial' || !school.plan)

  const expiryRaw = school?.plan_expires_at || school?.trial_ends_at || null
  const expiryDate = expiryRaw ? new Date(expiryRaw) : null
  const msLeft = expiryDate ? expiryDate.getTime() - Date.now() : null
  const daysLeft = msLeft == null ? null : Math.ceil(msLeft / (1000 * 60 * 60 * 24))
  const showSubTimer = daysLeft != null && daysLeft <= 30
  const subExpired = daysLeft != null && daysLeft < 0
  const subUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7

  const supportText = `ShuleMoja support\nSchool: ${school?.school_name || ''}\nUser: ${user?.full_name || ''}`
  const wa = whatsappUrl(support.whatsapp || support.phone, supportText)
  const sms = smsUrl(support.phone || support.whatsapp, supportText)

  const caps = roleCapabilities(user?.role)
  const actions = [
    { label: 'Admissions', go: 'admissions', show: caps.admissions, icon: '📝' },
    { label: t(lang, 'students') || 'Students', go: 'students', show: canAccessPage(user?.role, 'students'), icon: '👥' },
    { label: t(lang, 'fees') || 'Fees', go: 'finance', show: caps.viewFees, icon: '💵' },
    { label: t(lang, 'exams') || 'Exams', go: 'exams', show: canAccessPage(user?.role, 'exams'), icon: '📋' },
    { label: 'Reports', go: 'reports', show: canAccessPage(user?.role, 'reports'), icon: '📄' },
    { label: t(lang, 'setup') || 'Setup', go: 'setup', show: caps.editSetup, icon: '⚙' },
  ].filter((a) => a.show)

  return (
    <div className="space-y-4 sm-dash sm-dash-rich">

      {showSubTimer && (
        <div
          className={`rounded-2xl border-2 px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${
            subExpired
              ? 'bg-red-50 border-red-400 text-red-950'
              : subUrgent
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-sky-50 border-sky-400 text-sky-950'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide opacity-80">Subscription</p>
            <p className="text-sm font-bold">
              {subExpired
                ? `Plan expired ${Math.abs(daysLeft)} day(s) ago (${expiryDate.toLocaleDateString('en-GB')}).`
                : daysLeft === 0
                  ? `Plan ends today (${expiryDate.toLocaleDateString('en-GB')}).`
                  : `Plan ends in ${daysLeft} day(s) — ${expiryDate.toLocaleDateString('en-GB')}.`}
            </p>
            <p className="text-xs font-medium mt-0.5 opacity-90">
              Contact BigDataKE to renew (Support / WhatsApp on this dashboard), or pay from your plan page.
            </p>
          </div>
          <div className="shrink-0 text-center rounded-xl bg-white/80 border border-black/10 px-3 py-2">
            <p className="text-2xl font-black tabular-nums leading-none">{subExpired ? 0 : Math.max(0, daysLeft)}</p>
            <p className="text-[10px] font-black uppercase mt-0.5">days left</p>
          </div>
        </div>
      )}
      {/* Hero — mobile safe */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white bg-gradient-to-br from-slate-950 via-blue-800 to-teal-600 shadow-2xl border border-white/10">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-blue-100/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
              {t(lang, 'dashboard')}
            </span>
            {isPrem ? (
              <span className="text-[9px] sm:text-[10px] font-black uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                {t(lang, 'premium')}
              </span>
            ) : (
              <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">
                {t(lang, 'basic')}
              </span>
            )}
            {trialActive && (
              <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-white/15 border border-white/25 px-2 py-0.5 rounded-full">
                {t(lang, 'trial')}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight truncate text-white">
            {user?.full_name || '—'}
          </h1>
          <p className="text-cyan-100/90 text-sm font-medium truncate">{school?.school_name}</p>
          {term && (
            <p className="text-cyan-100/70 text-xs mt-1">
              {t(lang, 'term')} {term.term} · {term.year}
            </p>
          )}
          <div className="flex flex-col gap-2 mt-3 sm:flex-row sm:flex-wrap">
            {isPrem && (
              <button type="button" onClick={() => go?.('support')} className="sm-gold-btn !py-1.5 !text-xs">
                <span className="sm-gold-icon">☎</span>
                {t(lang, 'contactSupport') || 'Contact support'}
              </button>
            )}
            {isPrem && isLeader && (
              <button type="button" onClick={() => go?.('referrals')} className="sm-gold-btn !py-1.5 !text-xs">
                <span className="sm-gold-icon">🏆</span>
                {t(lang, 'inviteEarn') || 'Invite · Earn'}
              </button>
            )}
            {(installable || !isStandalone()) && (
              <button
                type="button"
                disabled={installBusy}
                onClick={async () => {
                  setInstallBusy(true)
                  try {
                    const ok = await promptInstall()
                    if (ok) toast('ShuleMoja installed', 'ok')
                    else toast('Use browser menu → Install app if the prompt is hidden', 'info')
                  } finally {
                    setInstallBusy(false)
                  }
                }}
                className="sm-gold-btn !py-1.5 !text-xs"
                title="Install ShuleMoja on this device"
              >
                <span className="sm-gold-icon">⬇</span>
                {installBusy ? 'Installing…' : 'Install app'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!installable && typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches && (
        <p className="text-[11px] text-slate-500 -mt-1">
          Tip: on iPhone use Share → <strong>Add to Home Screen</strong> for the full offline app. On Android/Chrome, use <strong>Install app</strong> when it appears.
        </p>
      )}

      {!term && <NeedTerm />}

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="sk-spinner-dark !w-8 !h-8 !border-[3px]" role="status" aria-label="Loading" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatPill label={t(lang, 'students')} value={stats.total} tone="blue" />
            <StatPill label={t(lang, 'girls')} value={stats.girls} tone="pink" />
            <StatPill label={t(lang, 'boys')} value={stats.boys} tone="violet" />
            {canFinance && (
              <StatPill label={t(lang, 'feesTerm')} value={`KES ${fmt(stats.collected)}`} tone="green" />
            )}
          </div>

          {/* Quick Actions — dark banner tiles */}
          <div className="rounded-2xl border-2 border-slate-800/80 bg-slate-900/95 p-3 sm:p-4 shadow-xl">
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-sky-400 drop-shadow-[0_0_8px_#0ea5e9] mb-3">
              {t(lang, 'quickActions')}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {actions.map((a) => (
                <button
                  key={a.go}
                  type="button"
                  onClick={() => go?.(a.go)}
                  className="sm-qa-banner"
                >
                  <span className="text-lg opacity-90">{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title={t(lang, 'upcoming')} className="bg-slate-50 border border-slate-200">
              {events.length === 0 ? (
                <p className="text-slate-700 text-sm font-medium">{t(lang, 'noEvents')}</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2 text-sm border-l-4 border-cyan-600 pl-3 py-1.5 rounded-r-lg bg-slate-50">
                      <span className="font-bold text-slate-900 truncate">
                        {e.event_name}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 shrink-0">
                        {new Date(e.event_date).toLocaleDateString('en-GB')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
