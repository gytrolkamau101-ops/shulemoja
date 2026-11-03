/** Plan matrix — free is read-mostly; trial = Basic for 30 days then free. */

export const PREMIUM_MODULES = [
  'resources',
  'messages',
  'parent-notices',
  'attendance',
  'timetable',
  'circulars',
  'import',
  'support',
  'referrals',
  'records',
  'boarding',
  'transport',
  'bom',
  'staff-desk',
  'games',
  'capitation',
  'finance-analysis',
  'library',
]

export const NAV_HIDDEN_MODULES = ['games', 'bom', 'records']

/** Pages free schools may open (everything else blocked / upgrade). */
export const FREE_PAGES = [
  'dashboard',
  'students',
  'admissions',
  'setup',
  'support',
]

/** Setup tabs allowed on free (read-only enforced in UI where possible). */
export const FREE_SETUP_TABS = ['School identity', 'Terms', 'Grades & Subjects']

const CORE = {
  messages: false,
  attendance: false,
  timetable: false,
  circulars: false,
  parentLetters: false,
  import: false,
  boarding: false,
  transport: false,
  bom: false,
  records: false,
  staffDesk: false,
  games: false,
  parentPay: false,
  bulkMessaging: false,
  messageTemplates: false,
  notifyAbsent: false,
  feeHeads: false,
  defaulterBlast: false,
  prioritySupport: false,
  fullBranding: false,
  parentDownloads: false,
  reportWatermark: true,
  capitation: false,
  financeAnalysis: false,
  /** Free: view students/admissions/setup subset only; no fee/exam writes intended */
  readOnly: false,
}

const FREE_TIER = {
  ...CORE,
  readOnly: true,
  feeHeads: false,
  defaultCap: 80,
  staffCap: 5,
  parentCap: 40,
}

const BASIC_SUITE = {
  ...CORE,
  feeHeads: true,
  capitation: true,
  defaultCap: 200,
  staffCap: 25,
  parentCap: 150,
}

const PREMIUM_SUITE = {
  ...BASIC_SUITE,
  messages: true,
  attendance: true,
  timetable: true,
  circulars: true,
  parentLetters: true,
  import: true,
  records: true,
  parentPay: false, // platform does not collect school fees
  bulkMessaging: true,
  messageTemplates: true,
  notifyAbsent: true,
  defaulterBlast: true,
  prioritySupport: true,
  fullBranding: true,
  parentDownloads: true,
  reportWatermark: false,
  capitation: true,
  readOnly: false,
}

const PRO_SUITE = {
  ...PREMIUM_SUITE,
  boarding: true,
  transport: true,
  bom: true,
  staffDesk: true,
  games: true,
  financeAnalysis: true,
}

export const PLAN_FEATURES = {
  free: { ...FREE_TIER },
  /** Trial uses Basic capabilities for 30 days, then entitlements fall to free */
  trial: { ...BASIC_SUITE, prioritySupport: false, defaultCap: 200, staffCap: 25, parentCap: 150 },
  basic: { ...BASIC_SUITE },
  premium: { ...PREMIUM_SUITE, defaultCap: 500, staffCap: 50, parentCap: 350 },
  pro: { ...PRO_SUITE, defaultCap: 1000, staffCap: 80, parentCap: 800 },
  custom: { ...PRO_SUITE, defaultCap: 1000, staffCap: 80, parentCap: 800 },
  termly: { ...BASIC_SUITE },
  yearly: { ...PREMIUM_SUITE, defaultCap: 500, staffCap: 50, parentCap: 350 },
}

