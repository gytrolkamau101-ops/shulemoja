import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function TermsTab({ school, term, onTermChange }) {
  const [ok, setOk] = useState('')
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [num, setNum] = useState(1)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const fetchTerms = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('terms')
      .select('*')
      .eq('school_id', school?.id)
      .order('year', { ascending: false })
      .order('term', { ascending: false })
    setTerms(data || [])
    setLoading(false)
  }, [school?.id])

  useEffect(() => {
    fetchTerms()
  }, [fetchTerms])

  const resetForm = () => {
    setEditId(null)
    setYear(new Date().getFullYear())
    setNum(1)
    setStart('')
    setEnd('')
  }

  const startEdit = (t) => {
    setEditId(t.id)
    setYear(t.year)
    setNum(t.term)
    setStart(t.start_date)
    setEnd(t.end_date)
    setError('')
  }

  const saveTerm = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = {
      school_id: school?.id,
      year: Number(year),
      term: Number(num),
      start_date: start,
      end_date: end,
    }
    let err
    if (editId) {
      const { error } = await supabase.from('terms').update(payload).eq('id', editId)
      err = error
      if (!error) await logAudit('term.update', 'terms', editId, payload)
    } else {
      const { data, error } = await supabase.from('terms').insert([payload]).select('id').single()
      err = error
      if (!error) await logAudit('term.create', 'terms', data?.id, payload)
    }
    setSaving(false)
    if (err) return setError(err.code === '23505' ? 'That term already exists.' : err.message)
    resetForm()
    fetchTerms()
    onTermChange?.()
  }

  const makeCurrent = async (t) => {
    setError('')
    const prev = terms.find((x) => x.is_current && x.id !== t.id)
    const { error: e1 } = await supabase.from('terms').update({ is_current: false }).eq('school_id', school?.id)
    if (e1) return setError(e1.message)
    const { error: e2 } = await supabase.from('terms').update({ is_current: true }).eq('id', t.id)
    if (e2) return setError(e2.message)
    await logAudit('term.set_current', 'terms', t.id, { term: t.term, year: t.year })
    if (prev) {
      const doCarry = confirm(
        `Term ${t.term}, ${t.year} is now current.\n\nCarry forward unpaid balances from Term ${prev.term}, ${prev.year} as arrears on this term?\n\nRecommended: OK for most schools.`
      )
      if (doCarry) {
        const { data, error: cfErr } = await supabase.rpc('carry_forward_fee_arrears', {
          p_school_id: school?.id,
          p_from_term_id: prev.id,
          p_to_term_id: t.id,
        })
        if (cfErr) setError('Term set current, but arrears carry-forward failed: ' + cfErr.message)
        else setOk(`Current term updated. Arrears carried forward for ${data ?? 0} student(s).`)
      } else {
        setOk('Current term updated (no arrears carry-forward).')
      }
    } else {
      setOk('Current term updated.')
    }
    fetchTerms()
    onTermChange?.()
  }

  const deleteTerm = async (t) => {
    if (t.is_current) {
      setError('Cannot delete the current term. Set another term as current first.')
      return
    }
    if (!confirm(`Delete Term ${t.term}, ${t.year}? Related fees/exams for this term may block delete if data exists.`)) return
    setError('')
    const { error } = await supabase.from('terms').delete().eq('id', t.id)
    if (error) {
      setError(
        error.code === '23503'
          ? 'Cannot delete: this term still has linked data (fees, exams, or enrollments). Remove those first or keep the term.'
          : error.message
      )
      return
    }
    await logAudit('term.delete', 'terms', t.id, { term: t.term, year: t.year })
    if (editId === t.id) resetForm()
    fetchTerms()
    onTermChange?.()
  }

  return (
    <div className="space-y-6">
      <Card title="Current term">
        <p className="text-gray-700">
          {term ? (
            <>
              <strong>
                Term {term.term}, {term.year}
              </strong>{' '}
              is active ({new Date(term.start_date).toLocaleDateString('en-GB')} &ndash;{' '}
              {new Date(term.end_date).toLocaleDateString('en-GB')})
            </>
          ) : (
            'No current term set yet. Add one below, then tap "Set as current".'
          )}
        </p>
      </Card>

      <Card title={editId ? 'Edit term' : 'Add a term'}>
        <form onSubmit={saveTerm} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            className={input}
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
          <select className={input} value={num} onChange={(e) => setNum(e.target.value)}>
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
          <input type="date" className={input} value={start} onChange={(e) => setStart(e.target.value)} required />
          <input type="date" className={input} value={end} onChange={(e) => setEnd(e.target.value)} required />
          <div className="md:col-span-4">
            <Alert>{error}</Alert>
      <Alert kind="ok">{ok}</Alert>
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <button disabled={saving} className={btnGreen}>
              {saving ? 'Saving...' : editId ? 'Update term' : 'Add term'}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} className={btnGhost}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title="All terms" className="!p-0">
        {loading ? (
          <p className="p-6 text-gray-600">Loading...</p>
        ) : (
          <Scroll>
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className={th}>Term</th>
                  <th className={th}>Year</th>
                  <th className={th}>Dates</th>
                  <th className={th}>Status</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className={td}>Term {t.term}</td>
                    <td className={td}>{t.year}</td>
                    <td className={td}>
                      {new Date(t.start_date).toLocaleDateString('en-GB')} &ndash;{' '}
                      {new Date(t.end_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className={td}>
                      {t.is_current ? (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Current</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={`${td} space-x-2 whitespace-nowrap`}>
                      {!t.is_current && (
                        <button onClick={() => makeCurrent(t)} className="text-blue-600 hover:underline text-sm">
                          Set current
                        </button>
                      )}
                      <button onClick={() => startEdit(t)} className="text-indigo-600 hover:underline text-sm">
                        Edit
                      </button>
                      <button onClick={() => deleteTerm(t)} className="text-red-600 hover:underline text-sm">
                        Delete
                      </button>
                    </td>
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
