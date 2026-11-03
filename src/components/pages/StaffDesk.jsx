import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, btn, th, td } from '../ui'
import { DESK_ROLES, canEditData } from '../../lib/roles'
import ImagePicker from '../ImagePicker'

export default function StaffDesk({ school, user }) {
  const canPost = DESK_ROLES.includes(user?.role) || canEditData(user?.role)
  const isLeader = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'].includes(user?.role)
  const [rows, setRows] = useState([])
  const [msgs, setMsgs] = useState([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [toRole, setToRole] = useState('Secretary')
  const [attachment, setAttachment] = useState('')

  const load = useCallback(async () => {
    const [{ data: desk }, { data: m }] = await Promise.all([
      supabase.from('staff_desk_logs').select('*').eq('school_id', school?.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('staff_messages').select('*').eq('school_id', school?.id).order('created_at', { ascending: false }).limit(40),
    ])
    setRows(desk || [])
    setMsgs(m || [])
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const sendInquiry = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    const { error: err } = await supabase.from('staff_messages').insert([
      {
        school_id: school?.id,
        from_user: user?.id,
        to_role: toRole,
        subject: subject.trim() || 'Staff inquiry',
        body: body.trim(),
        attachment_url: attachment || null,
        status: 'open',
      },
    ])
    if (err) setError(err.message + ' — run SQL 28_v55_fixes.sql for staff_messages table')
    else {
      setOk('Sent to ' + toRole)
      setSubject('')
      setBody('')
      setAttachment('')
      load()
    }
  }

  const escalate = async (id) => {
    const { error: err } = await supabase.from('staff_messages').update({ to_role: 'Principal', status: 'escalated' }).eq('id', id)
    if (err) setError(err.message)
    else load()
  }

  const closeMsg = async (id) => {
    await supabase.from('staff_messages').update({ status: 'closed' }).eq('id', id)
    load()
  }

  const deleteMsg = async (id) => {
    if (!isLeader && !canPost) return
    if (!confirm('Delete this inquiry?')) return
    const { error: err } = await supabase.from('staff_messages').delete().eq('id', id)
    if (err) setError(err.message)
    else {
      setOk('Inquiry deleted')
      load()
    }
  }

  const deleteLog = async (id) => {
    if (!isLeader) return
    if (!confirm('Delete this duty log entry?')) return
    const { error: err } = await supabase.from('staff_desk_logs').delete().eq('id', id)
    if (err) setError(err.message)
    else load()
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Staff desk" subtitle="Duty log and internal inquiries (Teacher → Secretary → Principal)" />
      <Alert>{error}</Alert>
      <Alert kind="ok">{ok}</Alert>

      <Card title="Send inquiry / document">
        <form onSubmit={sendInquiry} className="space-y-2">
          <select className={input} value={toRole} onChange={(e) => setToRole(e.target.value)}>
            <option value="Secretary">To Secretary</option>
            <option value="Principal">To Principal</option>
            <option value="Deputy Principal">To Deputy Principal</option>
          </select>
          <input className={input} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className={input} rows={3} placeholder="Message / request" value={body} onChange={(e) => setBody(e.target.value)} required />
          <ImagePicker label="Attach image (optional)" value={attachment} onChange={setAttachment} />
          <button className={btnGreen}>Send</button>
        </form>
      </Card>

      <Card title="Inquiries" className="!p-0">
        <Scroll>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>To</th>
                <th className={th}>Subject</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {msgs.map((m) => (
                <tr key={m.id}>
                  <td className={td}>{m.to_role}</td>
                  <td className={td}>
                    <p className="font-bold">{m.subject}</p>
                    <p className="text-xs text-slate-500 whitespace-pre-wrap">{m.body}</p>
                    {m.attachment_url && (
                      <a className="text-xs text-blue-700 font-bold" href={m.attachment_url} target="_blank" rel="noreferrer">Attachment</a>
                    )}
                  </td>
                  <td className={td}>{m.status}</td>
                  <td className={td}>
                    <div className="flex flex-col gap-1">
                      {isLeader && m.status !== 'closed' && (
                        <>
                          {user?.role === 'Secretary' && m.to_role === 'Secretary' && (
                            <button type="button" className="text-xs font-bold text-amber-700" onClick={() => escalate(m.id)}>Send to Principal</button>
                          )}
                          <button type="button" className="text-xs font-bold text-slate-600" onClick={() => closeMsg(m.id)}>Close</button>
                        </>
                      )}
                      {(isLeader || canPost) && (
                        <button type="button" className="text-xs font-bold text-red-600" onClick={() => deleteMsg(m.id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!msgs.length && <tr><td className={td} colSpan={4}>No inquiries yet</td></tr>}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
