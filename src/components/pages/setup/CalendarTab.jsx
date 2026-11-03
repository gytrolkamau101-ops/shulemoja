import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'
import StreamsCard from '../StreamsCard'

export default function CalendarTab({ school }) {
  const [events, setEvents] = useState([])
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('school_events')
      .select('*')
      .eq('school_id', school?.id)
      .order('event_date')
    setEvents(data || [])
    setLoading(false)
  }, [school?.id])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const addEvent = async (e) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase
      .from('school_events')
      .insert([{ school_id: school?.id, event_name: name, event_date: date, description: desc }])
    if (error) return setError(error.message)
    setName('')
    setDate('')
    setDesc('')
    fetchEvents()
  }

  const deleteEvent = async (ev) => {
    if (!confirm(`Delete event "${ev.event_name}"?`)) return
    setError('')
    const { error } = await supabase.from('school_events').delete().eq('id', ev.id)
    if (error) return setError(error.message)
    fetchEvents()
  }

  return (
    <div className="space-y-6">
      <Card title="CBC / curriculum grade templates">
        <p className="text-sm text-slate-600 mb-2">Seed standard Kenyan grade names and stages for this school.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGreen} onClick={async () => {
            const { error } = await supabase.rpc('seed_cbc_primary_grades', { p_school_id: school?.id })
            if (error) alert(error.message); else { alert('Primary CBC grades seeded'); window.location.reload() }
          }}>Seed primary CBC grades</button>
          <button type="button" className={btn} onClick={async () => {
            const { error } = await supabase.rpc('seed_secondary_grades', { p_school_id: school?.id })
            if (error) alert(error.message); else { alert('Secondary grades seeded'); window.location.reload() }
          }}>Seed secondary Forms 1–4</button>
        </div>
      </Card>
      <StreamsCard school={school} />

      <Card title="Add event">
        <form onSubmit={addEvent} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className={input} placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} required />
          <input className={input} placeholder="Notes (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="md:col-span-3">
            <Alert>{error}</Alert>
          </div>
          <button className={`${btnGreen} md:col-span-3`}>Add event</button>
        </form>
      </Card>
      <Card title="All events" className="!p-0">
        {loading ? (
          <p className="p-6 text-gray-600">Loading...</p>
        ) : events.length === 0 ? (
          <p className="p-6 text-gray-600 text-center">No events yet</p>
        ) : (
          <ul className="divide-y">
            {events.map((e) => (
              <li key={e.id} className="p-4 flex justify-between gap-3 items-start">
                <div>
                  <p className="font-semibold text-gray-800">{e.event_name}</p>
                  <p className="text-sm text-gray-600">{new Date(e.event_date).toLocaleDateString('en-GB')}</p>
                  {e.description && <p className="text-sm text-gray-700 mt-1">{e.description}</p>}
                </div>
                <button type="button" onClick={() => deleteEvent(e)} className="text-red-600 text-sm font-semibold hover:underline shrink-0">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
