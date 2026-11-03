import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function ClassSubjectsTab({ school, term, user }) {
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [gradeId, setGradeId] = useState('')
  const [picked, setPicked] = useState({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      supabase.from('subjects').select('*').eq('school_id', school?.id).order('subject_name'),
    ])
    setGrades(g || [])
    setSubjects(s || [])
    if (!gradeId && g?.length) setGradeId(g[0].id)
  }, [school?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    ;(async () => {
      if (!gradeId || !term) { setPicked({}); return }
      const { data } = await supabase
        .from('subject_allocations')
        .select('subject_id')
        .eq('school_id', school?.id)
        .eq('grade_id', gradeId)
        .eq('term_id', term.id)
      const map = {}
      ;(data || []).forEach((r) => { map[r.subject_id] = true })
      setPicked(map)
    })()
  }, [gradeId, term, school?.id])

  const save = async () => {
    setError('')
    setOk('')
    if (!term) return setError('Set a current term first.')
    if (!gradeId) return setError('Choose a class.')
    setSaving(true)
    await supabase.from('subject_allocations').delete()
      .eq('school_id', school?.id).eq('grade_id', gradeId).eq('term_id', term.id)
    const ids = Object.keys(picked).filter((id) => picked[id])
    if (ids.length) {
      if (!user?.id) {
        setSaving(false)
        return setError('Your session has no user id. Sign out and sign in again, then save.')
      }
      const rows = ids.map((subject_id) => ({
        school_id: school?.id,
        grade_id: gradeId,
        subject_id,
        term_id: term.id,
        teacher_id: user?.id,
      }))
      const { error } = await supabase.from('subject_allocations').insert(rows)
      if (error) {
        setSaving(false)
        return setError(
          error.message.includes('teacher_id')
            ? error.message + ' — Run SQL 25_v47_subject_teacher_optional.sql in Supabase if this persists.'
            : error.message
        )
      }
    }
    setSaving(false)
    setOk(`Saved ${ids.length} subject(s) for this class.`)
    try { await logAudit('subjects.allocate', 'subject_allocations', gradeId, { count: ids.length }) } catch (_) {}
  }

  return (
    <div className="space-y-6">
      <Card title="Subjects per class">
        <p className="text-sm text-slate-600 mb-3">
          1) Add all school subjects under <strong>Grades &amp; Subjects</strong>.
          2) Pick a class below and tick the subjects taught in that class this term.
          (Optional baskets remain under Baskets for grouping.)
        </p>
        {!term ? (
          <Alert kind="warn">Set a current term first.</Alert>
        ) : (
          <>
            <select className={input} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.grade_name}</option>
              ))}
            </select>
            {subjects.length === 0 ? (
              <Alert kind="warn">No subjects yet. Add them under Grades &amp; Subjects.</Alert>
            ) : (
              <div className="mt-3 max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y">
                {subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={!!picked[s.id]}
                      onChange={(e) => setPicked((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                    />
                    <span className="font-medium">{s.subject_name}</span>
                  </label>
                ))}
              </div>
            )}
            <Alert>{error}</Alert>
            <Alert kind="ok">{ok}</Alert>
            <button type="button" disabled={saving} onClick={save} className={`${btnGreen} mt-3`}>
              {saving ? 'Saving…' : 'Save subjects for this class'}
            </button>
          </>
        )}
      </Card>
    </div>
  )
}
