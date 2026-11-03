import { useState } from 'react'
import { PageTitle } from '../ui'
import Circulars from './Circulars'
import Messaging from './Messaging'
import ParentNotices from './ParentNotices'

const TABS = [
  { id: 'messages', label: 'Messages' },
  { id: 'circulars', label: 'Circulars' },
  { id: 'letters', label: 'Parent letters' },
]

export default function CommunicationsHub(props) {
  const [tab, setTab] = useState('messages')
  return (
    <div className="space-y-4">
      <PageTitle title="Communications" subtitle="Messages · circulars · parent letters" />
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
          {tab === 'messages' && <Messaging {...props} />}
          {tab === 'circulars' && <Circulars {...props} />}
          {tab === 'letters' && <ParentNotices {...props} />}
        </div>
      </div>
    </div>
  )
}
