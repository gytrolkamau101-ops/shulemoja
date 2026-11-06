import { useState } from 'react'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, th, td } from '../ui'
import { canEditData } from '../../lib/roles'
import { useRows } from '../../lib/useRows'

export default function BomPortal({ school, user }) {
  const canEdit = canEditData(user?.role) || ['Principal', 'Deputy Principal', 'BOM'].includes(user?.role)
  const { rows, error, insert, remove } = useRows('bom_minutes', school?.id)
  const [form, setForm] = useState({ meeting_date: '', title: '', decisions: '' })

  const save = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    if (await insert(form)) setForm({ meeting_date: '', title: '', decisions: '' })
  }

  return (
    <div className="space-y-4">
      <PageTitle title="BOM portal" subtitle="Board minutes" />
      <Alert kind="error">{error}</Alert>
      {canEdit && (
        <Card title="Add minutes">
          <form onSubmit={save} className="space-y-2">
            <input type="date" className={input} value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} required />
            <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className={input} rows={3} placeholder="Decisions" value={form.decisions} onChange={(e) => setForm({ ...form, decisions: e.target.value })} />
            <button className={btnGreen}>Save</button>
          </form>
        </Card>
      )}
      <Card className="!p-0">
        <Scroll>
          <table className="min-w-full text-sm">
            <thead><tr><th className={th}>Date</th><th className={th}>Title</th>{canEdit && <th className={th} />}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.meeting_date}</td>
                  <td className={td}>{r.title}<div className="text-xs text-slate-500 whitespace-pre-wrap">{r.decisions}</div></td>
                  {canEdit && <td className={td}><button type="button" className="text-red-600 text-xs font-bold" onClick={() => remove(r.id, 'minutes')}>Del</button></td>}
                </tr>
              ))}
              {!rows.length && <tr><td className={td} colSpan={3}>No minutes</td></tr>}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
