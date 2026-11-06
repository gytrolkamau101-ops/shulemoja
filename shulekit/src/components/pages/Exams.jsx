import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { isOnline, enqueue } from '../../lib/offline'
import { toast } from '../ui'
import { Card, Scroll, Alert, NeedTerm, PageTitle, input, btn, btnGreen, th, td } from '../ui'

const EXAM_TYPES = [
  { id: 'cat', label: 'CAT / Continuous' },
  { id: 'midterm', label: 'Mid-term' },
  { id: 'endterm', label: 'End-term' },
  { id: 'project', label: 'Project' },
  { id: 'sba', label: 'SBA / Practical' },
]
const CBC_LEVELS = [
  { id: 'EE', label: 'EE — Exceeding Expectation' },
  { id: 'ME', label: 'ME — Meeting Expectation' },
  { id: 'AE', label: 'AE — Approaching Expectation' },
  { id: 'BE', label: 'BE — Below Expectation' },
]

function gradeFor(pct, bands) {
  if (!bands || bands.length === 0) {
    if (pct >= 80) return 'A'
    if (pct >= 70) return 'B'
    if (pct >= 60) return 'C'
    if (pct >= 50) return 'D'
    return 'E'
  }
  const sorted = [...bands].sort((a, b) => a.min_pct - b.min_pct)
  for (const b of sorted) {
    if (pct >= Number(b.min_pct) && pct <= Number(b.max_pct)) return b.label
  }
  return sorted[sorted.length - 1]?.label || '—'
}

