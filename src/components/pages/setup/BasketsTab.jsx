import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function BasketsTab({ school, term }) {
  const [baskets, setBaskets] = useState([])
  const [subjects, setSubjects] = useState([])
  const [grades, setGrades] = useState([])
  const [items, setItems] = useState({})
  const [assignments, setAssignments] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [basketId, setBasketId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [assignBasket, setAssignBasket] = useState('')

  const load = useCallback(async () => {
    const [{ data: b }, { data: s }, { data: g }, { data: it }] = await Promise.all([
      supabase.from('subject_baskets').select('*').eq('school_id', school?.id).order('basket_name'),
      supabase.from('subjects').select('*').eq('school_id', school?.id).order('subject_name'),
      supabase.from('grades').select('*').eq('school_id', school?.id).order('grade_name'),
      supabase.from('subject_basket_items').select('*, subjects(subject_name)').eq('school_id', school?.id),
    ])
    setBaskets(b || [])
    setSubjects(s || [])
    setGrades(g || [])
    const map = {}
    ;(it || []).forEach((row) => {
      if (!map[row.basket_id]) map[row.basket_id] = []
      map[row.basket_id].push(row)
    })
    setItems(map)
    if (term) {
      const { data: a } = await supabase
        .from('grade_basket_assignments')
        .select('*, subject_baskets(basket_name), grades(grade_name)')
        .eq('school_id', school?.id)
        .eq('term_id', term.id)
      setAssignments(a || [])
    }
  }, [school?.id, term])

  useEffect(() => {
    load()
  }, [load])

  const addBasket = async (e) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('subject_baskets').insert([{ school_id: school?.id, basket_name: name.trim() }])
    if (error) return setError(error.message)
    setName('')
    load()
  }

  const addItem = async (e) => {
    e.preventDefault()
    if (!basketId || !subjectId) return
    setError('')
    const { error } = await supabase
      .from('subject_basket_items')
      .insert([{ school_id: school?.id, basket_id: basketId, subject_id: subjectId }])
    if (error) return setError(error.code === '23505' ? 'Subject already in basket.' : error.message)
    setSubjectId('')
    load()
  }

  const assign = async (e) => {
    e.preventDefault()
    if (!term) return setError('Set a current term first.')
    if (!gradeId || !assignBasket) return
    setError('')
    const { error } = await supabase.from('grade_basket_assignments').insert([
      { school_id: school?.id, grade_id: gradeId, basket_id: assignBasket, term_id: term.id },
    ])
    if (error) return setError(error.code === '23505' ? 'Already assigned.' : error.message)
    load()
  }

  return (
    <div className="space-y-6">
      <Card title="Create subject basket">
        <form onSubmit={addBasket} className="flex gap-2">
          <input className={input} placeholder="e.g. Sciences, Languages" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className={btnGreen}>Add</button>
        </form>
      </Card>
      <Card title="Add subject to basket">
        <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className={input} value={basketId} onChange={(e) => setBasketId(e.target.value)} required>
            <option value="">Basket</option>
            {baskets.map((b) => (
              <option key={b.id} value={b.id}>{b.basket_name}</option>
            ))}
          </select>
          <select className={input} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            <option value="">Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.subject_name}</option>
            ))}
          </select>
          <button className={btnGreen}>Add to basket</button>
        </form>
        <ul className="mt-4 space-y-2">
          {baskets.map((b) => (
            <li key={b.id} className="text-sm">
              <strong>{b.basket_name}:</strong>{' '}
              {(items[b.id] || []).map((i) => i.subjects?.subject_name).filter(Boolean).join(', ') || '—'}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Assign basket to class (current term)">
        {!term ? (
          <Alert>Set a current term first.</Alert>
        ) : (
          <form onSubmit={assign} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select className={input} value={gradeId} onChange={(e) => setGradeId(e.target.value)} required>
              <option value="">Grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.grade_name}</option>
              ))}
            </select>
            <select className={input} value={assignBasket} onChange={(e) => setAssignBasket(e.target.value)} required>
              <option value="">Basket</option>
              {baskets.map((b) => (
                <option key={b.id} value={b.id}>{b.basket_name}</option>
              ))}
            </select>
            <button className={btnGreen}>Assign</button>
          </form>
        )}
        <ul className="mt-3 text-sm space-y-1">
          {assignments.map((a) => (
            <li key={a.id}>
              {a.grades?.grade_name} ← {a.subject_baskets?.basket_name}
            </li>
          ))}
        </ul>
      </Card>
      <Alert>{error}</Alert>
    </div>
  )
}
