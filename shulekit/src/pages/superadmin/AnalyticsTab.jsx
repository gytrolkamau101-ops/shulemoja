import { useMemo } from 'react'
import { Scroll } from '../../components/ui'
import { saTd, saTh } from './saStyles'

/** Daily interaction / payment analytics per school for Super Admin */
export default function AnalyticsTab({ schools = [], pays = [], audit = [] }) {
  const bySchool = useMemo(() => {
    const map = {}
    ;(schools || []).forEach((s) => {
      map[s.id] = {
        id: s.id,
        name: s.school_name || s.school_code || s.id,
        plan: s.plan || 'free',
        pays: 0,
        payOk: 0,
        payFail: 0,
        payPending: 0,
        volume: 0,
        audit: 0,
        lastPay: null,
        lastAudit: null,
      }
    })
    ;(pays || []).forEach((p) => {
      const row = map[p.school_id]
      if (!row) return
      row.pays += 1
      const st = (p.state || '').toUpperCase()
      if (['COMPLETE', 'COMPLETED', 'PAID'].includes(st)) {
        row.payOk += 1
        row.volume += Number(p.amount) || 0
      } else if (['FAILED', 'CANCELED', 'CANCELLED'].includes(st)) row.payFail += 1
      else row.payPending += 1
      if (!row.lastPay || (p.created_at && p.created_at > row.lastPay)) row.lastPay = p.created_at
    })
    ;(audit || []).forEach((a) => {
      const sid = a.school_id
      if (!sid || !map[sid]) return
      map[sid].audit += 1
      if (!map[sid].lastAudit || (a.created_at && a.created_at > map[sid].lastAudit)) map[sid].lastAudit = a.created_at
    })
    return Object.values(map).sort((a, b) => b.pays + b.audit - (a.pays + a.audit))
  }, [schools, pays, audit])

  const today = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const iso = start.toISOString()
    const dayPays = (pays || []).filter((p) => p.created_at && p.created_at >= iso)
    const dayAudit = (audit || []).filter((a) => a.created_at && a.created_at >= iso)
    return {
      pays: dayPays.length,
      ok: dayPays.filter((p) => ['COMPLETE', 'COMPLETED', 'PAID'].includes((p.state || '').toUpperCase())).length,
      fail: dayPays.filter((p) => ['FAILED', 'CANCELED', 'CANCELLED'].includes((p.state || '').toUpperCase())).length,
      audit: dayAudit.length,
      volume: dayPays
        .filter((p) => ['COMPLETE', 'COMPLETED', 'PAID'].includes((p.state || '').toUpperCase()))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0),
    }
  }, [pays, audit])

  return (
    <div className="space-y-4 text-slate-100">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          ['STK today', today.pays],
          ['Paid today', today.ok],
          ['Failed today', today.fail],
          ['Audit events today', today.audit],
          ['Volume today', `KES ${today.volume.toLocaleString()}`],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl border border-slate-600 bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
            <p className="text-lg font-black text-sky-200">{val}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Per-school activity (payments + audit log). Use this to see which schools you touched today and payment health.</p>
      <div className="rounded-xl border border-slate-600 bg-slate-900 overflow-hidden">
        <Scroll dark>
          <table className="w-full text-sm text-slate-100 bg-slate-900">
            <thead>
              <tr>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>School</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Plan</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Pays</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>OK</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Fail</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Pending</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Volume</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Audit</th>
                <th className={`${saTh} bg-slate-800 text-slate-200`}>Last pay</th>
              </tr>
            </thead>
            <tbody>
              {bySchool.map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className={`${saTd} text-slate-50 font-semibold`}>{r.name}</td>
                  <td className={`${saTd} text-xs uppercase text-slate-400`}>{r.plan}</td>
                  <td className={saTd}>{r.pays}</td>
                  <td className={`${saTd} text-emerald-300`}>{r.payOk}</td>
                  <td className={`${saTd} text-red-300`}>{r.payFail}</td>
                  <td className={`${saTd} text-amber-200`}>{r.payPending}</td>
                  <td className={`${saTd} font-mono text-xs`}>KES {r.volume.toLocaleString()}</td>
                  <td className={saTd}>{r.audit}</td>
                  <td className={`${saTd} text-xs text-slate-500`}>
                    {r.lastPay ? new Date(r.lastPay).toLocaleString('en-GB') : '—'}
                  </td>
                </tr>
              ))}
              {!bySchool.length && (
                <tr>
                  <td colSpan={9} className={`${saTd} text-center text-slate-500 py-6`}>
                    No schools loaded
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
