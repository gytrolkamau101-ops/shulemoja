/** Role-based access — Kenyan school ops (v55.1) */

export const ALL_STAFF = [
  'Principal',
  'Deputy Principal',
  'Senior Teacher',
  'Secretary',
  'Teacher',
  'Matron',
  'Driver',
  'Kitchen',
  'Watchman',
  'BOM',
  'Staff',
]

export const ADMIN = ['Principal', 'Deputy Principal', 'Senior Teacher']
export const LEADERSHIP = ['Principal', 'Deputy Principal']
/** Who can create/edit/delete learners, admissions, enrollments */
export const DATA_EDITORS = ['Principal', 'Deputy Principal', 'Secretary']
export const FINANCE_ROLES = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary']
export const FINANCE_EDITORS = ['Principal', 'Deputy Principal', 'Secretary']
export const EXAM_ROLES = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary']
export const EXAM_EDITORS = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary']
export const ATTENDANCE_ROLES = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary']
export const RESOURCE_EDITORS = ['Principal', 'Deputy Principal', 'Secretary']
export const SETUP_ROLES = ['Principal', 'Deputy Principal', 'Secretary']
export const MESSAGE_ROLES = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary']
export const BOARDING_ROLES = ['Principal', 'Deputy Principal', 'Secretary', 'Matron']
export const TRANSPORT_ROLES = ['Principal', 'Deputy Principal', 'Secretary', 'Driver']
export const BOM_ROLES = ['Principal', 'Deputy Principal', 'Secretary', 'BOM']
export const DESK_ROLES = ['Kitchen', 'Watchman', 'Staff', 'Driver']
/** Matron: boarding-focused (not pure desk-only) */
export const BOARDING_DESK_ROLES = ['Matron']

/**
 * Menu / page visibility by role.
 * Teachers see a short list; Principal/Secretary see ops modules.
 */
const PAGE_ROLES = {
  dashboard: ALL_STAFF,
  students: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher'],
  admissions: ['Principal', 'Deputy Principal', 'Secretary'],
  finance: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'],
  'reports-hub': ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary'],
  exams: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary'],
  reports: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary'],
  'school-finance': ['Principal', 'Deputy Principal', 'Secretary'],
  resources: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher'],
  library: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher', 'Librarian'],
  setup: ['Principal', 'Deputy Principal', 'Secretary'],
  'comms-hub': ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'],
  messages: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'],
  'parent-notices': ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'],
  attendance: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary'],
  circulars: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher'],
  timetable: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher'],
  import: ['Principal', 'Deputy Principal', 'Secretary'],
  support: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'],
  referrals: ['Principal', 'Deputy Principal', 'Secretary'],
  records: ['Principal', 'Deputy Principal', 'Secretary'],
  boarding: ['Principal', 'Deputy Principal', 'Secretary', 'Matron'],
  transport: ['Principal', 'Deputy Principal', 'Secretary', 'Driver'],
  bom: ['Principal', 'Deputy Principal', 'Secretary', 'BOM'],
  'staff-desk': ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher', 'Matron', 'Driver', 'Kitchen', 'Watchman', 'Staff'],
  games: ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher'],
  capitation: ['Principal', 'Deputy Principal', 'Secretary'],
  'finance-analysis': ['Principal', 'Deputy Principal', 'Secretary'],
}

export function isAdmin(role) {
  return ADMIN.includes(role || '')
}
export function isLeadership(role) {
  return LEADERSHIP.includes(role || '')
}
export function canEditData(role) {
  return DATA_EDITORS.includes(role || '')
}
export function canEditFinance(role) {
  return FINANCE_EDITORS.includes(role || '')
}
export function canEditResources(role) {
  return RESOURCE_EDITORS.includes(role || '')
}
export function canManageExams(role) {
  return EXAM_EDITORS.includes(role || '')
}
export function canMarkAttendance(role) {
  return ATTENDANCE_ROLES.includes(role || '')
}
export function canAccessSetup(role) {
  return SETUP_ROLES.includes(role || '')
}
export function canSendSchoolMessages(role) {
  return MESSAGE_ROLES.includes(role || '')
}

/** Can this role open this sidebar page at all? */
export function canAccessPage(role, pageId) {
  const r = role || ''
  if (!r) return false
  // Matron: dashboard + boarding only (register as staff, role Matron, approved)
  if (r === 'Matron') {
    return pageId === 'boarding' || pageId === 'dashboard' || pageId === 'staff-desk'
  }
  // Other desk-only roles: staff-desk + dashboard
  if (DESK_ROLES.includes(r) && !['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary', 'Teacher'].includes(r)) {
    return pageId === 'staff-desk' || pageId === 'dashboard'
  }
  const allowed = PAGE_ROLES[pageId]
  if (!allowed) return isLeadership(r)
  return allowed.includes(r)
}

/** Write permission summary for UI */
export function roleCapabilities(role) {
  const r = role || ''
  return {
    role: r,
    editStudents: canEditData(r),
    editFees: canEditFinance(r),
    viewFees: FINANCE_ROLES.includes(r),
    editExams: canManageExams(r),
    editAttendance: canMarkAttendance(r),
    editSetup: canAccessSetup(r),
    editResources: canEditResources(r),
    schoolMessages: canSendSchoolMessages(r),
    admissions: canEditData(r),
  }
}
