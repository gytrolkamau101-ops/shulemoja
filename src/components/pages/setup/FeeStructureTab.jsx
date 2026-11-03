import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function FeeStructureTab({ school, term }) {
  const [grades, setGrades] = useState([])
  const [structures, setStructures] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!term) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: g }, { data: fs }] = await Promise.all([
      supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      supabase.from('fee_structures').select('*').eq('school_id', school?.id).eq('term_id', term.id),
    ])
    setGrades(g || [])
    const map = {}
    ;(fs || []).forEach((f) => (map[f.grade_id] = f.total_fee))
    setStructures(map)
    setLoading(false)
  }, [school?.id, term])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const save = async (gradeId) => {
    setError('')
    setSaving(gradeId)
    const amount = Number(structures[gradeId] || 0)
    const { error } = await supabase
      .from('fee_structures')
      .upsert(
        [{ school_id: school?.id, term_id: term.id, grade_id: gradeId, total_fee: amount }],
        { onConflict: 'school_id,term_id,grade_id' }
      )
    setSaving('')
    if (error) setError(error.message)
  }

  if (!term) {
    return <Alert>Set a current term in the Terms tab first.</Alert>
  }

  return (
    <Card title={`Fee per grade — Term ${term.term}, ${term.year}`}>
      <Alert>{error}</Alert>
      {loading ? (
        <p className="text-gray-600 text-sm">Loading...</p>
      ) : grades.length === 0 ? (
        <p className="text-gray-500 text-sm">Add grades first, in the Grades &amp; Subjects tab.</p>
      ) : (
        <div className="space-y-3 mt-2">
          {grades.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <span className="w-32 text-gray-700">{g.grade_name}</span>
              <input
                type="number"
                min="0"
                className={`${input} flex-1`}
                placeholder="Total fee (KES)"
                value={structures[g.id] ?? ''}
                onChange={(e) => setStructures({ ...structures, [g.id]: e.target.value })}
              />
              <button onClick={() => save(g.id)} disabled={saving === g.id} className={btn}>
                {saving === g.id ? '...' : 'Save'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
