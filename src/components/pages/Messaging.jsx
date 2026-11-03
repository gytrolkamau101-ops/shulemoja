import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { canSendSchoolMessages } from '../../lib/roles'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, th, td } from '../ui'

const DEFAULT_TEMPLATES = [
  { key: 'fee', title: 'Fee reminder', body: 'Dear Parent, school fees are due. Please clear the balance at your earliest convenience. — {school}' },
  { key: 'meeting', title: 'Parents meeting', body: 'Dear Parent, you are invited to a parents meeting at {school}. Kindly confirm attendance.' },
  { key: 'general', title: 'General notice', body: 'Dear Parent, {school} shares the following notice: ' },
]

export default function Messaging({ school, user }) {
  const canSend = canSendSchoolMessages(user?.role)
  const [channel, setChannel] = useState('WhatsApp')
  const [templates, setTemplates] = useState([])
  const [tplKey, setTplKey] = useState('fee')
  const [body, setBody] = useState('')
  const [log, setLog] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const schoolName = school?.school_name || 'School'

  const applyTemplate = (key, list) => {
    const all = list?.length ? list : DEFAULT_TEMPLATES
    const t = all.find((x) => (x.template_key || x.key) === key) || all[0]
    setBody(String(t?.body || '').replace(/\{school\}/gi, schoolName))
  }

  const load = useCallback(async () => {
    const [{ data: msgs }, { data: tpls }] = await Promise.all([
      supabase.from('message_outbox').select('*').eq('school_id', school?.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('message_templates').select('*').eq('school_id', school?.id).order('title'),
    ])
    setLog(msgs || [])
    setTemplates(tpls || [])
    applyTemplate(tplKey, tpls || [])
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const removeTemplate = async (tpl) => {
    if (!tpl?.id) return setError('Built-in templates cannot be deleted.')
    if (!confirm(`Delete template "${tpl.title}"?`)) return
    const { error: e } = await supabase.from('message_templates').delete().eq('id', tpl.id)
    if (e) return setError(e.message)
    setTemplates((prev) => prev.filter((x) => x.id !== tpl.id))
    setInfo('Template deleted.')
  }

  const removeLog = async (id) => {
    if (!confirm('Delete this outbox row?')) return
    const { error: e } = await supabase.from('message_outbox').delete().eq('id', id)
    if (e) return setError(e.message)
    setLog((prev) => prev.filter((x) => x.id !== id))
  }

  const openChannel = async () => {
    setError('')
    setInfo('')
    const text = body.trim()
    if (!text) return setError('Message is empty.')
    try {
      await supabase.from('message_outbox').insert([
        { school_id: school.id, channel, body: text, created_by: user?.id, status: 'opened' },
      ])
      const encoded = encodeURIComponent(text)
      if (channel === 'WhatsApp') window.open(`https://wa.me/?text=${encoded}`, '_blank')
      else window.location.href = `sms:?body=${encoded}`
      setInfo(channel === 'WhatsApp' ? 'WhatsApp opened — pick recipients there.' : 'SMS app opened — pick recipients there.')
      load()
    } catch (e) {
      setError(e?.message || 'Could not open messaging app')
    }
  }

  if (!canSend) {
    return (
      <div className="space-y-4">
        <PageTitle title="Messages" subtitle="WhatsApp & SMS via your phone" />
        <Alert kind="ok">Only Principal, Deputy, Senior Teacher, or Secretary can send school messages.</Alert>
      </div>
    )
  }

  const tplList = templates.length ? templates : DEFAULT_TEMPLATES

  return (
    <div className="space-y-5">
      <PageTitle title="Messages" subtitle="Compose once · open WhatsApp or SMS on your phone" />

      <Card title="Compose">
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <select className={input} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="WhatsApp">WhatsApp</option>
            <option value="SMS">SMS</option>
          </select>
          <div className="flex gap-2">
            <select
              className={`${input} flex-1`}
              value={tplKey}
              onChange={(e) => {
                setTplKey(e.target.value)
                applyTemplate(e.target.value, templates)
              }}
            >
              {tplList.map((t) => (
                <option key={t.key || t.template_key || t.id} value={t.key || t.template_key || t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            {templates.length > 0 && (
              <button
                type="button"
                className="text-xs font-bold text-red-600 whitespace-nowrap px-1"
                onClick={() => {
                  const tpl = templates.find((x) => (x.key || x.template_key) === tplKey || x.id === tplKey)
                  if (tpl?.id) removeTemplate(tpl)
                  else setError('Only school-saved templates can be deleted.')
                }}
              >
                Del tpl
              </button>
            )}
          </div>
        </div>
        <textarea className={`${input} min-h-[130px] mb-3`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message…" />
        <Alert>{error}</Alert>
        {info && <Alert kind="ok">{info}</Alert>}
        <button type="button" onClick={openChannel} className={btnGreen}>
          Open {channel}
        </button>
      </Card>

      <Card title="Outbox" className="!p-0">
        <Scroll>
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className={th}>When</th>
                <th className={th}>Channel</th>
                <th className={th}>Preview</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {log.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className={td}>{new Date(m.created_at).toLocaleString('en-GB')}</td>
                  <td className={td}>{m.channel}</td>
                  <td className={td}>{String(m.body || '').slice(0, 80)}</td>
                  <td className={td}>
                    <button type="button" className="text-red-600 text-xs font-bold" onClick={() => removeLog(m.id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
              {!log.length && (
                <tr>
                  <td className={td} colSpan={4}>
                    No messages logged yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
