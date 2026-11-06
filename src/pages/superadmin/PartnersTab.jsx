import { useMemo } from 'react'
import { Scroll, fmt, btn, btnGreen, toast } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'


function payoutStatusBadge(status) {
  const s = status || ''
  if (s === 'paid') return 'bg-emerald-500/20 text-emerald-300'
  if (s === 'approved') return 'bg-sky-500/20 text-sky-300'
  if (s === 'rejected') return 'bg-red-500/20 text-red-300'
  return 'bg-amber-500/20 text-amber-200'
}

export default function PartnersTab({
  partners,
  partnerEvents,
  schools,
  partnerConfig,
  setPartnerConfig,
  savingPartnerConfig,
  savePartnerConfig,
  newPartnerName,
  setNewPartnerName,
  newPartnerPhone,
  setNewPartnerPhone,
  newPartnerEmail,
  setNewPartnerEmail,
  creatingPartner,
  createPartner,
  togglePartnerStatus,
  setPayoutStatus,
  payoutFilter,
  setPayoutFilter,
}) {
  const partnerName = (id) => partners.find((p) => p.id === id)?.full_name || String(id || '').slice(0, 8) + '…'
  const schoolName = (id) => {
    if (!id) return '—'
    const s = schools.find((x) => x.id === id)
    return s?.school_name || String(id).slice(0, 8) + '…'
  }

  const partnerStats = useMemo(() => {
    const liability = partnerEvents
      .filter((e) => e.status === 'pending_approval' || e.status === 'approved')
      .reduce((s, e) => s + Number(e.amount || 0), 0)
    const paidLifetime = partnerEvents.filter((e) => e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0)
    const pendingCount = partnerEvents.filter((e) => e.status === 'pending_approval').length
    return { liability, paidLifetime, pendingCount }
  }, [partnerEvents])

  const filteredPayoutEvents = useMemo(() => {
    if (payoutFilter === 'all') return partnerEvents
    return partnerEvents.filter((e) => e.status === payoutFilter)
  }, [partnerEvents, payoutFilter])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-300">
        <p className="font-bold text-white mb-1">Partner cash referral program</p>
        <p>
          Individuals (secretaries, sales agents) who refer new schools and earn real KSh — paid manually via M-Pesa after
          admin approval here. Separate from the free-Premium school-to-school referrals above.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
          <p className="text-xs font-semibold text-white/85 uppercase">Pending payout liability</p>
          <p className="text-2xl font-black mt-1">KSh {fmt(partnerStats.liability)}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
          <p className="text-xs font-semibold text-white/85 uppercase">Paid out lifetime</p>
          <p className="text-2xl font-black mt-1">KSh {fmt(partnerStats.paidLifetime)}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
          <p className="text-xs font-semibold text-white/85 uppercase">Awaiting approval</p>
          <p className="text-2xl font-black mt-1">{partnerStats.pendingCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <p className="font-bold text-white">Payout rates (editable, no deploy needed)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-xs font-bold text-slate-400 space-y-1 block">
            Basic bonus (KSh)
            <input
              type="number"
              className={saField}
              style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
              value={partnerConfig.bonus_basic}
              onChange={(e) => setPartnerConfig((c) => ({ ...c, bonus_basic: e.target.value }))}
            />
          </label>
          <label className="text-xs font-bold text-slate-400 space-y-1 block">
            Premium bonus (KSh)
            <input
              type="number"
              className={saField}
              style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
              value={partnerConfig.bonus_premium}
              onChange={(e) => setPartnerConfig((c) => ({ ...c, bonus_premium: e.target.value }))}
            />
          </label>
          <label className="text-xs font-bold text-slate-400 space-y-1 block">
            Pro bonus (KSh)
            <input
              type="number"
              className={saField}
              style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
              value={partnerConfig.bonus_pro}
              onChange={(e) => setPartnerConfig((c) => ({ ...c, bonus_pro: e.target.value }))}
            />
          </label>
          <label className="text-xs font-bold text-slate-400 space-y-1 block">
            Lifetime commission %
            <input
              type="number"
              step="0.1"
              className={saField}
              style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
              value={partnerConfig.commission_pct}
              onChange={(e) => setPartnerConfig((c) => ({ ...c, commission_pct: e.target.value }))}
            />
          </label>
        </div>
        <button type="button" disabled={savingPartnerConfig} onClick={savePartnerConfig} className={btnGreen}>
          {savingPartnerConfig ? 'Saving…' : 'Save rates'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <p className="font-bold text-white">Add a partner</p>
        <form onSubmit={createPartner} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className={saField}
            style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
            placeholder="Full name"
            value={newPartnerName}
            onChange={(e) => setNewPartnerName(e.target.value)}
          />
          <input
            className={saField}
            style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
            placeholder="Phone (M-Pesa number)"
            value={newPartnerPhone}
            onChange={(e) => setNewPartnerPhone(e.target.value)}
          />
          <input
            className={saField}
            style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
            placeholder="Email (optional)"
            value={newPartnerEmail}
            onChange={(e) => setNewPartnerEmail(e.target.value)}
          />
          <button type="submit" disabled={creatingPartner} className={btn}>
            {creatingPartner ? 'Adding…' : 'Add partner'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="p-4 font-bold border-b border-slate-800 text-white">Partners ({partners.length})</div>
        <Scroll dark>
          <table className="w-full sa-table">
            <thead className="bg-slate-950">
              <tr>
                <th className={`${saTh} bg-transparent text-slate-400`}>Name</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Phone</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Code</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Status</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Share link</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className={`${saTd} text-white font-medium`}>{p.full_name}</td>
                  <td className={`${saTd} text-slate-300`}>{p.phone}</td>
                  <td className={`${saTd} text-cyan-400 font-mono text-xs`}>{p.referral_code}</td>
                  <td className={saTd}>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        p.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className={`${saTd} text-xs text-slate-400`}>
                    <button
                      type="button"
                      className="text-blue-400 font-bold"
                      onClick={() => {
                        const link = `${window.location.origin}/partner/${p.referral_code}`
                        navigator.clipboard?.writeText(link)
                        toast('Partner link copied', 'ok')
                      }}
                    >
                      Copy link
                    </button>
                  </td>
                  <td className={saTd}>
                    <button type="button" onClick={() => togglePartnerStatus(p)} className="text-sm text-blue-400">
                      {p.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
              {!partners.length && (
                <tr>
                  <td className={saTd} colSpan={6}>
                    No partners yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Scroll>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap gap-2 items-center justify-between">
          <p className="font-bold text-white">Payout events</p>
          <select
            className={saField + ' max-w-[12rem]'}
            style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
            value={payoutFilter}
            onChange={(e) => setPayoutFilter(e.target.value)}
          >
            <option value="pending_approval" className="bg-slate-900 text-white">Pending approval</option>
            <option value="approved" className="bg-slate-900 text-white">Approved</option>
            <option value="paid" className="bg-slate-900 text-white">Paid</option>
            <option value="rejected" className="bg-slate-900 text-white">Rejected</option>
            <option value="all" className="bg-slate-900 text-white">All</option>
          </select>
        </div>
        <Scroll dark>
          <table className="w-full sa-table">
            <thead className="bg-slate-950">
              <tr>
                <th className={`${saTh} bg-transparent text-slate-400`}>When</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Partner</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>School</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Type</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Amount</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Status</th>
                <th className={`${saTh} bg-transparent text-slate-400`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayoutEvents.map((ev) => (
                <tr key={ev.id} className="border-t border-slate-800">
                  <td className={`${saTd} text-xs text-slate-400`}>{new Date(ev.created_at).toLocaleString('en-GB')}</td>
                  <td className={`${saTd} text-white`}>{partnerName(ev.partner_id)}</td>
                  <td className={`${saTd} text-slate-300`}>{schoolName(ev.school_id)}</td>
                  <td className={`${saTd} capitalize text-slate-300`}>{String(ev.type || '').replace('_', ' ')}</td>
                  <td className={`${saTd} text-emerald-300 font-bold`}>KSh {fmt(ev.amount)}</td>
                  <td className={saTd}>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${payoutStatusBadge(ev.status)}`}>
                      {String(ev.status || '').replace('_', ' ')}
                    </span>
                    {ev.status === 'paid' && ev.paid_reference && (
                      <div className="text-[10px] text-slate-500 mt-1">Ref: {ev.paid_reference}</div>
                    )}
                  </td>
                  <td className={`${saTd} space-x-2 whitespace-nowrap`}>
                    {ev.status === 'pending_approval' && (
                      <>
                        <button type="button" className="text-emerald-400 font-bold text-xs" onClick={() => setPayoutStatus(ev, 'approved')}>
                          Approve
                        </button>
                        <button type="button" className="text-red-400 font-bold text-xs" onClick={() => setPayoutStatus(ev, 'rejected')}>
                          Reject
                        </button>
                      </>
                    )}
                    {ev.status === 'approved' && (
                      <button type="button" className="text-blue-400 font-bold text-xs" onClick={() => setPayoutStatus(ev, 'paid')}>
                        Mark as paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayoutEvents.length === 0 && (
                <tr>
                  <td className={saTd} colSpan={7}>
                    No payout events in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Scroll>
      </div>
    </div>
  )
}
