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
  const isPro = (ent.planId === 'pro') || !!(ent.library || ent.boarding)
  const isBasicOnly = !isPrem && !isPro && (ent.planId === 'free' || ent.planId === 'basic' || ent.planId === 'trial' || !ent.planId)
  const logoBg = school?.logo_url || school?.logo || ''

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

      
            {/* Hero — centered logo, side fades, role, plan-aware actions */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl text-white shadow-2xl border border-white/10 min-h-[11rem]"
        style={
          logoBg
            ? {
                backgroundImage: `url(${logoBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {!logoBg && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-900 to-teal-700" />
        )}
        {/* Soft side fades so name/buttons read cleanly; logo stays visible in center */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/15 to-slate-950/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/55 pointer-events-none" />
        <div className="relative p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wide drop-shadow">
                  {t(lang, 'dashboard')}
                </span>
                {isPro ? (
                  <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full">Pro</span>
                ) : isPrem ? (
                  <span className="text-[9px] font-black uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">{t(lang, 'premium')}</span>
                ) : (
                  <span className="text-[9px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">{t(lang, 'basic')}</span>
                )}
                {trialActive && (
                  <span className="text-[9px] font-bold uppercase bg-white/15 border border-white/25 px-2 py-0.5 rounded-full">{t(lang, 'trial')}</span>
                )}
                {showSubTimer && (
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    subExpired ? 'bg-red-500/30 border-red-300 text-red-100' :
                    subUrgent ? 'bg-amber-500/30 border-amber-300 text-amber-50' :
                    'bg-white/15 border-white/30 text-white'
                  }`}>
                    {subExpired ? 'Plan ended' : `${daysLeft}d left`}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight truncate text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {user?.full_name || '—'}
              </h1>
              <p className="text-white/95 text-sm font-medium truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{school?.school_name}</p>
              <p className="text-[11px] text-sky-100/90 mt-0.5 drop-shadow">
                Signed in as <span className="font-bold text-white">{user?.role || 'Staff'}</span>
                {term ? ` · ${t(lang, 'term')} ${term.term} · ${term.year}` : ''}
              </p>
            </div>
            {/* Center-ish logo badge when school logo exists */}
            {logoBg && (
              <div className="flex shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-white/70 shadow-[0_0_24px_rgba(255,255,255,0.25)] bg-black/30 border border-white/30">
                <img src={logoBg} alt="" className="w-full h-full object-contain bg-slate-900/40" />
              </div>
            )}
            <div className="flex flex-col gap-1.5 shrink-0 w-[7.25rem] sm:w-32">
              {/* Free: Support + Install only. Invite/Earn = Premium gold */}
              <button
                type="button"
                onClick={() => go?.('support')}
                className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-amber-400 active:text-amber-950 text-white text-[10px] sm:text-[11px] font-bold py-1.5 px-2 shadow"
              >
                Support
              </button>
              {isPrem && isLeader && (
                <button
                  type="button"
                  onClick={() => go?.('referrals')}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 text-[10px] sm:text-[11px] font-black py-1.5 px-2 shadow-[0_0_16px_rgba(251,191,36,0.55)] border border-amber-200"
                >
                  Earn
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
                      else {
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                        toast(isIOS
                          ? 'iPhone: Share → Add to Home Screen'
                          : 'Chrome menu (⋮) → Install app / Add to Home screen', 'info')
                      }
                    } finally {
                      setInstallBusy(false)
                    }
                  }}
                  className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-amber-400 active:text-amber-950 text-white text-[10px] sm:text-[11px] font-bold py-1.5 px-2 shadow disabled:opacity-60"
                >
                  {installBusy ? '…' : 'Install'}
                </button>
              )}
            </div>
          </div>
          {(isPrem || isPro) && (
            <p className="text-[9px] text-white/35 font-medium tracking-wide">ShuleMoja by BigDataKE</p>
          )}
        </div>
      </div>

{!installable && typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches && (
        <p className="text-[11px] text-slate-500 -mt-1">
          Tip: on iPhone use Share → <strong>Add to Home Screen</strong> for the full offline app. On Android/Chrome, use <strong>Install app</strong> when it appears.
        </p>
      )}

      {!term && <NeedTerm />}

      {/* New-school go-live checklist */}
      {isLeader && (
        <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 space-y-2 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-sky-800">New school checklist</p>
          <ol className="text-sm text-slate-700 space-y-1.5 list-decimal pl-5">
            <li>Setup → <strong>School identity</strong> (name, logo, contacts)</li>
            <li>Setup → <strong>Terms</strong> — set current term / year</li>
            <li>Setup → <strong>Grades &amp; Subjects</strong></li>
            <li>Setup → <strong>Fee structure</strong> (Basic+)</li>
            <li>Add <strong>Staff</strong> and approve accounts</li>
            <li><strong>Admissions</strong> / Students — enrol learners</li>
            <li>Record opening arrears &amp; payments under <strong>Student fees</strong></li>
            <li>Install the app (button above) for offline desk use</li>
          </ol>
          <p className="text-[11px] text-slate-500">Free plan: Students, Admissions, and limited Setup only. Upgrade for fees exports, messaging, and more.</p>
        </div>
      )}


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
