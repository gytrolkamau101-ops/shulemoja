import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Alert, PageTitle, input, btnGreen, Scroll, th, td } from '../ui'
import { canEditData } from '../../lib/roles'

const TEMPLATES = {
  suspension: {
    title: 'Suspension notice',
    body: 'Dear Parent/Guardian,\n\nThis is to inform you that {student} (Adm {adm}) has been suspended.\n\nReason: {reason}\nDuration: {duration}\n\nPlease contact the school office.\n\n— {school}',
  },
  fee_balance: {
    title: 'Fee balance reminder',
    body: 'Dear Parent/Guardian,\n\nThis is a reminder that {student} (Adm {adm}) has an outstanding fee balance.\n\nPlease clear the balance via the school Till/Paybill and keep your M-Pesa message.\n\n— {school}',
  },
  leave_out: {
    title: 'Leave-out / permission',
    body: 'Dear Parent/Guardian,\n\nPermission regarding {student} (Adm {adm}):\n\nDetails: {reason}\nDates: {duration}\n\n— {school}',
  },
  general: {
    title: 'School notice',
    body: 'Dear Parent/Guardian,\n\nRegarding {student} (Adm {adm}):\n\n{reason}\n\n— {school}',
  },
}

export default function ParentNotices({ school, user }) {
  const canEdit = canEditData(user?.role) || ['Principal', 'Deputy Principal', 'Senior Teacher'].includes(user?.role)
  const [students, setStudents] = useState([])
  const [rows, setRows] = useState([])
  const [type, setType] = useState('suspension')
  const [studentId, setStudentId] = useState('')
  const [title, setTitle] = useState(TEMPLATES.suspension.title)
  const [body, setBody] = useState(TEMPLATES.suspension.body)
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = useCallback(async () => {
    const [{ data: s }, { data: n }] = await Promise.all([
      supabase.from('students').select('id, first_name, last_name, admission_no').eq('school_id', school?.id).eq('status', 'Active').order('first_name'),
      supabase.from('parent_notices').select('*, students(first_name, last_name, admission_no)').eq('school_id', school?.id).order('created_at', { ascending: false }).limit(40),
    ])
    setStudents(s || [])
    setRows(n || [])
  }, [school?.id])

  useEffect(() => { load() }, [load])

  const removeNotice = async (id) => {
    if (!canEdit || !confirm('Delete this parent letter/notice?')) return
    setError('')
    const { error } = await supabase.from('parent_notices').delete().eq('id', id)
    if (error) setError(error.message)
    else {
      setOk('Notice deleted.')
      load()
    }
  }

  const applyType = (k) => {
    setType(k)
    setTitle(TEMPLATES[k].title)
    setBody(TEMPLATES[k].body)
  }

  const fill = () => {
    const s = students.find((x) => x.id === studentId)
    const student = s ? `${s.first_name} ${s.last_name}` : '{student}'
    const adm = s?.admission_no || '{adm}'
    const filled = body
      .replace(/\{student\}/g, student)
      .replace(/\{adm\}/g, adm)
      .replace(/\{reason\}/g, reason || '—')
      .replace(/\{duration\}/g, duration || '—')
      .replace(/\{school\}/g, school?.school_name || 'School')
    setBody(filled)
  }

  const send = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    setOk('')
    if (!studentId) return setError('Select a learner')
    const { error: err } = await supabase.from('parent_notices').insert([
      {
        school_id: school?.id,
        student_id: studentId,
        notice_type: type,
        title: title.trim(),
        body: body.trim(),
        created_by: user?.id,
      },
    ])
    if (err) setError(err.message + ' — run SQL 30_v63_policies.sql')
    else {
      setOk('Notice sent to parent portal for this learner.')
      setReason('')
      setDuration('')
      load()
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Parent letters" subtitle="Shown on the parent portal" />
      <Alert>{error}</Alert>
      <Alert kind="ok">{ok}</Alert>
      {canEdit && (
        <Card title="Compose notice">
          <form onSubmit={send} className="space-y-2">
            <select className={input} value={type} onChange={(e) => applyType(e.target.value)}>
              <option value="suspension">Suspension</option>
              <option value="fee_balance">Fee balance</option>
              <option value="leave_out">Leave-out / permission</option>
              <option value="general">General</option>
            </select>
            <select className={input} value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              <option value="">Select learner</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.admission_no} — {s.first_name} {s.last_name}</option>
              ))}
            </select>
            <input className={input} placeholder="Reason (fills {reason})" value={reason} onChange={(e) => setReason(e.target.value)} />
            <input className={input} placeholder="Duration / dates (fills {duration})" value={duration} onChange={(e) => setDuration(e.target.value)} />
            <button type="button" className="text-xs font-bold text-blue-700" onClick={fill}>Fill template with learner + reason</button>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className={input} rows={8} value={body} onChange={(e) => setBody(e.target.value)} required />
            <button className={btnGreen}>Send to parent portal</button>
          </form>
        </Card>
      )}
      <Card className="!p-0" title="Sent notices">
        <Scroll>
          <table className="min-w-full text-sm">
            <thead><tr><th className={th}>Type</th><th className={th}>Learner</th><th className={th}>Title</th><th className={th}>When</th>{canEdit ? <th className={th}></th> : null}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.notice_type}</td>
                  <td className={td}>{r.students?.admission_no} {r.students?.first_name}</td>
                  <td className={td}>{r.title}</td>
                  <td className={td}>{r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : '—'}</td>
                  {canEdit ? (
                    <td className={td}>
                      <button type="button" className="text-red-600 text-xs font-bold" onClick={() => removeNotice(r.id)}>Delete</button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!rows.length && <tr><td className={td} colSpan={5}>No notices yet</td></tr>}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
