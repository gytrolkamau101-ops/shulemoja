import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { fmt, Scroll } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'

export default function PaymentsTab({ filteredPays, payFilter, setPayFilter, schoolName, stats, reload }) {
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')

  const payStatusBadge = (state) => {
    const s = (state || '').toUpperCase()
    if (['COMPLETE', 'COMPLETED', 'PAID'].includes(s))
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    if (['FAILED', 'CANCELED', 'CANCELLED'].includes(s))
      return 'bg-red-500/20 text-red-300 border-red-500/40'
    return 'bg-amber-500/20 text-amber-200 border-amber-500/40'
  }

  const markState = async (id, state) => {
    if (!id) return
    const label = state === 'FAILED' ? 'failed' : state === 'CANCELLED' ? 'cancelled' : state
    if (!confirm(`Mark this STK / payment as ${label}?`)) return
    setBusy(id)
    setMsg('')
    const { error } = await supabase
      .from('subscription_events')
      .update({
        state,
        error_message: state === 'FAILED' ? 'Marked failed by Super Admin' : state === 'CANCELLED' ? 'Cancelled by Super Admin' : null,
      })
      .eq('id', id)
    setBusy(null)
    if (error) setMsg(error.message)
    else {
      setMsg(`Updated to ${state}`)
      reload?.()
    }
  }

  return (
    <div className="space-y-4 text-slate-100">
      {msg && <p className="text-xs text-sky-300">{msg}</p>}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <p className="text-2xl font-black text-emerald-300">{stats.payOk}</p>
          <p className="text-xs text-emerald-200/80">Successful</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-2xl font-black text-red-300">{stats.payFail}</p>
          <p className="text-xs text-red-200/80">Failed</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
          <p className="text-2xl font-black text-amber-200">{stats.payPending}</p>
          <p className="text-xs text-amber-100/80">Pending / STK</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'success', label: 'Successful' },
          { id: 'failed', label: 'Failed' },
          { id: 'pending', label: 'Pending' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setPayFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              payFilter === f.id ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-600 bg-slate-900 overflow-hidden">
        <Scroll dark>
          <table className="w-full text-sm text-slate-100 bg-slate-900">
            <thead>
              <tr>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>When</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Status</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Amount</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Kind</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>School</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Ref</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Phone</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Error</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPays.length === 0 && (
                <tr>
                  <td colSpan={9} className={`${saTd} text-slate-500 text-center py-8`}>
                    No payment events yet. STK attempts and IntaSend webhooks appear here.
                  </td>
                </tr>
              )}
              {filteredPays.map((e) => {
                const st = (e.state || '').toUpperCase()
                const pending = !['COMPLETE', 'COMPLETED', 'PAID', 'FAILED', 'CANCELED', 'CANCELLED'].includes(st)
                return (
                  <tr key={e.id} className="border-t border-slate-800 align-top">
                    <td className={`${saTd} text-xs text-slate-400 whitespace-nowrap`}>
                      {e.created_at ? new Date(e.created_at).toLocaleString('en-GB') : '—'}
                    </td>
                    <td className={saTd}>
                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${payStatusBadge(e.state)}`}>
                        {e.state || '—'}
                      </span>
                    </td>
                    <td className={`${saTd} font-mono text-slate-200`}>
                      {e.amount != null ? `KES ${Number(e.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className={`${saTd} text-xs text-slate-300`}>
                      {e.kind || '—'}
                      {e.plan_id ? ` · ${e.plan_id}` : ''}
                    </td>
                    <td className={`${saTd} text-xs text-slate-300`}>{schoolName(e.school_id)}</td>
                    <td className={`${saTd} text-[10px] font-mono text-slate-500 max-w-[140px] break-all`}>
                      {e.invoice_id || e.api_ref || '—'}
                    </td>
                    <td className={`${saTd} text-xs text-slate-400`}>{e.phone_masked || '—'}</td>
                    <td className={`${saTd} text-xs text-red-300 max-w-[160px]`}>{e.error_message || '—'}</td>
                    <td className={`${saTd} text-xs space-y-1`}>
                      {pending && (
                        <>
                          <button
                            type="button"
                            disabled={busy === e.id}
                            className="block w-full px-2 py-1 rounded bg-red-900/50 border border-red-500/40 text-red-200 font-bold"
                            onClick={() => markState(e.id, 'FAILED')}
                          >
                            Mark failed
                          </button>
                          <button
                            type="button"
                            disabled={busy === e.id}
                            className="block w-full px-2 py-1 rounded bg-slate-700 border border-slate-500 text-slate-200 font-bold"
                            onClick={() => markState(e.id, 'CANCELLED')}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Scroll>
      </div>
      <p className="text-xs text-slate-500">
        Successful = COMPLETE/PAID from IntaSend webhook. Use Mark failed / Cancel when STK never completed (timeout, wrong PIN, abandoned).
      </p>
    </div>
  )
}
