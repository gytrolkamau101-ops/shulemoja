import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function FeeHeadsTab({ school }) {
  const [heads, setHeads] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.from('fee_heads').select('*').eq('school_id', school?.id).order('head_name')
    setHeads(data || [])
  }, [school?.id])
  useEffect(() => { load() }, [load])
  const add = async (e) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('fee_heads').insert([{ school_id: school?.id, head_name: name.trim() }])
    if (error) return setError(error.message)
    setName('')
    load()
  }
  const deleteHead = async (h) => {
    if (!confirm(`Delete fee head "${h.head_name}"?`)) return
    setError('')
    const { error } = await supabase.from('fee_heads').delete().eq('id', h.id)
    if (error) return setError(error.message)
    load()
  }
  return (
    <Card title="Fee heads (tuition, lunch, transport…)">
      <p className="text-sm text-slate-600 mb-3">Define components. Use totals on Fee Structure for now; itemized amounts can deepen later.</p>
      <form onSubmit={add} className="flex gap-2">
        <input className={input} placeholder="e.g. Tuition" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className={btnGreen}>Add</button>
      </form>
      <Alert>{error}</Alert>
      <ul className="mt-3 text-sm space-y-1">
        {heads.map((h) => (
          <li key={h.id} className="flex justify-between items-center gap-2 py-1">
            <span>{h.head_name}</span>
            <button type="button" onClick={() => deleteHead(h)} className="text-red-600 text-sm font-semibold hover:underline">Delete</button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
