import { useMemo, useState, useEffect } from 'react'
import { PageTitle } from '../ui'
import { canAccessSetup, isLeadership } from '../../lib/roles'
import { planEntitlements, FREE_SETUP_TABS } from '../../lib/plans'
import SchoolIdentityTab from './setup/SchoolIdentityTab'
import TermsTab from './setup/TermsTab'
import GradesSubjectsTab from './setup/GradesSubjectsTab'
import ClassSubjectsTab from './setup/ClassSubjectsTab'
import BasketsTab from './setup/BasketsTab'
import GradingTab from './setup/GradingTab'
import FeeStructureTab from './setup/FeeStructureTab'
import FeeHeadsTab from './setup/FeeHeadsTab'
import CalendarTab from './setup/CalendarTab'
import PaymentSettingsTab from './setup/PaymentSettingsTab'
import PromotionTab from './setup/PromotionTab'
import StaffTab from './setup/StaffTab'
import ParentsTab from './setup/ParentsTab'
import AuditTab from './setup/AuditTab'

const ALL_TABS = [
  { id: 'School identity', group: 'School' },
  { id: 'Terms', group: 'School' },
  { id: 'Calendar', group: 'School' },
  { id: 'Grades & Subjects', group: 'Academic' },
  { id: 'Class subjects', group: 'Academic' },
  { id: 'Baskets', group: 'Academic' },
  { id: 'Grading', group: 'Academic' },
  { id: 'Fee Structure', group: 'Finance' },
  { id: 'Fee heads', group: 'Finance' },
  { id: 'Payments', group: 'Finance' },
  { id: 'Staff', group: 'People' },
  { id: 'Parents', group: 'People' },
  { id: 'Promotion', group: 'People' },
  { id: 'Audit', group: 'System' },
]

export default function Setup({ school, term, user, onTermChange }) {
  const role = user?.role
  const ent = planEntitlements(school || {})

  const tabs = useMemo(() => {
    let list = ALL_TABS.filter((t) => {
      if (t.id === 'Audit' || t.id === 'Staff' || t.id === 'Promotion') {
        return isLeadership(role) || role === 'Secretary'
      }
      if (t.id === 'Payments' || t.id === 'Fee Structure' || t.id === 'Fee heads') {
        return isLeadership(role) || role === 'Secretary'
      }
      return canAccessSetup(role)
    })
    if (ent.planId === 'free' || ent.readOnly) {
      list = list.filter((t) => FREE_SETUP_TABS.includes(t.id))
    }
    return list
  }, [role, ent.planId, ent.readOnly])

  const [tab, setTab] = useState(() => tabs[0]?.id || 'School identity')

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === tab)) setTab(tabs[0].id)
  }, [tabs, tab])

  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id || 'School identity'
  const activeMeta = ALL_TABS.find((t) => t.id === active)

  if (!canAccessSetup(role)) {
    return (
      <div className="space-y-4">
        <PageTitle title="School setup" />
        <p className="text-sm text-slate-600">Your role cannot open Setup.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageTitle title="School setup" subtitle="Identity · classes · fees · staff · term tools" />

      {(ent.planId === 'free' || ent.readOnly) && (
        <p className="text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Free plan: School identity, Terms, and Grades/Subjects only.
        </p>
      )}

      {/* Classic single tabular strip (spreadsheet / admin product style) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-stretch overflow-x-auto border-b border-slate-200 bg-slate-50">
          {tabs.map((t) => {
            const on = active === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap border-r border-slate-200/80 transition ${
                  on
                    ? 'bg-white text-blue-700 after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:bg-blue-600'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                {t.id}
              </button>
            )
          })}
        </div>

        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {activeMeta?.group || 'Setup'} · {active}
          </p>
          <p className="text-[11px] text-slate-400 hidden sm:block">{tabs.length} sections</p>
        </div>

        <div className="p-4 sm:p-5 min-h-[16rem] bg-white">
          {active === 'School identity' && <SchoolIdentityTab school={school} user={user} />}
          {active === 'Terms' && <TermsTab school={school} term={term} onTermChange={onTermChange} />}
          {active === 'Grades & Subjects' && <GradesSubjectsTab school={school} />}
          {active === 'Class subjects' && <ClassSubjectsTab school={school} term={term} />}
          {active === 'Baskets' && <BasketsTab school={school} />}
          {active === 'Grading' && <GradingTab school={school} />}
          {active === 'Fee Structure' && <FeeStructureTab school={school} term={term} />}
          {active === 'Fee heads' && <FeeHeadsTab school={school} />}
          {active === 'Calendar' && <CalendarTab school={school} />}
          {active === 'Payments' && <PaymentSettingsTab school={school} />}
          {active === 'Staff' && <StaffTab school={school} user={user} />}
          {active === 'Parents' && <ParentsTab school={school} user={user} />}
          {active === 'Promotion' && <PromotionTab school={school} term={term} user={user} />}
          {active === 'Audit' && <AuditTab school={school} />}
        </div>
      </div>
    </div>
  )
}
