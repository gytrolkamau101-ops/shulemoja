import { useState } from 'react'
import { PageTitle } from '../ui'
import Exams from './Exams'
import ReportCards from './ReportCards'

const TABS = [
  { id: 'exams', label: 'Exams' },
  { id: 'cards', label: 'Report cards' },
]

export default function ReportsHub(props) {
  const [tab, setTab] = useState('exams')
  return (
    <div className="space-y-4">
      <PageTitle title="Academic reports" subtitle="Exams · report cards" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-r border-slate-200/80 ${
                tab === t.id ? 'bg-white text-blue-700 border-b-2 border-b-blue-600 -mb-px' : 'text-slate-600 hover:bg-white/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-5">
          {tab === 'exams' && <Exams {...props} />}
          {tab === 'cards' && <ReportCards {...props} />}
        </div>
      </div>
    </div>
  )
}
