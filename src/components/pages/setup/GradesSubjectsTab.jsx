import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function GradesSubjectsTab({ school }) {
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [gradeName, setGradeName] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      supabase.from('subjects').select('*').eq('school_id', school?.id).order('subject_name'),
    ])
    setGrades(g || [])
    setSubjects(s || [])
    setLoading(false)
  }, [school?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const addGrade = async (e) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('grades').insert([{ school_id: school?.id, grade_name: gradeName }])
    if (error) return setError(error.code === '23505' ? 'That grade already exists.' : error.message)
    setGradeName('')
    fetchAll()
  }

  const addSubject = async (e) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('subjects').insert([{ school_id: school?.id, subject_name: subjectName }])
    if (error) return setError(error.code === '23505' ? 'That subject already exists.' : error.message)
    setSubjectName('')
    fetchAll()
  }

  const deleteGrade = async (g) => {
    if (!confirm(`Delete grade "${g.grade_name}"?`)) return
    setError('')
    const { error } = await supabase.from('grades').delete().eq('id', g.id)
    if (error) return setError(error.message.includes('foreign') || error.code === '23503' ? 'Cannot delete: grade still has students or linked data.' : error.message)
    fetchAll()
  }

  const deleteSubject = async (sub) => {
    if (!confirm(`Delete subject "${sub.subject_name}"?`)) return
    setError('')
    const { error } = await supabase.from('subjects').delete().eq('id', sub.id)
    if (error) return setError(error.message.includes('foreign') || error.code === '23503' ? 'Cannot delete: subject still linked to exams or allocations.' : error.message)
    fetchAll()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Grades / classes">
        <form onSubmit={addGrade} className="flex gap-2 mb-4">
          <input
            className={input}
            placeholder="e.g. Grade 4, Form 2"
            value={gradeName}
            onChange={(e) => setGradeName(e.target.value)}
            required
          />
          <button className={btnGreen}>Add</button>
        </form>
        {loading ? (
          <p className="text-gray-600 text-sm">Loading...</p>
        ) : (
          <ul className="divide-y">
            {grades.map((g) => (
              <li key={g.id} className="py-2 text-gray-800 flex items-center justify-between gap-2">
                <span>{g.grade_name}</span>
                <button type="button" onClick={() => deleteGrade(g)} className="text-red-600 text-sm font-semibold hover:underline shrink-0">Delete</button>
              </li>
            ))}
            {grades.length === 0 && <p className="text-gray-500 text-sm py-2">No grades yet</p>}
          </ul>
        )}
      </Card>

      <Card title="Subjects">
        <form onSubmit={addSubject} className="flex gap-2 mb-4">
          <input
            className={input}
            placeholder="e.g. Mathematics"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            required
          />
          <button className={btnGreen}>Add</button>
        </form>
        {loading ? (
          <p className="text-gray-600 text-sm">Loading...</p>
        ) : (
          <ul className="divide-y">
            {subjects.map((s) => (
              <li key={s.id} className="py-2 text-gray-800 flex items-center justify-between gap-2">
                <span>{s.subject_name}</span>
                <button type="button" onClick={() => deleteSubject(s)} className="text-red-600 text-sm font-semibold hover:underline shrink-0">Delete</button>
              </li>
            ))}
            {subjects.length === 0 && <p className="text-gray-500 text-sm py-2">No subjects yet</p>}
          </ul>
        )}
      </Card>

      <div className="md:col-span-2">
        <Alert>{error}</Alert>
      </div>
    </div>
  )
}
