import { planEntitlements, canAccessModule, isPremium, isPro } from '../lib/plans'

/**
 * Blocks module UI when the school's plan does not include it.
 * Free plan still sees menu items (Lock); this is the page-level message.
 */
export default function PremiumGate({ school, moduleName, children }) {
  const e = planEntitlements(school || {})
  const ok = canAccessModule(school || {}, moduleName)

  if (ok) return children

  const planLabel = (e.planId || 'free').toUpperCase()
  const need = neededPlan(moduleName)
  const title = moduleNameLabel(moduleName)

  return (
    <div className="max-w-lg mx-auto mt-8 rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50 p-6 space-y-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Plan required</p>
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      <p className="text-sm text-slate-700">
        This feature needs <strong>{need}</strong>. Your school is on{' '}
        <strong>{planLabel}</strong>
        {e.expired ? ' (expired / free)' : ''}.
      </p>
      <p className="text-sm text-slate-600">
        {e.planId === 'free' || e.readOnly
          ? 'Upgrade from Login → Subscribe to unlock full access.'
          : 'Upgrade your plan from Login → Subscribe, or ask Super Admin to extend the trial.'}
      </p>
    </div>
  )
}

function neededPlan(id) {
  if (['library', 'finance-analysis', 'boarding', 'transport', 'staff-desk'].includes(id)) return 'Pro'
  if (
    [
      'messages',
      'parent-notices',
      'attendance',
      'timetable',
      'circulars',
      'import',
      'resources',
      'support',
      'referrals',
      'capitation',
    ].includes(id)
  ) {
    // capitation is Basic+ in matrix; show Basic if free
    if (id === 'capitation') return 'Basic or higher'
    return 'Premium or Pro'
  }
  if (['finance', 'exams', 'reports', 'school-finance'].includes(id)) return 'Basic or higher (not Free)'
  return 'a higher plan'
}

function moduleNameLabel(id) {
  const map = {
    messages: 'WhatsApp / SMS',
    attendance: 'Attendance',
    timetable: 'Timetable',
    circulars: 'Circulars',
    capitation: 'Capitation',
    'finance-analysis': 'Financial analysis',
    'parent-notices': 'Parent letters',
    parentLetters: 'Parent letters',
    import: 'Import centre',
    support: 'Contact Support',
    referrals: 'Invite · Earn',
    boarding: 'Boarding',
    transport: 'Transport',
    bom: 'BOM portal',
    records: 'Records vault',
    'staff-desk': 'Staff desk',
    games: 'Games',
    resources: 'Resources',
    library: 'Library',
    finance: 'Student fees',
    exams: 'Exams',
    reports: 'Report cards',
    'school-finance': 'School finance',
  }
  return map[id] || id
}
