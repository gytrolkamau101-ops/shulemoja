import { useState } from 'react'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, th, td } from '../ui'
import { canEditData } from '../../lib/roles'
import ImagePicker from '../ImagePicker'
import { useRows } from '../../lib/useRows'

const CATS = ['receipt', 'tender', 'salary', 'contract', 'other']

export default function RecordsVault({ school, user }) {
  const canEdit = canEditData(user?.role) || ['Principal', 'Secretary'].includes(user?.role)
  const { rows, error, insert, remove } = useRows('school_records', school?.id)
  const [form, setForm] = useState({ category: 'receipt', title: '', notes: '', file_url: '' })

  const save = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    if (await insert({ ...form, created_by: user.id })) setForm({ category: 'receipt', title: '', notes: '', file_url: '' })
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Records vault" subtitle="Sensitive files — Principal / Secretary" />
      <Alert kind="error">{error}</Alert>
      {canEdit && (
        <Card title="Add">
          <form onSubmit={save} className="space-y-2">
            <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className={input} rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <ImagePicker label="Scan / photo" value={form.file_url} onChange={(file_url) => setForm({ ...form, file_url })} maxW={1200} />
            <button className={btnGreen}>Save</button>
          </form>
        </Card>
      )}
      <Card className="!p-0">
        <Scroll>
          <table className="min-w-full text-sm">
            <thead><tr><th className={th}>Cat</th><th className={th}>Title</th><th className={th}>Date</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.category}</td>
                  <td className={td}>{r.title}{r.file_url && <> · <a className="text-blue-600 font-semibold" href={r.file_url} target="_blank" rel="noreferrer">File</a></>}</td>
                  <td className={td}>{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                  <td className={td}>{canEdit && <button type="button" className="text-red-600 text-xs font-bold" onClick={() => remove(r.id)}>Del</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
