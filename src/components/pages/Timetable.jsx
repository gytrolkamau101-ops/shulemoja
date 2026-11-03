import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, NeedTerm, PageTitle, input, btn, btnGreen, th, td } from '../ui'

const DAYS = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
]
/** Kenya-style day: assembly, 40-min lessons, short break, mid-morning, lunch */
const PERIODS = [
  { n: 1, label: '1', time: '8:20–9:00' },
  { n: 2, label: '2', time: '9:00–9:40' },
  { n: 3, label: 'Break', time: '9:40–9:50', break: true },
  { n: 4, label: '3', time: '9:50–10:30' },
  { n: 5, label: '4', time: '10:30–11:10' },
  { n: 6, label: 'Break', time: '11:10–11:40', break: true },
  { n: 7, label: '5', time: '11:40–12:20' },
  { n: 8, label: '6', time: '12:20–1:00' },
  { n: 9, label: 'Lunch', time: '1:00–2:00', break: true },
  { n: 10, label: '7', time: '2:00–2:40' },
  { n: 11, label: '8', time: '2:40–3:20' },
]
const HEADS = ['Principal', 'Deputy Principal']

export default function Timetable({ school, user, term }) {
  const lockKey = `tt_lock_${school?.id || 'x'}`
  const [locked, setLocked] = useState(() => {
    try {
      return localStorage.getItem(lockKey) === '1'
    } catch {
      return false
    }
  })
  const isHead = HEADS.includes(user?.role)
  const canEdit = isHead && !locked
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [gradeId, setGradeId] = useState('')
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(null)
  const [subjectId, setSubjectId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [room, setRoom] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleLock = () => {
    if (!isHead) {
      setError('Only Principal or Deputy can lock or unlock the timetable.')
      return
    }
    if (locked) {
      if (!confirm('Unlock timetable? Staff will be able to see it is open for edits by heads only.')) return
    } else {
      if (!confirm('Lock timetable? This prevents accidental changes. Unlock later when you need to edit.')) return
    }
    const n = !locked
    setLocked(n)
    try {
      localStorage.setItem(lockKey, n ? '1' : '0')
    } catch (_) {}
  }

  const loadMeta = useCallback(async () => {
    const [{ data: g }, { data: s }, { data: t }] = await Promise.all([
      supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      supabase.from('subjects').select('*').eq('school_id', school?.id).order('subject_name'),
      supabase.from('users').select('id, full_name, role').eq('school_id', school?.id).eq('status', 'active').order('full_name'),
    ])
    setGrades(g || [])
    setSubjects(s || [])
    setTeachers(t || [])
    if (!gradeId && g?.length) setGradeId(g[0].id)
  }, [school?.id])

  const loadSlots = useCallback(async () => {
    if (!term || !gradeId) {
      setSlots([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('timetable_slots')
      .select('*, subjects(subject_name)')
      .eq('school_id', school?.id)
      .eq('term_id', term.id)
      .eq('grade_id', gradeId)
    if (error) setError(error.message)
    setSlots(data || [])
    setLoading(false)
  }, [school?.id, term, gradeId])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])
  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const cell = (day, period) => slots.find((s) => s.day_of_week === day && s.period_no === period)

  const openEdit = (day, period, isBreak) => {
    if (isBreak) return
    if (!isHead) {
      setError('Only Principal or Deputy can edit the timetable.')
      return
    }
    if (locked) {
      setError('Timetable is locked. Unlock first (with confirmation).')
      return
    }
    const c = cell(day, period)
    setEdit({ day, period })
    setSubjectId(c?.subject_id || '')
    setTeacherId(c?.teacher_id || '')
    setRoom(c?.room || '')
  }

  const saveSlot = async (e) => {
    e.preventDefault()
    if (!canEdit || !edit) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('timetable_slots').upsert(
      {
        school_id: school?.id,
        term_id: term.id,
        grade_id: gradeId,
        day_of_week: edit.day,
        period_no: edit.period,
        subject_id: subjectId || null,
        teacher_id: teacherId || null,
        room: room || null,
      },
      { onConflict: 'school_id,term_id,grade_id,day_of_week,period_no' }
    )
    setSaving(false)
    if (error) return setError(error.message)
    setEdit(null)
    loadSlots()
  }

  const clearSlot = async () => {
    if (!canEdit || !edit) return
    const c = cell(edit.day, edit.period)
    if (c?.id) {
      const { error } = await supabase.from('timetable_slots').delete().eq('id', c.id)
      if (error) return setError(error.message)
    }
    setEdit(null)
    loadSlots()
  }

  if (!term) {
    return (
      <div className="space-y-4">
        <PageTitle>Timetable</PageTitle>
        <NeedTerm />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Timetable" subtitle="Principal / Deputy set the grid. Staff view only when locked." />
      <Alert>{error}</Alert>
      <div className="flex flex-wrap gap-2 items-center">
        <select className={input} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.grade_name}
            </option>
          ))}
        </select>
        {isHead && (
          <button type="button" onClick={toggleLock} className={locked ? btnGreen : btn}>
            {locked ? 'Unlock timetable…' : 'Lock timetable…'}
          </button>
        )}
        {locked && <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg">Locked</span>}
        {!isHead && <span className="text-xs text-slate-500">View only</span>}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card className="!p-0">
          <Scroll>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Time</th>
                  {DAYS.map((d) => (
                    <th key={d.n} className={th}>
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p.n} className={p.break ? 'bg-slate-50' : ''}>
                    <td className={`${td} text-[10px] font-bold text-slate-500 whitespace-nowrap`}>
                      {p.label}
                      <br />
                      {p.time}
                    </td>
                    {DAYS.map((d) => {
                      if (p.break) {
                        return (
                          <td key={d.n} className={`${td} text-center text-[10px] text-slate-400 font-semibold`}>
                            {p.label}
                          </td>
                        )
                      }
                      const c = cell(d.n, p.n)
                      return (
                        <td
                          key={d.n}
                          onClick={() => openEdit(d.n, p.n, false)}
                          className={`${td} align-top min-w-[72px] ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                        >
                          {c?.subjects?.subject_name ? (
                            <>
                              <div className="font-semibold text-xs">{c.subjects.subject_name}</div>
                              <div className="text-[10px] text-slate-500">
                                {(teachers.find((t) => t.id === c.teacher_id) || {}).full_name || ''}
                              </div>
                            </>
                          ) : canEdit ? (
                            <span className="text-slate-300">+</span>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        </Card>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-4" onClick={() => setEdit(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">
              {DAYS.find((d) => d.n === edit.day)?.label} · Period {edit.period}
            </h3>
            <form onSubmit={saveSlot} className="space-y-3">
              <select className={input} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">— Subject —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
              <select className={input} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">— Teacher —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
              <input className={input} placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className={`${btnGreen} flex-1`}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={clearSlot} className={`${btn} flex-1`}>
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