export default function Exams({ school, user, term }) {
  const canManageExams = ['Principal', 'Deputy Principal', 'Senior Teacher', 'Teacher', 'Secretary'].includes(user?.role)
  const [exams, setExams] = useState([])
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [bands, setBands] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({}) // student_id -> marks string
  const [showExamForm, setShowExamForm] = useState(false)
  const [newExamName, setNewExamName] = useState('')
  const [newExamDate, setNewExamDate] = useState('')
  const [newExamType, setNewExamType] = useState('cat')
  const [levels, setLevels] = useState({}) // student_id -> CBC level for project/SBA
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const loadBase = useCallback(async () => {
    if (!term) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: ex }, { data: gr }, { data: su }, { data: sc }] = await Promise.all([
      supabase.from('exams').select('*').eq('school_id', school?.id).eq('term_id', term.id).order('exam_date', { ascending: false }),
      supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      supabase.from('subjects').select('*').eq('school_id', school?.id).order('subject_name'),
      supabase.from('grade_scales').select('id').eq('school_id', school?.id).eq('is_active', true).maybeSingle(),
    ])
    setExams(ex || [])
    setGrades(gr || [])
    setSubjects(su || [])
    if (sc?.id) {
      const { data: b } = await supabase.from('grade_bands').select('*').eq('scale_id', sc.id).order('sort_order')
      setBands(b || [])
    } else setBands([])
    setLoading(false)
  }, [school?.id, term])

  useEffect(() => {
    loadBase()
  }, [loadBase])

  // Load the class list + any existing marks whenever exam/grade/subject selection changes
  useEffect(() => {
    if (!selectedExam || !selectedGrade || !selectedSubject || !term) {
      setStudents([])
      return
    }
    ;(async () => {
      const { data: enrolled } = await supabase
        .from('student_enrollments')
        .select('students(id, admission_no, first_name, last_name)')
        .eq('term_id', term.id)
        .eq('grade_id', selectedGrade)
      const list = (enrolled || []).map((e) => e.students).filter(Boolean)
      setStudents(list)

      const { data: existing } = await supabase
        .from('exam_results')
        .select('student_id, marks_obtained, cbc_level, grade')
        .eq('exam_id', selectedExam)
        .eq('subject_id', selectedSubject)
      const m = {}
      const lv = {}
      ;(existing || []).forEach((r) => {
        m[r.student_id] = r.marks_obtained ?? ''
        if (r.cbc_level) lv[r.student_id] = r.cbc_level
        else if (r.grade && ['EE','ME','AE','BE'].includes(String(r.grade).toUpperCase().slice(0,2))) {
          lv[r.student_id] = String(r.grade).toUpperCase().slice(0,2)
        }
      })
      setMarks(m)
      setLevels(lv)
    })()
  }, [selectedExam, selectedGrade, selectedSubject, term])

  const createExam = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!term?.id) return setError('Set a current term in School Setup first.')
    const name = (newExamName || '').trim()
    if (!name) return setError('Enter an exam name (e.g. CAT 1).')
    if (!canManageExams) return setError('You do not have permission to create exams.')
    const { data, error } = await supabase
      .from('exams')
      .insert([{ school_id: school?.id, term_id: term.id, exam_name: name, exam_date: newExamDate || null, exam_type: newExamType || 'cat' }])
      .select('id')
      .maybeSingle()
    if (error) return setError(error.message)
    setNewExamName('')
      setNewExamType('cat')
    setNewExamDate('')
    setShowExamForm(false)
    setInfo(`Exam "${name}" created.`)
    if (data?.id) setSelectedExam(data.id)
    await loadBase()
  }

  const deleteExam = async () => {
    if (!canManageExams) return setError('You do not have permission to delete exams.')
    if (!selectedExam) return
    const name = exams.find((e) => e.id === selectedExam)?.exam_name || 'this exam'
    if (!confirm(`Delete exam "${name}" and all its marks? This cannot be undone.`)) return
    setError('')
    setInfo('')
    // marks first
    await supabase.from('exam_results').delete().eq('exam_id', selectedExam).eq('school_id', school?.id)
    const { error } = await supabase.from('exams').delete().eq('id', selectedExam).eq('school_id', school?.id)
    if (error) return setError(error.message + ' — exam delete may be blocked by RLS.')
    setSelectedExam('')
    setMarks({})
    setInfo('Exam deleted.')
    await loadBase()
  }

  const clearSubjectMarks = async () => {
    if (!canManageExams) return setError('You do not have permission to clear marks.')
    if (!selectedExam || !selectedSubject) return
    if (!confirm('Clear all marks for this subject in the selected exam?')) return
    setError('')
    const { error } = await supabase
      .from('exam_results')
      .delete()
      .eq('exam_id', selectedExam)
      .eq('subject_id', selectedSubject)
      .eq('school_id', school?.id)
    if (error) return setError(error.message)
    setMarks({})
    setInfo('Subject marks cleared.')
  }

  const saveMarks = async () => {
    setSaving(true)
    setError('')
    setInfo('')
    const examMeta = exams.find((e) => e.id === selectedExam)
    const isRubric = ['project', 'sba'].includes((examMeta?.exam_type || '').toLowerCase())
    const rows = students
      .filter((s) => (marks[s.id] !== undefined && marks[s.id] !== '') || (isRubric && levels[s.id]))
      .map((s) => {
        const obtained = marks[s.id] === '' || marks[s.id] === undefined
          ? null
          : Math.max(0, Math.min(100, Number(marks[s.id])))
        const cbc = levels[s.id] || null
        const letter = cbc || (obtained != null ? gradeFor(obtained, bands) : null)
        return {
          school_id: school?.id,
          exam_id: selectedExam,
          student_id: s.id,
          subject_id: selectedSubject,
          marks_obtained: obtained,
          total_marks: 100,
          grade: letter,
          cbc_level: cbc,
          entered_by: user?.id,
        }
      })
    if (rows.length === 0) {
      setSaving(false)
      return setError('Enter at least one mark before saving.')
    }
    if (!isOnline()) {
      enqueue('exam_results_upsert', { rows })
      setSaving(false)
      setInfo(`Saved ${rows.length} mark(s) offline — will sync when online.`)
      try { toast('Marks saved offline — will sync', 'ok') } catch (_) {}
      return
    }
    const { error } = await supabase
      .from('exam_results')
      .upsert(rows, { onConflict: 'exam_id,student_id,subject_id' })
    setSaving(false)
    if (error) return setError(error.message)
    setInfo(`Saved marks for ${rows.length} student(s).`)
  }


  useEffect(() => {
    ;(async () => {
      if (!selectedGrade || !term) return
      const { data: assigns } = await supabase
        .from('grade_basket_assignments')
        .select('basket_id')
        .eq('school_id', school?.id)
        .eq('grade_id', selectedGrade)
        .eq('term_id', term.id)
      const basketIds = (assigns || []).map((a) => a.basket_id)
      if (basketIds.length) {
        const { data: items } = await supabase
          .from('subject_basket_items')
          .select('subjects(*)')
          .eq('school_id', school?.id)
          .in('basket_id', basketIds)
        const seen = new Set()
        const list = []
        ;(items || []).forEach((row) => {
          if (row.subjects && !seen.has(row.subjects.id)) {
            seen.add(row.subjects.id)
            list.push(row.subjects)
          }
        })
        if (list.length) { setSubjects(list); return }
      }
      const { data: alloc } = await supabase
        .from('subject_allocations')
        .select('subjects(*)')
        .eq('school_id', school?.id)
        .eq('grade_id', selectedGrade)
        .eq('term_id', term.id)
      const fromAlloc = (alloc || []).map((a) => a.subjects).filter(Boolean)
      if (fromAlloc.length) setSubjects(fromAlloc)
    })()
  }, [selectedGrade, term, school?.id])

  if (!term) {
    return (
      <div className="space-y-6">
        <PageTitle>Examinations</PageTitle>
        <NeedTerm />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle
        right={
          canManageExams && (
            <button onClick={() => setShowExamForm((v) => !v)} className="px-4 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-b from-sky-400 to-blue-700 shadow-[0_4px_0_#1e3a8a,0_0_20px_rgba(56,189,248,0.55)] border border-sky-300 active:shadow-[0_1px_0_#1e3a8a] active:translate-y-0.5 hover:from-amber-300 hover:to-amber-500 hover:shadow-[0_4px_0_#b45309,0_0_22px_rgba(251,191,36,0.55)] hover:border-amber-200 transition">
              {showExamForm ? 'Cancel' : '+ Create exam'}
            </button>
          )
        }
      >
        Examinations
      </PageTitle>

      {!canManageExams && (
        <Alert kind="ok">Only Principal, Deputy, Senior Teacher, Teacher or Secretary can create exams.</Alert>
      )}
      {canManageExams && !showExamForm && (
        <button type="button" onClick={() => setShowExamForm(true)} className="w-full px-4 py-3 rounded-xl text-sm font-black text-white bg-gradient-to-b from-sky-400 to-blue-700 shadow-[0_4px_0_#1e3a8a,0_0_20px_rgba(56,189,248,0.55)] border border-sky-300 sm:w-auto">
          + Create exam
        </button>
      )}
      {showExamForm && (
        <Card title="Create new exam">
          <form onSubmit={createExam} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className={input}
              placeholder="Exam name (e.g. CAT 1, Mid Term)"
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
              required
            />
            <input
              type="date"
              className={input}
              value={newExamDate}
              onChange={(e) => setNewExamDate(e.target.value)}
            />
            <select className={input} value={newExamType} onChange={(e) => setNewExamType(e.target.value)}>
              {EXAM_TYPES.map((x) => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
            <div className="md:col-span-2">
              <Alert>{error}</Alert>
            </div>
            <button className={`${btnGreen} md:col-span-2`}>Create exam</button>
          </form>
        </Card>
      )}

      {grades.length === 0 || subjects.length === 0 ? (
        <Alert kind="ok">
          Add grades and subjects in School Setup first, then come back here to enter marks.
        </Alert>
      ) : (
        <>
        {exams.length === 0 && (
          <Alert kind="ok">
            No exams for this term yet. Tap <strong>+ Create exam</strong> (top right), name it (e.g. CAT 1), save, then enter marks.
          </Alert>
        )}
        <Card title="Enter / view marks">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="flex flex-wrap gap-2 items-center"><select className={input} value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
              <option value="">Select exam</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.exam_name}{ex.exam_type ? ` · ${ex.exam_type}` : ''}
                </option>
              ))}
            </select>
              {selectedExam && canManageExams && (
                <button type="button" onClick={deleteExam} className="px-3 py-2 rounded-xl border border-red-300 text-red-700 text-xs font-black bg-white shrink-0">
                  Delete selected exam
                </button>
              )}
            </div>
            <select className={input} value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
              <option value="">Select grade/class</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grade_name}
                </option>
              ))}
            </select>
            <select
              className={input}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject_name}
                </option>
              ))}
            </select>
          </div>

          {selectedExam && selectedGrade && selectedSubject && (
            <>
              {students.length === 0 ? (
                <Alert kind="ok">
                  No students are enrolled in this grade for the current term yet. Enroll students
                  under Students, or set their class in School Setup.
                </Alert>
              ) : (
                <>
                  <Scroll>
                    <table className="w-full mb-3">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className={th}>Adm No</th>
                          <th className={th}>Name</th>
                          <th className={th}>Marks (/100)</th>
                          <th className={th}>CBC level</th>
                          <th className={th}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => {
                          const v = marks[s.id] ?? ''
                          const examMeta = exams.find((e) => e.id === selectedExam)
                          const rubric = ['project', 'sba'].includes((examMeta?.exam_type || '').toLowerCase())
                          return (
                            <tr key={s.id} className="border-b">
                              <td className={td}>{s.admission_no}</td>
                              <td className={td}>
                                {s.first_name} {s.last_name}
                              </td>
                              <td className={td}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-20 p-1.5 border rounded"
                                  value={v}
                                  onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                                  placeholder={rubric ? 'opt' : ''}
                                />
                              </td>
                              <td className={td}>
                                <select
                                  className="p-1.5 border rounded text-xs font-bold"
                                  value={levels[s.id] || ''}
                                  onChange={(e) => setLevels({ ...levels, [s.id]: e.target.value })}
                                >
                                  <option value="">—</option>
                                  {CBC_LEVELS.map((c) => (
                                    <option key={c.id} value={c.id}>{c.id}</option>
                                  ))}
                                </select>
                              </td>
                              <td className={td}>
                                {levels[s.id] || (v !== '' ? gradeFor(Number(v), bands) : '—')}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </Scroll>
                  <Alert>{error}</Alert>
                  <Alert kind="ok">{info}</Alert>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button type="button" onClick={saveMarks} disabled={saving} className={btn}>
                      {saving ? 'Saving...' : 'Save marks'}
                    </button>
                    {canManageExams && (
                      <>
                        <button
                          type="button"
                          onClick={clearSubjectMarks}
                          className="px-4 py-2 rounded-xl border border-amber-300 text-amber-900 text-sm font-bold bg-amber-50"
                        >
                          Clear subject marks
                        </button>
                        <button
                          type="button"
                          onClick={deleteExam}
                          className="px-4 py-2 rounded-xl border border-red-300 text-red-700 text-sm font-bold bg-white"
                        >
                          Delete exam
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </Card>
        </>
      )}
    </div>
  )
}
