import { fmt, Scroll } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'

export default function PaymentsTab({ filteredPays, payFilter, setPayFilter, schoolName, stats, reload }) {
  const payStatusBadge = (state) => {
    const s = (state || '').toUpperCase()
    if (['COMPLETE', 'COMPLETED', 'PAID'].includes(s))
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    if (['FAILED', 'CANCELED', 'CANCELLED'].includes(s))
      return 'bg-red-500/20 text-red-300 border-red-500/40'
    return 'bg-amber-500/20 text-amber-200 border-amber-500/40'
  }
  return (
    <>

          <div className="space-y-4 text-slate-100">
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                    payFilter === f.id
                      ? 'bg-cyan-600 border-cyan-400 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button type="button" className="ml-auto text-sm text-cyan-400 font-semibold" onClick={() => reload?.()}>
                Refresh
              </button>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="p-4 font-bold border-b border-slate-800 flex justify-between">
                <span>Payment log</span>
                <span className="text-xs font-normal text-slate-400">{filteredPays.length} shown · latest 300</span>
              </div>
              <Scroll>
                <table className="w-full sa-table">
                  <thead className="bg-slate-950">
                    <tr>
                      <th className={`${saTh} bg-transparent text-slate-400`}>When</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Status</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Amount</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Kind / Plan</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>School</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Ref / Invoice</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Phone</th>
                      <th className={`${saTh} bg-transparent text-slate-400`}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPays.length === 0 && (
                      <tr>
                        <td colSpan={8} className={`${saTd} text-slate-500 text-center py-8`}>
                          No payment events yet. STK attempts and IntaSend webhooks appear here.
                        </td>
                      </tr>
                    )}
                    {filteredPays.map((e) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            </div>
            <p className="text-xs text-slate-500">
              Successful = COMPLETE/PAID from IntaSend webhook. Failed = STK or payment failure. Pending = STK sent or processing.
            </p>
          </div>
    </>
  )
}
