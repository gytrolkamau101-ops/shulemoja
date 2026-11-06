import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function AuditTab({ school }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('audit_events')
        .select('*')
        .eq('school_id', school?.id)
        .order('created_at', { ascending: false })
        .limit(150)
      setEvents(data || [])
      setLoading(false)
    })()
  }, [school?.id])
  return (
    <Card title="School audit log" className="!p-0">
      {loading ? (
        <p className="p-6 text-slate-600">Loading…</p>
      ) : (
        <Scroll>
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className={th}>When</th>
                <th className={th}>Actor</th>
                <th className={th}>Action</th>
                <th className={th}>Entity</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className={td}>{new Date(e.created_at).toLocaleString('en-GB')}</td>
                  <td className={td}>{e.actor_email || '—'}</td>
                  <td className={td}>{e.action}</td>
                  <td className={td}>{e.entity || '—'} {e.entity_id ? String(e.entity_id).slice(0, 8) : ''}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td className={td} colSpan={4}>No events yet</td></tr>
              )}
            </tbody>
          </table>
        </Scroll>
      )}
    </Card>
  )
}
