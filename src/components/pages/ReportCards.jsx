import { canExportReports } from '../../lib/plans'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, NeedTerm, PageTitle, input, th, td, btn, btnGreen } from '../ui'
import { letterFromMarks, loadActiveBands } from '../../lib/gradeScale'
import { openPrintDocument } from '../../lib/docHeader'

function cbcBand(pct) {
  const n = Number(pct)
  if (Number.isNaN(n)) return '—'
  if (n >= 80) return 'EE (Exceeding Expectation)'
  if (n >= 65) return 'ME (Meeting Expectation)'
  if (n >= 50) return 'AE (Approaching Expectation)'
  return 'BE (Below Expectation)'
}

function openPrintWindow(school, title, bodyHtml) {
  const ok = openPrintDocument({
    school,
    title,
    bodyHtml: `${bodyHtml}<p style="font-size:11px;margin-top:8px"><strong>CBC scale:</strong> EE Exceeding · ME Meeting · AE Approaching · BE Below Expectation</p><p class="no-print" style="margin-top:16px"><button onclick="window.print()">Print / Save PDF</button></p>`,
  })
  if (!ok) alert('Pop-up blocked. Allow pop-ups for this site to print/download reports.')
}

export default function ReportCards({ school, term }) {
  const [grades, setGrades] = useState([])
  const [gradeId, setGradeId] = useState('')
  const [exams, setExams] = useState([])
  const [examId, setExamId] = useState('')
  const [rows, setRows] = useState([])
  const [subjects, setSubjects] = useState([])
  const [bands, setBands] = useState([])
  const [scaleName, setScaleName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [examTrends, setExamTrends] = useState([]) // {name, avg}

  useEffect(() => {
    ;(async () => {
      if (!term) return
      const [{ data: g }, { data: e }, b] = await Promise.all([
        supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
        supabase
          .from('exams')
          .select('*')
          .eq('school_id', school?.id)
          .eq('term_id', term.id)
          .order('exam_date', { ascending: false }),
        loadActiveBands(supabase, school?.id),
      ])
      setGrades(g || [])
      setExams(e || [])
      setBands(b || [])
      if (g?.length) setGradeId((id) => id || g[0].id)
      if (e?.length) setExamId((id) => id || e[0].id)
      const { data: scales } = await supabase
        .from('grade_scales')
        .select('scale_name, is_active')
        .eq('school_id', school?.id)
        .eq('is_active', true)
        .maybeSingle()
      setScaleName(scales?.scale_name || (b?.length ? 'Active scale' : 'No scale — seed CBC in Setup → Grading'))
    })()
  }, [school?.id, term])

  const resolveLetter = (marks, stored) => {
    if (stored) return stored
    return letterFromMarks(marks, bands) || '—'
  }

  const loadReport = useCallback(async () => {
    if (!term || !gradeId || !examId) return
    setLoading(true)
    setError('')
    try {
      const { data: enr } = await supabase
        .from('student_enrollments')
        .select('students(id, admission_no, first_name, last_name, status, parent_phone)')
        .eq('term_id', term.id)
        .eq('grade_id', gradeId)
      const students = (enr || [])
        .map((e) => e.students)
        .filter((s) => s && (!s.status || s.status === 'Active' || s.status === 'Suspended'))
      const [{ data: results }, { data: allocs }] = await Promise.all([
        supabase
          .from('exam_results')
          .select('student_id, subject_id, marks_obtained, grade, subjects(subject_name)')
          .eq('exam_id', examId)
          .eq('school_id', school?.id),
        supabase
          .from('subject_allocations')
          .select('subjects(subject_name)')
          .eq('grade_id', gradeId)
          .eq('term_id', term.id),
      ])
      let subSet = new Set((allocs || []).map((a) => a.subjects?.subject_name).filter(Boolean))
      if (subSet.size === 0) {
        const { data: allSubs } = await supabase
          .from('subjects')
          .select('subject_name')
          .eq('school_id', school?.id)
          .order('subject_name')
        subSet = new Set((allSubs || []).map((s) => s.subject_name).filter(Boolean))
      }
      const byStudent = {}
      students.forEach((s) => {
        byStudent[s.id] = { student: s, subjects: {}, total: 0, count: 0 }
      })
      ;(results || []).forEach((r) => {
        const name = r.subjects?.subject_name || String(r.subject_id).slice(0, 6)
        subSet.add(name)
        if (!byStudent[r.student_id]) return
        const marks = r.marks_obtained
        const letter = resolveLetter(marks, r.grade)
        byStudent[r.student_id].subjects[name] = { marks, grade: letter }
        byStudent[r.student_id].total += Number(marks || 0)
        byStudent[r.student_id].count += 1
      })
      const list = Object.values(byStudent)
        .map((row) => ({
          ...row,
          average: row.count ? (row.total / row.count).toFixed(1) : '—',
          avgLetter: row.count ? letterFromMarks(row.total / row.count, bands) || '—' : '—',
        }))
        .sort((a, b) =>
          `${a.student.last_name}${a.student.first_name}`.localeCompare(
            `${b.student.last_name}${b.student.first_name}`
          )
        )
      setSubjects([...subSet].sort())
      setRows(list)
    } catch (e) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [term, gradeId, examId, school?.id, bands])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const classStats = (() => {
    if (!rows?.length) return null
    const avgs = rows.map((r) => Number(r.average) || 0).filter((n) => n > 0)
    if (!avgs.length) return null
    const sum = avgs.reduce((a, b) => a + b, 0)
    const mean = sum / avgs.length
    const sorted = [...avgs].sort((a, b) => a - b)
    const mid = sorted[Math.floor(sorted.length / 2)]
    const max = sorted[sorted.length - 1]
    const min = sorted[0]
    const pass = avgs.filter((x) => x >= 50).length
    return { mean, mid, max, min, pass, n: avgs.length, passRate: (pass / avgs.length) * 100 }
  })()

  useEffect(() => {
    if (!term || !gradeId || !school?.id) {
      setExamTrends([])
      return
    }
    let alive = true
    ;(async () => {
      const { data: examList } = await supabase
        .from('exams')
        .select('id, exam_name, exam_date')
        .eq('school_id', school.id)
        .eq('term_id', term.id)
        .order('exam_date')
      if (!examList?.length) {
        if (alive) setExamTrends([])
        return
      }
      const trends = []
      for (const ex of examList) {
        const { data: marks } = await supabase
          .from('exam_marks')
          .select('marks_obtained, student_id')
          .eq('exam_id', ex.id)
          .eq('school_id', school.id)
        const byStu = {}
        ;(marks || []).forEach((m) => {
          if (!byStu[m.student_id]) byStu[m.student_id] = []
          byStu[m.student_id].push(Number(m.marks_obtained) || 0)
        })
        // limit to class enrollments
        const { data: enr } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .eq('term_id', term.id)
          .eq('grade_id', gradeId)
        const ids = new Set((enr || []).map((e) => e.student_id))
        const avgs = Object.entries(byStu)
          .filter(([id]) => ids.has(id))
          .map(([, arr]) => arr.reduce((a, b) => a + b, 0) / arr.length)
        const classAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0
        trends.push({ name: ex.exam_name, avg: Math.round(classAvg * 10) / 10 })
      }
      if (alive) setExamTrends(trends)
    })()
    return () => {
      alive = false
    }
  }, [term, gradeId, school?.id])


  const gradeName = grades.find((g) => g.id === gradeId)?.grade_name || ''
  const examName = exams.find((e) => e.id === examId)?.exam_name || exams.find((e) => e.id === examId)?.name || ''
  const header = `${school?.school_name || 'School'} · ${gradeName} · ${examName} · Term ${term?.term}/${term?.year}`

  const downloadClassReport = () => {
    if (!rows.length) {
      setError('No learners to print. Check class enrolment and exam marks.')
      return
    }
    const head = subjects.map((s) => `<th>${s}<br/><span style="font-weight:400;font-size:10px">Mark / Grade</span></th>`).join('')
    const body = [...rows]
      .sort((a, b) => Number(b.average || 0) - Number(a.average || 0))
      .map((r, idx) => {
        const cells = subjects
          .map((s) => {
            const cell = r.subjects[s]
            if (!cell) return '<td>—</td>'
            return `<td>${cell.marks ?? '—'} <strong>${cell.grade || ''}</strong></td>`
          })
          .join('')
        return `<tr><td>${idx + 1}</td><td>${r.student.admission_no || ''}</td><td>${r.student.first_name} ${r.student.last_name}</td>${cells}<td class="avg">${r.average} (${r.avgLetter})</td></tr>`
      })
      .join('')
    openPrintWindow(
      school,
      `Class report ${gradeName}`,
      `<h2 style="text-align:center">${header}</h2><p style="text-align:center">Scale: ${scaleName}</p>
      <table><thead><tr><th>#</th><th>Adm</th><th>Name</th>${head}<th>Avg</th></tr></thead><tbody>${body}</tbody></table>`
    )
  }

  const printStudent = (r) => {
    if (!canExportReports(school)) { alert("PDF report cards are available on Premium and Pro."); return }

    const rowsHtml = subjects
      .map((s) => {
        const cell = r.subjects[s]
        return `<tr><td>${s}</td><td>${cell?.marks ?? '—'}</td><td>${cell?.grade ?? '—'}</td></tr>`
      })
      .join('')
    openPrintWindow(
      school,
      `Report ${r.student.first_name} ${r.student.last_name}`,
      `<h2 style="text-align:center">${r.student.first_name} ${r.student.last_name} · Adm ${r.student.admission_no || '—'}</h2>
      <p style="text-align:center">${header}<br/>Scale: ${scaleName}</p>
      <table><thead><tr><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead><tbody>${rowsHtml}
      <tr><td colspan="2"><strong>Average</strong></td><td class="avg">${r.average} (${r.avgLetter})</td></tr>
      </tbody></table>`
    )
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Report cards"
        subtitle={`Grading scale: ${scaleName}. CBC bands: EE Exceeding · ME Meeting · AE Approaching · BE Below. Seed scale under Setup → Grading if empty.`}
      />
      {!term && <NeedTerm />}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <label className="text-sm font-bold text-slate-700">
            Class
            <select className={input} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grade_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Exam
            <select className={input} value={examId} onChange={(e) => setExamId(e.target.value)}>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.exam_name || e.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 items-end">
            <button type="button" className={btn} onClick={loadReport} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button type="button" className={btnGreen} onClick={downloadClassReport} disabled={!rows.length}>
              Print / PDF class
            </button>
          </div>
        </div>
        {classStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Class average</p>
              <p className="font-black">{classStats.mean.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Median</p>
              <p className="font-black">{classStats.mid.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Highest</p>
              <p className="font-black text-emerald-700">{classStats.max.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Lowest</p>
              <p className="font-black text-red-600">{classStats.min.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Pass rate (≥50%)</p>
              <p className="font-black">{classStats.passRate.toFixed(0)}%</p>
            </div>
          </div>
        )}
        
        {examTrends.length > 1 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-black uppercase text-slate-500 mb-2">Class average trend (this term)</p>
            <div className="flex items-end gap-2 h-24">
              {examTrends.map((ex) => {
                const h = Math.max(4, Math.min(100, ex.avg))
                return (
                  <div key={ex.name} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-700">{ex.avg}</span>
                    <div className="w-full bg-slate-100 rounded-t" style={{ height: `${h}%` }}>
                      <div className="w-full h-full bg-blue-600 rounded-t opacity-90" />
                    </div>
                    <span className="text-[9px] text-slate-500 truncate max-w-full">{ex.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Alert kind="error">{error}</Alert>
      </Card>
      <Card className="!p-0 overflow-x-auto">
        <Scroll>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Adm</th>
                <th className={th}>Name</th>
                {subjects.map((s) => (
                  <th key={s} className={th}>
                    {s}
                  </th>
                ))}
                <th className={th}>Avg</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => Number(b.average || 0) - Number(a.average || 0))
                .map((r, idx) => (
                  <tr key={r.student.id}>
                    <td className={td}>{idx + 1}</td>
                    <td className={td}>{r.student.admission_no}</td>
                    <td className={td}>
                      {r.student.first_name} {r.student.last_name}
                    </td>
                    {subjects.map((s) => (
                      <td key={s} className={td}>
                        {r.subjects[s]?.marks ?? '—'}
                        {r.subjects[s]?.grade ? (
                          <span className="block text-[10px] font-bold text-slate-600">{r.subjects[s].grade}</span>
                        ) : null}
                      </td>
                    ))}
                    <td className={td}>
                      {r.average}
                      <span className="block text-[10px] font-bold text-slate-600">{r.avgLetter}</span>
                    </td>
                    <td className={td}>
                      <button type="button" className="text-blue-700 font-bold text-xs underline" onClick={() => printStudent(r)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
