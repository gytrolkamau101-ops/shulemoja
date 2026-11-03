import { payAdminBillStk } from '../../lib/intasend'
import { btn, toast } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'


export default function BillingTab({
  schools,
  billSchool,
  setBillSchool,
  billAmount,
  setBillAmount,
  billPhone,
  setBillPhone,
  billing,
  setBilling,
  setError,
  session,
  cfg,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 text-slate-100">
      <h2 className="text-xl font-black">Bill a school (IntaSend)</h2>
      <p className="text-xs font-mono text-cyan-400">
        {cfg.publicKey ? (cfg.live ? 'LIVE key' : 'SANDBOX key') : 'No VITE_INTASEND_PUBLIC_KEY'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select className={saField} style={saFieldStyle} value={billSchool} onChange={(e) => setBillSchool(e.target.value)}>
          <option value="" className="bg-slate-900 text-white">School to bill</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id} className="bg-slate-900 text-white">
              {s.school_name}
            </option>
          ))}
        </select>
        <input className={saField} style={saFieldStyle} type="number" min="1" placeholder="Amount KES" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} />
        <input className={saField} style={saFieldStyle} placeholder="M-Pesa 07… (STK)" value={billPhone} onChange={(e) => setBillPhone(e.target.value)} />
        <button
          type="button"
          disabled={billing}
          className={btn}
          onClick={async () => {
            if (!billSchool) return setError('Pick a school')
            if (!billPhone) return setError('Enter M-Pesa number for STK')
            setBilling(true)
            setError('')
            try {
              const r = await payAdminBillStk({
                schoolId: billSchool,
                amount: Number(billAmount) || 5000,
                phone: billPhone,
                planId: 'basic',
                email: session?.user?.email,
              })
              toast(r.message || 'STK sent — complete PIN on phone', 'ok')
            } catch (e) {
              setError(e?.message || 'Payment failed')
            }
            setBilling(false)
          }}
        >
          {billing ? 'Opening…' : 'Pay with IntaSend'}
        </button>
      </div>
    </div>
  )
}
