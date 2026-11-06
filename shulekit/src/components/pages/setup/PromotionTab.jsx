import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function PromotionTab({ school, term, user }) {
  const [terms, setTerms] = useState([])
  const [grades, setGrades] = useState([])
  const [fromTerm, setFromTerm] = useState('')
  const [toTerm, setToTerm] = useState('')
  const [fromGrade, setFromGrade] = useState('')
  const [toGrade, setToGrade] = useState('')
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [{ data: t }, { data: g }] = await Promise.all([
        supabase.from('terms').select('*').eq('school_id', school?.id).order('year', { ascending: false }),
        supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      ])
      setTerms(t || [])
      setGrades(g || [])
      if (term) setToTerm(term.id)
    })()
  }, [school?.id, term])

  const loadStudents = async () => {
    setError('')
    if (!fromTerm || !fromGrade) return
    const { data } = await supabase
      .from('student_enrollments')
      .select('student_id, students(id, admission_no, first_name, last_name, status)')
      .eq('term_id', fromTerm)
      .eq('grade_id', fromGrade)
    const list = (data || []).map((e) => e.students).filter((s) => s && s.status === 'Active')
    setStudents(list)
    const sel = {}
    list.forEach((s) => (sel[s.id] = true))
    setSelected(sel)
  }

  const promote = async () => {
    if (toGrade === '__alumni__') {
      setBusy(true)
      setError('')
      try {
        const ids = students.filter((s) => selected[s.id]).map((s) => s.id)
        if (!ids.length) throw new Error('Select at least one learner')
        const { error } = await supabase.from('students').update({ status: 'Alumni' }).in('id', ids)
        if (error) throw error
        alert('Marked as Alumni. Fee history retained.')
        setStudents([])
      } catch (e) {
        setError(e.message || String(e))
      }
      setBusy(false)
      return
    }

    setError('')
    const ids = Object.keys(selected).filter((id) => selected[id])
    if (!ids.length) return setError('Select at least one student')
    if (!fromTerm || !toTerm || !fromGrade || !toGrade) return setError('Select terms and grades')
    if (!confirm(`Promote ${ids.length} student(s) to the target class/term?`)) return
    setBusy(true)
    const { data, error } = await supabase.rpc('promote_students', {
      p_school_id: school?.id,
      p_from_term_id: fromTerm,
      p_to_term_id: toTerm,
      p_from_grade_id: fromGrade,
      p_to_grade_id: toGrade,
      p_student_ids: ids,
    })
    setBusy(false)
    if (error) return setError(error.message)
    alert(`Promoted ${data || ids.length} student(s).`)
  }

  return (
    <div className="space-y-6">
      <Card title="Promote class (Principal / Deputy / Senior Teacher)">
        <p className="text-sm text-slate-600 mb-3">
          Move learners to the next grade for a target term. Uncheck anyone who should repeat or leave.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className={input} value={fromTerm} onChange={(e) => setFromTerm(e.target.value)}>
            <option value="">From term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>Term {t.term}, {t.year}</option>
            ))}
          </select>
          <select className={input} value={toTerm} onChange={(e) => setToTerm(e.target.value)}>
            <option value="">To term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>Term {t.term}, {t.year}{t.is_current ? ' (current)' : ''}</option>
            ))}
          </select>
          <select className={input} value={fromGrade} onChange={(e) => setFromGrade(e.target.value)}>
            <option value="">From class</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.grade_name}{g.stage ? ` · ${g.stage}` : ''}</option>
            ))}
          </select>
          <select className={input} value={toGrade} onChange={(e) => setToGrade(e.target.value)}>
            <option value="">To class</option>
            <option value="__alumni__">Alumni (exit school — keep fee history)</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.grade_name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={loadStudents} className={btnGreen}>Load students</button>
          <button type="button" disabled={busy} onClick={promote} className={btn}>
            {busy ? 'Promoting…' : 'Confirm promotion'}
          </button>
        </div>
        <Alert>{error}</Alert>
        {students.length > 0 && (
          <ul className="mt-4 divide-y max-h-80 overflow-y-auto">
            {students.map((s) => (
              <li key={s.id} className="py-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!selected[s.id]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                />
                <span className="text-sm font-medium">{s.admission_no} — {s.first_name} {s.last_name}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
