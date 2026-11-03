import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, PageTitle, Alert, input, btnGreen, th, td, fmt, Scroll, toast } from '../ui'
import { isLeadership } from '../../lib/roles'

const SPEND_CATS = ['Tuition support', 'Operations', 'Meals / food', 'Boarding', 'Transport', 'Infrastructure', 'Learning materials', 'Co-curricular', 'Other']

/** Premium: government capitation inflows + how money was used in school */
export default function Capitation({ school, term, user }) {
  const canEdit = isLeadership(user?.role) || user?.role === 'Secretary'
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('MoE / Capitation')
  const [notes, setNotes] = useState('')
  const [kind, setKind] = useState('inflow')
  const [category, setCategory] = useState(SPEND_CATS[0])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('capitation_entries')
      .select('*')
      .eq('school_id', school?.id)
      .order('entry_date', { ascending: false })
      .limit(300)
    if (error) {
      setError(
        error.message.includes('does not exist')
          ? 'Run migrations/032_capitation.sql in Supabase.'
          : error.message
      )
      setRows([])
    } else setRows(data || [])
    setLoading(false)
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const save = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    const n = Number(amount)
    if (!n || n <= 0) return setError('Enter a positive amount')
    if (kind === 'spend' && !category) return setError('Choose how the money was used')
    const { error } = await supabase.from('capitation_entries').insert([
      {
        school_id: school.id,
        term_id: term?.id || null,
        kind,
        amount: n,
        source: kind === 'inflow' ? source : category,
        notes: notes || (kind === 'spend' ? `Used for: ${category}` : null),
        entry_date: new Date().toISOString().slice(0, 10),
        created_by: user?.id,
      },
    ])
    if (error) setError(error.message)
    else {
      toast('Saved', 'ok')
      setAmount('')
      setNotes('')
      load()
    }
  }

  const del = async (id) => {
    if (!canEdit || !confirm('Delete this entry?')) return
    const { error } = await supabase.from('capitation_entries').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  const inflows = rows.filter((r) => r.kind === 'inflow').reduce((s, r) => s + Number(r.amount || 0), 0)
  const spends = rows.filter((r) => r.kind === 'spend').reduce((s, r) => s + Number(r.amount || 0), 0)
  const byUse = useMemo(() => {
    const m = {}
    rows
      .filter((r) => r.kind === 'spend')
      .forEach((r) => {
        const k = r.source || 'Other'
        m[k] = (m[k] || 0) + Number(r.amount || 0)
      })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [rows])

  return (
    <div className="space-y-4">
      <PageTitle title="Government capitation" subtitle="Record MoE/county inflows and exactly how funds were used (Premium). Heads & Secretary only." />
      {!canEdit && <Alert>Only Principal / Deputy / Secretary can edit capitation.</Alert>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <p className="text-xs font-bold text-slate-500 uppercase">Inflows</p>
          <p className="text-2xl font-black text-emerald-700">KES {fmt(inflows)}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-slate-500 uppercase">Used in school</p>
          <p className="text-2xl font-black text-slate-800">KES {fmt(spends)}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-slate-500 uppercase">Balance (recorded)</p>
          <p className="text-2xl font-black text-blue-800">KES {fmt(inflows - spends)}</p>
        </Card>
      </div>
      {byUse.length > 0 && (
        <Card title="How money was used">
          <ul className="text-sm space-y-1">
            {byUse.map(([k, v]) => (
              <li key={k} className="flex justify-between border-b border-slate-100 py-1">
                <span className="font-semibold">{k}</span>
                <span className="font-black">KES {fmt(v)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {canEdit && (
        <Card title="Add entry">
          <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Type
              <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="inflow">Inflow (received)</option>
                <option value="spend">Use / spend in school</option>
              </select>
            </label>
            <label className="text-xs font-bold">
              Amount (KES)
              <input className={input} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            {kind === 'inflow' ? (
              <label className="text-xs font-bold sm:col-span-2">
                Source
                <input className={input} value={source} onChange={(e) => setSource(e.target.value)} placeholder="MoE, County, FDSE…" />
              </label>
            ) : (
              <label className="text-xs font-bold sm:col-span-2">
                Used for
                <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {SPEND_CATS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs font-bold sm:col-span-2">
              Notes / voucher ref
              <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button type="submit" className={btnGreen}>
              Save
            </button>
          </form>
          <Alert>{error}</Alert>
        </Card>
      )}
      <Card className="!p-0">
        {loading ? (
          <p className="p-4 text-sm">Loading…</p>
        ) : (
          <Scroll>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Type</th>
                  <th className={th}>Source / use</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Notes</th>
                  {canEdit && <th className={th}></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{r.entry_date}</td>
                    <td className={td}>{r.kind}</td>
                    <td className={td}>{r.source}</td>
                    <td className={td}>KES {fmt(r.amount)}</td>
                    <td className={td}>{r.notes}</td>
                    {canEdit && (
                      <td className={td}>
                        <button type="button" className="text-red-600 text-xs font-bold" onClick={() => del(r.id)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Card>
    </div>
  )
}
