import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, PageTitle, input, btn, btnGreen, btnDanger, th, td } from '../ui'
import { canEditData } from '../../lib/roles'
import { isPremiumOrPro } from '../../lib/plans'
import { openPrintDocument } from '../../lib/docHeader'

const TEMPLATES = [
  {
    id: 'blank',
    label: 'Blank circular',
    title: '',
    body: '',
  },
  {
    id: 'fee_reminder',
    label: 'Fee reminder',
    title: 'School fees reminder',
    body: 'Dear Parent/Guardian,\n\nThis is a reminder that school fees for the current term are due.\nPlease pay via the school Till/Paybill and keep your M-Pesa message.\n\nThank you.',
  },
  {
    id: 'meeting',
    label: 'Parents meeting',
    title: 'Parents / guardians meeting',
    body: 'You are invited to a meeting at the school.\nDate: ____\nTime: ____\nAgenda: ____\n\nYour presence is important.',
  },
  {
    id: 'exam_notice',
    label: 'Exam notice',
    title: 'Upcoming examinations',
    body: 'Learners will sit examinations as follows:\nExam: ____\nDates: ____\nPlease ensure full attendance and revision materials.',
  },
  {
    id: 'class_report_blank',
    label: 'Class report form (print & fill)',
    title: 'Class report form — fill by hand',
    body: 'SCHOOL: ____________________  TERM: ____  YEAR: ____\nCLASS / GRADE: ________  STREAM: ____  EXAM: ________\n\nAdm No | Learner name | Subj1 | Subj2 | Subj3 | Subj4 | Subj5 | Total | Avg | Pos\n-------|--------------|------|------|------|------|------|-------|-----|----\n       |              |      |      |      |      |      |       |     |\n       |              |      |      |      |      |      |       |     |\n       |              |      |      |      |      |      |       |     |\n\nTeacher remarks: ________________________________\nHeadteacher: ________________________________\n\nAfter filling, enter marks in ShuleMoja → Exams, or use Import centre (Premium).',
  },
  {
    id: 'attendance_sheet',
    label: 'Attendance sheet (print)',
    title: 'Daily attendance sheet',
    body: 'SCHOOL: ________  DATE: ________  CLASS: ________\n\nAdm No | Name | Present | Absent | Late | Notes\n-------|------|---------|--------|------|------\n       |      |         |        |      |\n\nEnter totals in ShuleMoja → Attendance when online.',
  },
  {
    id: 'exam_timetable',
    label: 'Exam timetable template',
    title: 'Examination timetable',
    body: 'TERM ____ YEAR ____\n\nDate | Session | Grade | Subject | Duration\n-----|---------|-------|---------|----------\n     | Morning |       |         |\n     | Afternoon|      |         |\n\nGenerate a draft online under Timetable (Premium) then refine.',
  },
]

export default function Circulars({ school, user, term }) {
  const canEdit = canEditData(user?.role)
  const [rows, setRows] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tpl, setTpl] = useState('blank')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('circulars')
      .select('*')
      .eq('school_id', school?.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setRows(data || [])
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const applyTpl = (id) => {
    setTpl(id)
    const t = TEMPLATES.find((x) => x.id === id) || TEMPLATES[0]
    setTitle(t.title)
    setBody(t.body)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    setOk('')
    const { error: err } = await supabase.from('circulars').insert([
      {
        school_id: school?.id,
        title: title.trim() || 'Circular',
        body: body.trim(),
        created_by: user?.id,
        term_id: term?.id || null,
      },
    ])
    if (err) setError(err.message)
    else {
      setOk('Circular saved.')
      setTitle('')
      setBody('')
      setTpl('blank')
      load()
    }
  }

  const remove = async (id) => {
    if (!canEdit || !confirm('Delete this circular?')) return
    const { error: err } = await supabase.from('circulars').delete().eq('id', id)
    if (err) setError(err.message)
    else load()
  }

  const printBody = (r) => {
    const ok = openPrintDocument({
      school,
      title: r.title,
      bodyHtml: `<h2 style="text-align:center">${r.title}</h2><p style="white-space:pre-wrap">${(r.body || '').replace(/</g, '&lt;')}</p>`,
    })
    if (!ok) alert('Allow pop-ups')
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Circulars & forms" subtitle="Notices, printable class/exam/attendance templates — Premium" />
      <Alert>{error}</Alert>
      <Alert kind="ok">{ok}</Alert>
      {canEdit && (
        <Card title="New circular or form">
          <form onSubmit={save} className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block">
              Template
              <select className={input} value={tpl} onChange={(e) => applyTpl(e.target.value)}>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className={input} rows={8} placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} required />
            <button className={btnGreen}>Publish / save</button>
          </form>
        </Card>
      )}
      <Card className="!p-0">
        <Scroll>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Title</th>
                <th className={th}>Created</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>
                    <p className="font-bold">{r.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">{r.body?.slice(0, 120)}</p>
                  </td>
                  <td className={td}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</td>
                  <td className={td}>
                    <div className="flex gap-2">
                      <button type="button" className="text-blue-700 text-xs font-bold" onClick={() => printBody(r)}>Print</button>
                      {canEdit && (
                        <button type="button" className="text-red-600 text-xs font-bold" onClick={() => remove(r.id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td className={td} colSpan={3}>No circulars yet</td></tr>
              )}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
