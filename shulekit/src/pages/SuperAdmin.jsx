import { BRAND_NAME, LOGO_C2, LOGO_TEXT } from '../brand'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { intasendConfig } from '../lib/intasend'
import { getSetting, saveSetting } from '../lib/platform'
import { compressDataUrl } from '../lib/media'
import { Scroll, Alert, btn, btnGreen, th, td, toast, Spinner, fmt } from '../components/ui'
import ImagePicker from '../components/ImagePicker'
import { DEFAULT_PLANS } from '../lib/plans'
import ThemeTab from './superadmin/ThemeTab'
import PricingTab from './superadmin/PricingTab'
import PagesTab from './superadmin/PagesTab'
import SchoolsTab from './superadmin/SchoolsTab'
import ReferralsTab from './superadmin/ReferralsTab'
import PartnersTab from './superadmin/PartnersTab'
import SupportTab from './superadmin/SupportTab'
import BillingTab from './superadmin/BillingTab'
import PaymentsTab from './superadmin/PaymentsTab'
import AuditTabSa from './superadmin/AuditTab'
import AnalyticsTab from './superadmin/AnalyticsTab'

import { saField, saTd, saTh } from './superadmin/saStyles'


const TABS = ['overview', 'schools', 'referrals', 'partners', 'support', 'billing', 'payments', 'analytics', 'theme', 'pricing', 'pages', 'audit']
const TAB_LABELS = {
  overview: 'Overview',
  schools: 'Schools',
  referrals: 'Referrals',
  partners: 'Partners',
  support: 'Support',
  billing: 'Billing',
  payments: 'Payments',
  theme: 'Theme',
  pricing: 'Pricing',
  pages: 'Pages',
  analytics: 'Analytics',
  audit: 'Audit',
}

