import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, btn, btnDanger, th, td } from '../ui'
import { canEditData } from '../../lib/roles'

const STATUSES = ['enquiry', 'interview', 'accepted', 'rejected', 'enrolled']

export default function Admissions({ school, user, term }) {
  const canEdit = canEditData(user?.role)
  const [rows, setRows] = useState([])
  const [grades, setGrades] = useState([])
  const [streams, setStreams] = useState([])
  const [form, setForm] = useState({
    full_name: '',
    guardian_phone: '',
    guardian_name: '',
    grade_id: '',
    stream_id: '',
    applying_grade: '',
  })
  const [error, setError] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [ok, setOk] = useState('')

  const load = useCallback(async () => {
    const [{ data }, { data: g }, { data: st }] = await Promise.all([
      supabase.from('admissions').select('*').eq('school_id', school?.id).order('created_at', { ascending: false }),
      supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      supabase.from('streams').select('*').eq('school_id', school?.id).order('stream_name'),
    ])
    setRows(data || [])
    setGrades(g || [])
    setStreams(st || [])
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const streamsForGrade = form.grade_id
    ? streams.filter((s) => !s.grade_id || s.grade_id === form.grade_id)
    : streams

  const createStudentFromAdmission = async (row) => {
    const parts = String(row.full_name || '').trim().split(/\s+/)
    const first_name = parts[0] || row.full_name || 'Learner'
    const last_name = parts.slice(1).join(' ') || '—'
    const admission_no = `ADM-${Date.now().toString().slice(-8)}`
    const { data: stu, error: sErr } = await supabase
      .from('students')
      .insert([
        {
          school_id: school?.id,
          first_name,
          last_name,
          admission_no,
          status: 'Active',
          parent_name: row.guardian_name || null,
          parent_phone: row.guardian_phone || null,
          date_admitted: new Date().toISOString().slice(0, 10),
        },
      ])
      .select('id')
      .maybeSingle()
    if (sErr) throw sErr
    let gradeId = row.grade_id
    if (!gradeId && row.applying_grade) {
      gradeId = grades.find((x) => x.grade_name === row.applying_grade)?.id
    }
    if (stu?.id && gradeId && term?.id) {
      const { error: eErr } = await supabase.from('student_enrollments').insert([
        {
          school_id: school?.id,
          student_id: stu.id,
          term_id: term.id,
          grade_id: gradeId,
          stream_id: row.stream_id || null,
        },
      ])
      if (eErr) throw new Error('Student created but class enrollment failed: ' + eErr.message)
    } else if (stu?.id && !term?.id) {
      throw new Error('Student created. Set a current term, then enroll under Students.')
    }
    return stu
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    setOk('')
    const gradeName = grades.find((g) => g.id === form.grade_id)?.grade_name || form.applying_grade
    const { error: err } = await supabase.from('admissions').insert([
      {
        school_id: school?.id,
        full_name: form.full_name.trim(),
        guardian_name: form.guardian_name || null,
        guardian_phone: form.guardian_phone || null,
        applying_grade: gradeName || null,
        grade_id: form.grade_id || null,
        stream_id: form.stream_id || null,
        status: 'enquiry',
      },
    ])
    if (err) {
      setError(err.message)
      return
    }
    setForm({ full_name: '', guardian_phone: '', guardian_name: '', grade_id: '', stream_id: '', applying_grade: '' })
    setOk('Enquiry saved.')
    load()
  }

  const setStatus = async (id, status) => {
    if (!canEdit) return
    setError('')
    setOk('')
    const row = rows.find((r) => r.id === id)
    // accepted or enrolled → official student list
    if (row && (status === 'accepted' || status === 'enrolled') && !['accepted', 'enrolled'].includes(row.status)) {
      try {
        await createStudentFromAdmission(row)
        setOk('Learner added to Students list.')
      } catch (e) {
        setError(e.message || String(e))
        return
      }
    }
    const { error } = await supabase.from('admissions').update({ status }).eq('id', id)
    if (error) setError(error.message)
    load()
  }

  const remove = async (id) => {
    if (!canEdit) return
    if (!confirm('Delete this admission record?')) return
    setError('')
    const { error } = await supabase.from('admissions').delete().eq('id', id)
    if (error) setError(error.message + ' — run SQL 28_v55_fixes.sql if delete is blocked.')
    else setOk('Admission deleted.')
    load()
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Admissions" subtitle="Set Accepted or Enrolled to add the learner to the official Students list" />
      <Alert>{error}</Alert>
      <Alert kind="ok">{ok}</Alert>
      {canEdit && (
        <Card title="New enquiry">
          <form onSubmit={submit} className="grid gap-2 md:grid-cols-2">
            <input className={input} placeholder="Learner full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <input className={input} placeholder="Guardian name" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
            <input className={input} placeholder="Guardian phone" value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
            <label className="text-xs font-bold text-slate-600">
              Grade
              <select className={input} value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value, stream_id: '' })}>
                <option value="">Select grade</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.grade_name}</option>
                ))}
              </select>
            </label>
            <button className={`${btnGreen} md:col-span-2`}>Save enquiry</button>
          </form>
        </Card>
      )}
      <select className={input} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
        <option value="">All grades</option>
        {grades.map((g) => (
          <option key={g.id} value={g.id}>{g.grade_name}</option>
        ))}
      </select>
      <Card className="!p-0">
        <Scroll>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Grade</th>
                <th className={th}>Guardian</th>
                <th className={th}>Status</th>
                {canEdit && <th className={th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(gradeFilter ? rows.filter((r) => r.grade_id === gradeFilter || r.applying_grade === gradeFilter) : rows).map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.full_name}</td>
                  <td className={td}>{r.applying_grade || '—'}</td>
                  <td className={td}>
                    {r.guardian_name || '—'}
                    <div className="text-xs text-slate-500">{r.guardian_phone}</div>
                  </td>
                  <td className={td}>{r.status}</td>
                  {canEdit && (
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        <select className={input} value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {r.status !== 'enrolled' && r.status !== 'rejected' && (
                          <button
                            type="button"
                            className="text-emerald-700 text-xs font-black px-2"
                            onClick={() => setStatus(r.id, 'enrolled')}
                          >
                            Enroll as student
                          </button>
                        )}
                        <button type="button" className="text-red-600 text-xs font-bold px-2" onClick={() => remove(r.id)}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