export function planEntitlements(school) {
  if (!school || typeof school !== 'object') {
    return { ...FREE_TIER, planId: 'free', expired: false, defaultCap: FREE_TIER.defaultCap }
  }
  let id = (school?.plan || 'basic').toLowerCase()
  let base = PLAN_FEATURES[id] || PLAN_FEATURES.basic
  const cap = school?.student_cap || base.defaultCap

  if (school?.plan_expires_at) {
    const exp = new Date(school.plan_expires_at).getTime()
    if (exp < Date.now()) {
      // Trial or any expired paid plan → free tier (read-mostly)
      return {
        ...PLAN_FEATURES.free,
        defaultCap: PLAN_FEATURES.free.defaultCap,
        expired: true,
        planId: 'free',
        wasPlan: id,
      }
    }
  }

  // Explicit free
  if (id === 'free') {
    return { ...PLAN_FEATURES.free, defaultCap: cap, expired: false, planId: 'free' }
  }

  return { ...base, defaultCap: cap, expired: false, planId: id }
}

export function isPremium(school) {
  const e = planEntitlements(school)
  if (e.expired || e.planId === 'free') return false
  const id = e.planId || ''
  return id === 'premium' || id === 'pro' || id === 'custom' || !!e.messages
}

export function canAccessModule(school, moduleId) {
  if (moduleId === 'comms-hub') {
    return canAccessModule(school, 'messages') || canAccessModule(school, 'circulars') || canAccessModule(school, 'parent-notices')
  }
  if (moduleId === 'reports-hub') {
    return canAccessModule(school, 'exams') || canAccessModule(school, 'reports')
  }
  if (NAV_HIDDEN_MODULES.includes(moduleId)) return false
  const e = planEntitlements(school)
  if (e.planId === 'free' || e.readOnly) {
    return FREE_PAGES.includes(moduleId)
  }
  // Pro-only
  if (moduleId === 'library' || moduleId === 'finance-analysis') {
    return isPro(school) || !!e.financeAnalysis || e.planId === 'pro' || e.planId === 'custom'
  }
  if (moduleId === 'capitation') return !!e.capitation && e.planId !== 'free' && !e.readOnly
  // Premium suite modules
  if (moduleId === 'resources') return isPremium(school)
  if (PREMIUM_MODULES.includes(moduleId)) {
    if (moduleId === 'messages') return !!e.messages
    if (moduleId === 'parent-notices') return !!(e.parentLetters || e.messages)
    if (moduleId === 'attendance') return !!e.attendance
    if (moduleId === 'timetable') return !!e.timetable
    if (moduleId === 'circulars') return !!e.circulars
    if (moduleId === 'import') return !!e.import
    if (moduleId === 'boarding') return !!e.boarding
    if (moduleId === 'transport') return !!e.transport
    if (moduleId === 'bom') return !!e.bom
    if (moduleId === 'staff-desk') return !!e.staffDesk
    if (moduleId === 'games') return !!e.games
    if (moduleId === 'support' || moduleId === 'referrals') return isPremium(school)
    return isPremium(school)
  }
  // Basic daily-work pages
  return true
}

export function isPro(school) {
  const e = planEntitlements(school)
  if (e.expired || e.planId === 'free') return false
  const id = e.planId || ''
  return id === 'pro' || id === 'custom' || !!e.financeAnalysis
}

/** Trial length for new schools (days). */
export const TRIAL_DAYS = 30

export const DEFAULT_PLANS = {
  currency: 'KES',
  billing: 'termly',
  plans: [
    {
      id: 'basic',
      name: 'Basic',
      price: 2000,
      period: 'per term',
      features: [
        '30-day free trial, then Free (limited) if unpaid',
        'Students, fees, exams & report cards',
        'Parent portal (balances & results)',
        'School setup',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 3500,
      period: 'per term',
      highlight: true,
      features: [
        'Up to 500 learners',
        'Attendance, timetable, messages, circulars, resources',
        'Government capitation ledger',
        'Import centre · parent downloads',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 5000,
      period: 'per term',
      features: [
        'Up to 1000 learners',
        'Everything in Premium',
        'Financial analysis & graphs · Library',
        'Boarding · transport · staff desk',
      ],
    },
  ],
}

export function isModuleInNav(moduleId) {
  return !NAV_HIDDEN_MODULES.includes(moduleId)
}

export function isPremiumOrPro(school) {
  return isPremium(school) || isPro(school)
}