export default function SuperAdmin({ session }) {
  const [admin, setAdmin] = useState(null)
  const [schools, setSchools] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [billSchool, setBillSchool] = useState('')
  const [billAmount, setBillAmount] = useState('5000')
  const [billing, setBilling] = useState(false)
  const [billPhone, setBillPhone] = useState('')
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState('overview')
  const [theme, setTheme] = useState({
    primary: '#1d4ed8',
    accent: '#06b6d4',
    bg_style: 'gradient',
    bg_from: '#0f172a',
    bg_to: '#1e3a8a',
    logo_text: 'SM',
    brand_logo_url: '',
    brand_name: '',
    footer_text: '',
  })
  const [pricing, setPricing] = useState({ currency: 'KES', plans: [] })
  const [terms, setTerms] = useState({ title: 'Terms & Conditions', body: '' })
  const [privacy, setPrivacy] = useState({ title: 'Privacy Policy', body: '' })
  const [how, setHow] = useState({ title: 'How it works', body: '' })
  const [howApp, setHowApp] = useState({ title: 'How to use the app', body: '' })
  const [contacts, setContacts] = useState({ title: 'Contact us', email: '', phone: '', whatsapp: '', address: '' })
  const [savingCms, setSavingCms] = useState(false)
  const [payEvents, setPayEvents] = useState([])
  const [payFilter, setPayFilter] = useState('all') // all | success | failed | pending
  const [selectedSchool, setSelectedSchool] = useState(null)

  // --- Partner program state ---
  const [partners, setPartners] = useState([])
  const [partnerEvents, setPartnerEvents] = useState([])
  const [partnerConfig, setPartnerConfig] = useState({ bonus_basic: 200, bonus_premium: 350, bonus_pro: 500, commission_pct: 2.5 })
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerPhone, setNewPartnerPhone] = useState('')
  const [newPartnerEmail, setNewPartnerEmail] = useState('')
  const [creatingPartner, setCreatingPartner] = useState(false)
  const [savingPartnerConfig, setSavingPartnerConfig] = useState(false)
  const [payoutFilter, setPayoutFilter] = useState('pending_approval')

  const loadRef = useRef(async () => {})
  const load = useCallback(async () => {
    setLoading(true)
    const { data: me } = await supabase.from('platform_admins').select('*').eq('id', session.user.id).maybeSingle()
    setAdmin(me)
    if (!me) {
      setLoading(false)
      return
    }
    const [{ data: sch }, { data: aud }, { data: pays }] = await Promise.all([
      supabase.from('schools').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_events').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('subscription_events').select('*').order('created_at', { ascending: false }).limit(300),
    ])
    try {
        const { data: tks } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(100)
        setTickets(tks || [])
      } catch (_) { setTickets([]) }
      setSchools(sch || [])
    setEvents(aud || [])
    setPayEvents(pays || [])
    try {
      const [{ data: prts }, { data: pevs }, { data: pcfg }] = await Promise.all([
        supabase.from('partners').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_payout_events').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('partner_payout_config').select('*').eq('id', 1).maybeSingle(),
      ])
      setPartners(prts || [])
      setPartnerEvents(pevs || [])
      if (pcfg) setPartnerConfig(pcfg)
    } catch (_) {
      setPartners([])
      setPartnerEvents([])
    }
    const [th, pr, te, pv, hi, ha, co] = await Promise.all([
      getSetting('theme'),
      getSetting('pricing'),
      getSetting('terms'),
      getSetting('privacy'),
      getSetting('how_it_works'),
      getSetting('how_it_works_app'),
      getSetting('contacts'),
    ])
    if (th) setTheme((p) => ({ ...p, ...th }))
    if (pr?.plans?.length) setPricing(pr)
    else setPricing(DEFAULT_PLANS)
    if (pv) setPrivacy(pv)
    if (te) setTerms(te)
    if (hi) setHow(hi)
    if (ha) setHowApp(ha)
    if (co) setContacts(co)
    setLoading(false)
  }, [session.user.id])

  loadRef.current = load
  const reload = () => loadRef.current()

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const suspended = schools.filter((s) => s.is_suspended).length
    const paid = schools.filter((s) => s.plan && s.plan !== 'free' && s.plan !== 'trial').length
    const trial = schools.filter((s) => !s.plan || s.plan === 'trial' || s.plan === 'free').length
    const st = (s) => (s || '').toUpperCase()
    const payOk = payEvents.filter((e) => ['COMPLETE', 'COMPLETED', 'PAID'].includes(st(e.state))).length
    const payFail = payEvents.filter((e) => ['FAILED', 'CANCELED', 'CANCELLED'].includes(st(e.state))).length
    const payPending = payEvents.filter((e) =>
      ['STK_INIT', 'STK_SENT', 'PENDING', 'PROCESSING', 'RETRY', 'PARTIAL'].includes(st(e.state))
    ).length
    return { total: schools.length, suspended, paid, trial, audit: events.length, payOk, payFail, payPending }
  }, [schools, events, payEvents])

  const filteredPays = useMemo(() => {
    const st = (s) => (s || '').toUpperCase()
    return payEvents.filter((e) => {
      const s = st(e.state)
      if (payFilter === 'success') return ['COMPLETE', 'COMPLETED', 'PAID'].includes(s)
      if (payFilter === 'failed') return ['FAILED', 'CANCELED', 'CANCELLED'].includes(s)
      if (payFilter === 'pending') return ['STK_INIT', 'STK_SENT', 'PENDING', 'PROCESSING', 'RETRY', 'PARTIAL'].includes(s)
      return true
    })
  }, [payEvents, payFilter])

  const schoolName = (id) => {
    if (!id) return '—'
    const s = schools.find((x) => x.id === id)
    return s?.school_name || String(id).slice(0, 8) + '…'
  }

  const toggleSuspend = async (s) => {
    setError('')
    const { error } = await supabase.from('schools').update({ is_suspended: !s.is_suspended }).eq('id', s.id)
    if (error) return setError(error.message)
    reload()
  }

  const setPlan = async (s, plan) => {
    const { error } = await supabase.from('schools').update({ plan }).eq('id', s.id)
    if (error) return setError(error.message)
    reload()
  }

  const setExpiry = async (s, days) => {
    const d = new Date()
    d.setDate(d.getDate() + Number(days))
    const { error } = await supabase
      .from('schools')
      .update({ plan_expires_at: d.toISOString(), plan: s.plan && s.plan !== 'free' ? s.plan : 'basic' })
      .eq('id', s.id)
    if (error) return setError(error.message)
    toast(`Extended ${s.school_name} by ${days} days`, 'ok')
    reload()
  }

  const saveCms = async (key, value) => {
    setSavingCms(true)
    setError('')
    try {
      let payload = value
      if (key === 'theme' && payload?.brand_logo_url && String(payload.brand_logo_url).startsWith('data:')) {
        try {
          payload = {
            ...payload,
            brand_logo_url: await compressDataUrl(payload.brand_logo_url, { maxW: 520, quality: 0.6 }),
          }
          setTheme(payload)
        } catch (_) {}
        if (String(payload.brand_logo_url).length > 900000) {
          throw new Error('Logo still too large after compression. Use a smaller JPG (under 300KB) or a public image URL.')
        }
      }
      const saved = await saveSetting(key, payload)
      if (key === 'theme') {
        try {
          const r = document.documentElement
          if (payload.primary) r.style.setProperty('--sk-primary', payload.primary)
          if (payload.accent) r.style.setProperty('--sk-accent', payload.accent)
          localStorage.setItem('sm_login_theme', JSON.stringify(payload))
          // Confirm read-back from DB
          const { getSetting } = await import('../lib/platform')
          const check = await getSetting('theme')
          if (!check) {
            throw new Error(
              'Saved but theme could not be read back. Check Supabase RLS on platform_settings (Super Admin must be allowed to upsert).'
            )
          }
        } catch (inner) {
          if (inner?.message?.includes('RLS') || inner?.message?.includes('read back')) throw inner
        }

        toast(
          payload?.brand_logo_url
            ? 'Branding saved — custom login logo is live (refresh login)'
            : 'Branding saved — using built-in default logo',
          'ok'
        )
      } else {
        toast('Saved — live on login & platform', 'ok')
      }
    } catch (e) {
      setError(e.message)
      toast(e.message || 'Save failed', 'error')
    }
    setSavingCms(false)
  }


  const createPartner = async (e) => {
    e.preventDefault()
    if (!newPartnerName.trim() || !newPartnerPhone.trim()) {
      return setError('Partner name and phone are required.')
    }
    setCreatingPartner(true)
    setError('')
    const { error } = await supabase.from('partners').insert({
      full_name: newPartnerName.trim(),
      phone: newPartnerPhone.trim(),
      email: newPartnerEmail.trim() || null,
    })
    setCreatingPartner(false)
    if (error) return setError(error.message)
    setNewPartnerName('')
    setNewPartnerPhone('')
    setNewPartnerEmail('')
    toast('Partner added', 'ok')
    reload()
  }

  const togglePartnerStatus = async (p) => {
    const { error } = await supabase
      .from('partners')
      .update({ status: p.status === 'active' ? 'suspended' : 'active' })
      .eq('id', p.id)
    if (error) return setError(error.message)
    reload()
  }

  const savePartnerConfig = async () => {
    setSavingPartnerConfig(true)
    setError('')
    const { error } = await supabase
      .from('partner_payout_config')
      .update({
        bonus_basic: Number(partnerConfig.bonus_basic) || 0,
        bonus_premium: Number(partnerConfig.bonus_premium) || 0,
        bonus_pro: Number(partnerConfig.bonus_pro) || 0,
        commission_pct: Number(partnerConfig.commission_pct) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    setSavingPartnerConfig(false)
    if (error) return setError(error.message)
    toast('Partner payout rates saved', 'ok')
    reload()
  }

  const setPayoutStatus = async (ev, status) => {
    const patch = { status }
    if (status === 'approved') {
      patch.approved_by = session.user.id
      patch.approved_at = new Date().toISOString()
    }
    if (status === 'paid') {
      const ref = window.prompt('M-Pesa confirmation code for this payout:')
      if (!ref || !ref.trim()) return
      patch.paid_reference = ref.trim()
      patch.paid_at = new Date().toISOString()
    }
    const { error } = await supabase.from('partner_payout_events').update(patch).eq('id', ev.id)
    if (error) return setError(error.message)
    toast(`Payout ${status.replace('_', ' ')}`, 'ok')
    reload()
  }

  const logout = () => supabase.auth.signOut()
  const cfg = intasendConfig()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Spinner />
        <p className="text-slate-400 text-sm">Loading command centre…</p>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md text-center space-y-4">
          <h1 className="text-2xl font-black text-white">{BRAND_NAME}</h1>
          <p className="text-slate-400 text-sm">Not a platform admin.</p>
          <button onClick={logout} className={btn}>
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              theme.bg_style === 'solid'
                ? theme.bg_from
                : `linear-gradient(135deg, ${theme.bg_from}, ${theme.bg_to})`,
          }}
        />
        <div className="relative px-4 md:px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-white/20 bg-slate-900">
              <img src="/icon.svg" alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-cyan-200/90 text-xs font-bold tracking-widest uppercase">Platform command centre</p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{BRAND_NAME}</h1>
              <p className="text-sm text-blue-100/80">{admin.full_name || session.user.email} · BigDataKE Technologies</p>
            </div>
          </div>
          <button onClick={logout} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-bold">
            Logout
          </button>
        </div>
        <div className="relative px-4 md:px-8 pb-4 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                tab === t
                  ? 'bg-sky-400 text-slate-950 shadow-[0_0_16px_rgba(56,189,248,0.45)]'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600'
              }`}
            >
              {TAB_LABELS[t] || t}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 md:px-8 py-6 space-y-6 max-w-6xl mx-auto">
        <Alert>{error}</Alert>

        {(tab === 'overview' || tab === 'schools') && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Schools', value: stats.total, c: 'from-blue-500 to-cyan-500' },
              { label: 'Paid', value: stats.paid, c: 'from-emerald-500 to-teal-600' },
              { label: 'Trial/free', value: stats.trial, c: 'from-amber-500 to-orange-600' },
              { label: 'Suspended', value: stats.suspended, c: 'from-rose-500 to-red-600' },
            ].map((x) => (
              <div key={x.label} className={`rounded-2xl p-4 bg-gradient-to-br ${x.c} shadow-lg`}>
                <p className="text-xs font-semibold text-white/85 uppercase">{x.label}</p>
                <p className="text-3xl font-black mt-1">{x.value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'overview' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-400">
            Edit <strong className="text-white">Theme</strong>, <strong className="text-white">Pricing</strong>, and public{' '}
            <strong className="text-white">Pages</strong> (Terms, How it works, Contacts). Changes apply on the login page for every visitor.
          </div>
        )}

        
        {tab === 'schools' && (
          <SchoolsTab
            schools={schools}
            payEvents={payEvents}
            filter={filter}
            setFilter={setFilter}
            toggleSuspend={toggleSuspend}
            setPlan={setPlan}
            setExpiry={setExpiry}
            selectedSchool={selectedSchool}
            setSelectedSchool={setSelectedSchool}
          />
        )}

{tab === 'referrals' && (
          <ReferralsTab schools={schools} />
        )}

        {tab === 'partners' && (
          <PartnersTab
            partners={partners}
            partnerEvents={partnerEvents}
            schools={schools}
            partnerConfig={partnerConfig}
            setPartnerConfig={setPartnerConfig}
            savingPartnerConfig={savingPartnerConfig}
            savePartnerConfig={savePartnerConfig}
            newPartnerName={newPartnerName}
            setNewPartnerName={setNewPartnerName}
            newPartnerPhone={newPartnerPhone}
            setNewPartnerPhone={setNewPartnerPhone}
            newPartnerEmail={newPartnerEmail}
            setNewPartnerEmail={setNewPartnerEmail}
            creatingPartner={creatingPartner}
            createPartner={createPartner}
            togglePartnerStatus={togglePartnerStatus}
            setPayoutStatus={setPayoutStatus}
            payoutFilter={payoutFilter}
            setPayoutFilter={setPayoutFilter}
          />
        )}

        {tab === 'support' && (
          <SupportTab tickets={tickets} setTickets={setTickets} />
        )}
{tab === 'billing' && (
          <BillingTab schools={schools} billSchool={billSchool} setBillSchool={setBillSchool} billAmount={billAmount} setBillAmount={setBillAmount} billPhone={billPhone} setBillPhone={setBillPhone} billing={billing} setBilling={setBilling} setError={setError} session={session} cfg={cfg} />
        )}
{tab === 'theme' && (
          <ThemeTab theme={theme} setTheme={setTheme} savingCms={savingCms} saveCms={saveCms} />
        )}
        {tab === 'pricing' && (
          <PricingTab pricing={pricing} setPricing={setPricing} savingCms={savingCms} saveCms={saveCms} />
        )}
        {tab === 'pages' && (
          <PagesTab terms={terms} setTerms={setTerms} privacy={privacy} setPrivacy={setPrivacy} how={how} setHow={setHow} howApp={howApp} setHowApp={setHowApp} contacts={contacts} setContacts={setContacts} savingCms={savingCms} saveCms={saveCms} />
        )}
        {tab === 'payments' && (
          <PaymentsTab filteredPays={filteredPays} payFilter={payFilter} setPayFilter={setPayFilter} schoolName={schoolName} stats={stats} reload={reload} />
        )}
        {tab === 'analytics' && (
          <AnalyticsTab schools={schools} pays={payEvents} audit={events} />
        )}
{tab === 'audit' && (
          <AuditTabSa events={events} />
        )}

        <p className="text-center text-xs text-slate-600 pb-8">© BigDataKE Technologies · ShuleMoja</p>

      </main>
    </div>
  )
}