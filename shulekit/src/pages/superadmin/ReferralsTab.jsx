import { Scroll } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'


export default function ReferralsTab({ schools }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-100">
        <p className="font-bold text-white mb-1">Referral ledger</p>
        <p className="text-slate-300">
          Mandatory code at school registration. Premium inviters earn 100 progress per paid invite; at 300 → free Premium term
          (max 2). Max 6 invites lifetime. System code GGGGG is internal only.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
        <Scroll dark>
          <table className="w-full sa-table">
            <thead className="bg-slate-950">
              <tr>
                <th className={saTh}>School</th>
                <th className={saTh}>Code</th>
                <th className={saTh}>Credits</th>
                <th className={saTh}>Invites</th>
                <th className={saTh}>Free Premia</th>
                <th className={saTh}>Referred by</th>
                <th className={saTh}>Plan</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t border-slate-700 bg-slate-900">
                  <td className={`${saTd} text-slate-50 font-semibold`}>{s.school_name || "—"}</td>
                  <td className={saTd}>
                    <code className="text-cyan-400">{s.referral_code || '—'}</code>
                  </td>
                  <td className={saTd}>{s.referral_credits ?? 0}</td>
                  <td className={saTd}>{s.lifetime_invite_count ?? 0}/6</td>
                  <td className={saTd}>{s.free_premium_grants ?? 0}/2</td>
                  <td className={saTd}>{s.referred_by_code || '—'}</td>
                  <td className={saTd}>{s.plan || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </div>
    </div>
  )
}
