import { btn, btnGreen } from '../../components/ui'
import { saField, saFieldStyle } from './saStyles'

export default function PricingTab({ pricing, setPricing, savingCms, saveCms }) {
  const plans = pricing?.plans || []

  const updatePlanField = (idx, field, value) => {
    setPricing((p) => {
      const next = [...(p.plans || [])]
      const row = { ...next[idx] }
      if (field === 'price' || field === 'days') row[field] = Number(value)
      else if (field === 'features') row.features = value
      else row[field] = value
      next[idx] = row
      return { ...p, plans: next }
    })
  }

  const removePlan = (idx) => {
    if (!confirm('Delete this plan from the public pricing list?')) return
    setPricing((p) => ({
      ...p,
      plans: (p.plans || []).filter((_, i) => i !== idx),
    }))
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 text-slate-100">
      <div>
        <h2 className="text-xl font-black text-white">Public pricing plans</h2>
        <p className="text-sm text-slate-400 mt-1">Shown on the login page. Schools pay via IntaSend.</p>
      </div>

      {plans.map((plan, idx) => (
        <div key={plan.id || idx} className="space-y-2 border border-slate-700 rounded-xl p-3 bg-slate-950/60">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <input className={saField} style={saFieldStyle} value={plan.name || ''} onChange={(e) => updatePlanField(idx, 'name', e.target.value)} placeholder="Name" />
            <input className={saField} style={saFieldStyle} type="number" value={plan.price ?? 0} onChange={(e) => updatePlanField(idx, 'price', e.target.value)} placeholder="Price" />
            <input className={saField} style={saFieldStyle} value={plan.period || ''} onChange={(e) => updatePlanField(idx, 'period', e.target.value)} placeholder="per term" />
            <input className={saField} style={saFieldStyle} type="number" value={plan.days ?? 90} onChange={(e) => updatePlanField(idx, 'days', e.target.value)} placeholder="Days" />
            <input className={saField} style={saFieldStyle} value={plan.id || ''} onChange={(e) => updatePlanField(idx, 'id', e.target.value)} placeholder="id" />
          </div>
          <textarea
            className={`${saField} min-h-[72px]`}
            style={saFieldStyle}
            placeholder="Features (one per line)"
            value={(plan.features || []).join('\n')}
            onChange={(e) =>
              updatePlanField(
                idx,
                'features',
                e.target.value
                  .split('\n')
                  .map((x) => x.trim())
                  .filter(Boolean)
              )
            }
          />
          <div className="flex justify-end">
            <button type="button" onClick={() => removePlan(idx)} className="text-sm font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/40">
              Delete plan
            </button>
          </div>
        </div>
      ))}

      {!plans.length && <p className="text-sm text-slate-500">No plans yet. Add one below.</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          onClick={() =>
            setPricing((p) => ({
              ...p,
              plans: [...(p.plans || []), { id: `plan${Date.now()}`, name: 'New plan', price: 0, period: 'per term', days: 90, features: [] }],
            }))
          }
        >
          + Add plan
        </button>
        <button type="button" disabled={savingCms} className={btnGreen} onClick={() => saveCms('pricing', pricing || { plans: [] })}>
          {savingCms ? 'Saving…' : 'Save pricing'}
        </button>
      </div>
    </div>
  )
}
