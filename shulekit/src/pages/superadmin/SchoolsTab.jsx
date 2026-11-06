import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Scroll, fmt } from '../../components/ui'
import { whatsappUrl, smsUrl, telUrl } from '../../lib/support'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'


function daysUntilExpiry(s) {
  const raw = s?.plan_expires_at || s?.trial_ends_at
  if (!raw) return null
  return Math.ceil((new Date(raw).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function SchoolsTab({
  schools: schoolsProp,
  payEvents: payEventsProp,
  filter,
  setFilter,
  toggleSuspend,
  setPlan,
  setExpiry,
  selectedSchool,
  setSelectedSchool,
}) {
  const schools = Array.isArray(schoolsProp) ? schoolsProp : []
  const payEvents = Array.isArray(payEventsProp) ? payEventsProp : []
  const [principalContact, setPrincipalContact] = useState(null)

  const filtered = useMemo(
    () =>
      schools.filter(
        (s) =>
          !filter ||
          (s.school_name || '').toLowerCase().includes(filter.toLowerCase()) ||
          (s.school_code || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [schools, filter]
  )

  const schoolSubs = useMemo(() => {
    if (!selectedSchool) return []
    const sid = selectedSchool.id
    const code = (selectedSchool.school_code || '').toLowerCase()
    return (payEvents || []).filter((e) => {
      const meta = e.meta || e.payload || {}
      return (
        e.school_id === sid ||
        meta.school_id === sid ||
        (code && String(e.api_ref || meta.api_ref || '').toLowerCase().includes(code)) ||
        (code && String(e.invoice_id || '').toLowerCase().includes(code))
      )
    })
  }, [selectedSchool, payEvents])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setPrincipalContact(null)
      if (!selectedSchool?.id) return
      const { data } = await supabase
        .from('users')
        .select('full_name, email, phone, role')
        .eq('school_id', selectedSchool.id)
        .eq('role', 'Principal')
        .limit(1)
        .maybeSingle()
      if (!alive) return
      if (data) setPrincipalContact(data)
      else {
        const { data: anyAdmin } = await supabase
          .from('users')
          .select('full_name, email, phone, role')
          .eq('school_id', selectedSchool.id)
          .in('role', ['Principal', 'Deputy Principal', 'Secretary'])
          .limit(1)
          .maybeSingle()
        if (alive) setPrincipalContact(anyAdmin || null)
      }
    })()
    return () => {
      alive = false
    }
  }, [selectedSchool?.id])

  const downloadSchoolSubsCsv = () => {
    if (!selectedSchool) return
    const header = ['created_at', 'status', 'amount', 'plan', 'invoice_id', 'api_ref', 'provider', 'phone']
    const lines = [header.join(',')]
    schoolSubs.forEach((e) => {
      const meta = e.meta || e.payload || {}
      const row = [
        e.created_at || '',
        e.status || meta.status || '',
        e.amount ?? meta.amount ?? '',
        e.plan || meta.plan || '',
        e.invoice_id || meta.invoice_id || '',
        e.api_ref || meta.api_ref || '',
        e.provider || 'intasend',
        e.phone || meta.phone || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
      lines.push(row.join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `shulemoja_subs_${selectedSchool.school_code || selectedSchool.id}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Tip: sort by eye using the <strong className="text-slate-200">Expires</strong> column (red = past, amber ≤7d, blue ≤30d). Open{' '}
        <strong className="text-amber-300">Contact / Subs</strong> to Email, WhatsApp, SMS or Call the Principal.
      </p>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <input
            className={saField}
            style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Scroll dark>
          <table className="w-full sa-table">
            <thead className="bg-slate-950">
              <tr>
                <th className={`${saTh} bg-transparent text-slate-400`}>School</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Code</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Plan</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Status</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Expires</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-slate-700 bg-slate-900">
                  <td className={`${saTd} font-bold text-white !text-slate-50`}><span className="text-slate-50 font-bold">{s.school_name || "—"}</span></td>
                  <td className={`${saTd} font-mono text-cyan-400 text-xs`}>{s.school_code}</td>
                  <td className={saTd}>
                    <select
                      className="bg-slate-800 border border-slate-600 rounded-lg text-xs text-white px-2 py-1"
                      value={s.plan || 'free'}
                      onChange={(e) => setPlan(s, e.target.value)}
                    >
                      {['free', 'trial', 'basic', 'premium', 'pro'].map((p) => (
                        <option key={p} value={p} className="bg-slate-900 text-white">
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={saTd}>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        s.is_suspended ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {s.is_suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td
                    className={`${saTd} text-xs font-bold ${(() => {
                      const d = daysUntilExpiry(s)
                      if (d == null) return 'text-slate-500'
                      if (d < 0) return 'text-red-400'
                      if (d <= 7) return 'text-amber-300'
                      if (d <= 30) return 'text-sky-300'
                      return 'text-slate-400'
                    })()}`}
                  >
                    {(() => {
                      const d = daysUntilExpiry(s)
                      if (d == null) return '—'
                      if (d < 0) return `${Math.abs(d)}d ago`
                      if (d === 0) return 'Today'
                      return `${d}d`
                    })()}
                  </td>
                  <td className={`${saTd} space-y-1`}>
                    <button type="button" onClick={() => setSelectedSchool(s)} className="block text-sm text-amber-300 font-bold">
                      Contact / Subs
                    </button>
                    <button type="button" onClick={() => toggleSuspend(s)} className="block text-sm text-blue-400">
                      {s.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button type="button" onClick={() => setExpiry(s, 90)} className="block text-xs text-emerald-400">
                      +90 days
                    </button>
                    <button type="button" onClick={() => setExpiry(s, 365)} className="block text-xs text-emerald-400">
                      +1 year
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className={saTd} colSpan={6}>
                    No schools match
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Scroll>
      </div>

      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedSchool(null)} />
          <div className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-900 p-4">
              <div>
                <h2 className="text-lg font-black text-white">{selectedSchool.school_name}</h2>
                <p className="text-xs text-cyan-400 font-mono">
                  {selectedSchool.school_code} · {selectedSchool.plan || '—'} · exp{' '}
                  {selectedSchool.plan_expires_at ? new Date(selectedSchool.plan_expires_at).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-white text-sm font-bold" onClick={() => setSelectedSchool(null)}>
                Close
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black" onClick={downloadSchoolSubsCsv}>
                  Download subs CSV
                </button>
                <span className="text-xs text-slate-400 self-center">{schoolSubs.length} payment record(s)</span>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Principal / office contact</p>
                {principalContact ? (
                  <div className="space-y-1">
                    <p className="text-sm text-white font-bold">
                      {principalContact.full_name} · {principalContact.role}
                    </p>
                    <p className="text-xs text-slate-400">{principalContact.email || '—'} · {principalContact.phone || '—'}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {principalContact.email && (
                        <a
                          className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-black"
                          href={`mailto:${principalContact.email}?subject=${encodeURIComponent(
                            'ShuleMoja subscription — ' + (selectedSchool.school_name || '')
                          )}&body=${encodeURIComponent(
                            'Habari,\n\nYour ShuleMoja plan for ' +
                              (selectedSchool.school_name || '') +
                              ' expires on ' +
                              (selectedSchool.plan_expires_at
                                ? new Date(selectedSchool.plan_expires_at).toLocaleDateString('en-GB')
                                : '—') +
                              '.\n\nReply to renew or ask any question.\n\n— BigDataKE / ShuleMoja'
                          )}`}
                        >
                          Email
                        </a>
                      )}
                      {principalContact.phone &&
                        whatsappUrl(
                          principalContact.phone,
                          `Habari, ShuleMoja plan for ${selectedSchool.school_name || ''} expires on ${
                            selectedSchool.plan_expires_at
                              ? new Date(selectedSchool.plan_expires_at).toLocaleDateString('en-GB')
                              : '—'
                          }. — BigDataKE`
                        ) && (
                          <a
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-black"
                            href={whatsappUrl(
                              principalContact.phone,
                              `Habari, ShuleMoja plan for ${selectedSchool.school_name || ''} expires on ${
                                selectedSchool.plan_expires_at
                                  ? new Date(selectedSchool.plan_expires_at).toLocaleDateString('en-GB')
                                  : '—'
                              }. — BigDataKE`
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                        )}
                      {principalContact.phone &&
                        smsUrl(
                          principalContact.phone,
                          `ShuleMoja: plan for ${selectedSchool.school_name || ''} expires ${
                            selectedSchool.plan_expires_at
                              ? new Date(selectedSchool.plan_expires_at).toLocaleDateString('en-GB')
                              : '—'
                          }. BigDataKE`
                        ) && (
                          <a
                            className="px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-black"
                            href={smsUrl(
                              principalContact.phone,
                              `ShuleMoja: plan for ${selectedSchool.school_name || ''} expires ${
                                selectedSchool.plan_expires_at
                                  ? new Date(selectedSchool.plan_expires_at).toLocaleDateString('en-GB')
                                  : '—'
                              }. BigDataKE`
                            )}
                          >
                            SMS
                          </a>
                        )}
                      {principalContact.phone && (
                        <a className="px-3 py-1.5 rounded-lg bg-slate-600 text-white text-xs font-black" href={telUrl(principalContact.phone)}>
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No Principal/Secretary contact on file for this school.</p>
                )}
              </div>

              <Scroll dark>
                <table className="w-full sa-table">
                  <thead className="bg-slate-950">
                    <tr>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Date</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Status</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Amount</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolSubs.length === 0 && (
                      <tr>
                        <td colSpan={4} className={`${saTd} text-slate-500`}>
                          No subscription_events matched this school. STK rows need school_id or api_ref with school code.
                        </td>
                      </tr>
                    )}
                    {schoolSubs.map((e) => {
                      const meta = e.meta || e.payload || {}
                      return (
                        <tr key={e.id || e.created_at + (e.invoice_id || '')} className="border-t border-slate-700 bg-slate-900">
                          <td className={`${saTd} text-slate-300 text-xs`}>
                            {e.created_at ? new Date(e.created_at).toLocaleString('en-GB') : '—'}
                          </td>
                          <td
                            className={`${saTd} text-xs font-bold ${
                              String(e.status || meta.status).includes('fail') ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {e.status || meta.status || '—'}
                          </td>
                          <td className={`${saTd} text-white`}>KES {fmt(e.amount ?? meta.amount ?? 0)}</td>
                          <td className={`${saTd} text-cyan-400 text-xs font-mono`}>
                            {e.api_ref || e.invoice_id || meta.api_ref || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Scroll>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
