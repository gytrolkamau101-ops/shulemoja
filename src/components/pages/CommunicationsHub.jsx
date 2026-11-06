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

const chip = (on) =>
  on
    ? 'px-3 py-1.5 rounded-lg text-xs font-black border bg-amber-400 text-amber-950 border-amber-300 shadow'
    : 'px-3 py-1.5 rounded-lg text-xs font-black border bg-sky-600 text-white border-sky-500 hover:bg-sky-500'

export default function CommunicationsHub(props) {
  const [tab, setTab] = useState('messages')
  return (
    <div className="space-y-4">
      <PageTitle title="Communications" subtitle="Messages · circulars · parent letters" />
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={chip(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
        {tab === 'messages' && <Messaging {...props} />}
        {tab === 'circulars' && <Circulars {...props} />}
        {tab === 'letters' && <ParentNotices {...props} />}
      </div>
    </div>
  )
}
