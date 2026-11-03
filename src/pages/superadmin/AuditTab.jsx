import { Scroll } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'


export default function AuditTabSa({ events }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="p-4 font-bold border-b border-slate-800 text-white">Audit (latest 100)</div>
      <Scroll>
        <table className="w-full sa-table">
          <thead className="bg-slate-950">
            <tr>
              <th className={`${saTh} bg-transparent text-slate-400`}>When</th>
              <th className={`${saTh} bg-transparent text-slate-400`}>Actor</th>
              <th className={`${saTh} bg-transparent text-slate-400`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-slate-700 bg-slate-900">
                <td className={`${saTd} text-xs text-slate-400`}>{new Date(e.created_at).toLocaleString('en-GB')}</td>
                <td className={saTd}><span className="text-slate-100">{e.actor_email || "—"}</span></td>
                <td className={`${saTd} text-cyan-300`}><span className="text-cyan-300 font-medium">{e.action}</span></td>
              </tr>
            ))}
            {!events.length && (
              <tr>
                <td className={saTd} colSpan={3}>
                  No audit rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Scroll>
    </div>
  )
}
