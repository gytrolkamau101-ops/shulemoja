import { useState } from 'react'
import { PageTitle } from '../ui'
import Exams from './Exams'
import ReportCards from './ReportCards'

const TABS = [
  { id: 'exams', label: 'Exams' },
  { id: 'reports', label: 'Report cards' },
]

const chip = (on) =>
  `px-3 py-1.5 rounded-xl text-xs font-black border shrink-0 transition ${
    on
      ? 'bg-gradient-to-b from-sky-400 to-blue-700 text-white border-sky-300 shadow-[0_3px_0_#1e3a8a,0_0_16px_rgba(56,189,248,0.5)]'
      : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
  }`

export default function ReportsHub(props) {
  const [tab, setTab] = useState('exams')
  return (
    <div className="space-y-4">
      <PageTitle title="Examinations" subtitle="Exams · report cards" />
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={chip(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
        {tab === 'exams' && <Exams {...props} />}
        {tab === 'reports' && <ReportCards {...props} />}
      </div>
    </div>
  )
}
