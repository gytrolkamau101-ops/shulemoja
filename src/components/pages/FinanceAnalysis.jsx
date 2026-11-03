import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, PageTitle, Alert, NeedTerm, fmt, input, th, td, Scroll } from '../ui'

export default function FinanceAnalysis({ school, term }) {
  const [mode, setMode] = useState('term') // term | year
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [error, setError] = useState('')
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const [stuPays, setStuPays] = useState([])
  const [stuMarks, setStuMarks] = useState([])

  useEffect(() => {
    if (!school?.id) return
    ;(async () => {
      setError('')
      try {
        let payQ = supabase
          .from('fee_payments')
          .select('amount_paid, payment_date, student_id')
          .eq('school_id', school.id)
        let expQ = supabase
          .from('expenses')
          .select('amount, expense_date, expense_type')
          .eq('school_id', school.id)
        if (mode === 'term' && term?.id) {
          payQ = payQ.eq('term_id', term.id)
          expQ = expQ.eq('term_id', term.id)
        } else if (mode === 'year') {
          const y = term?.year || new Date().getFullYear()
          payQ = payQ.gte('payment_date', `${y}-01-01`).lte('payment_date', `${y}-12-31`)
          expQ = expQ.gte('expense_date', `${y}-01-01`).lte('expense_date', `${y}-12-31`)
        }
        const [{ data: p }, { data: e }, { data: s }] = await Promise.all([
          payQ.limit(2000),
          expQ.limit(2000),
          supabase
            .from('students')
            .select('id, first_name, last_name, admission_no')
            .eq('school_id', school.id)
            .eq('status', 'Active')
            .order('first_name')
            .limit(500),
        ])
        setPayments(p || [])
        setExpenses(e || [])
        setStudents(s || [])
      } catch (err) {
        setError(err.message || String(err))
      }
    })()
  }, [school?.id, term?.id, term?.year, mode])

  useEffect(() => {
    if (!studentId || !school?.id) {
      setStuPays([])
      setStuMarks([])
      return
    }
    ;(async () => {
      const [{ data: pays }, { data: marks }] = await Promise.all([
        supabase
          .from('fee_payments')
          .select('amount_paid, payment_date, payment_method')
          .eq('school_id', school.id)
          .eq('student_id', studentId)
          .order('payment_date', { ascending: true })
          .limit(40),
        supabase
          .from('exam_results')
          .select('marks_obtained, exams(exam_name, exam_date)')
          .eq('school_id', school.id)
          .eq('student_id', studentId)
          .order('updated_at', { ascending: true })
          .limit(80),
      ])
      setStuPays(pays || [])
      setStuMarks(marks || [])
    })()
  }, [studentId, school?.id])

  const stats = useMemo(() => {
    const collected = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0)
    const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const byMonth = {}
    payments.forEach((p) => {
      const m = (p.payment_date || '').slice(0, 7) || 'unknown'
      if (!byMonth[m]) byMonth[m] = { in: 0, out: 0 }
      byMonth[m].in += Number(p.amount_paid || 0)
    })
    expenses.forEach((e) => {
      const m = (e.expense_date || '').slice(0, 7) || 'unknown'
      if (!byMonth[m]) byMonth[m] = { in: 0, out: 0 }
      byMonth[m].out += Number(e.amount || 0)
    })
    const months = Object.keys(byMonth).sort()
    const max = Math.max(1, ...months.map((m) => Math.max(byMonth[m].in, byMonth[m].out)))
    const byCat = {}
    expenses.forEach((e) => {
      const c = e.expense_type || 'Other'
      byCat[c] = (byCat[c] || 0) + Number(e.amount || 0)
    })
    return { collected, spent, net: collected - spent, byMonth, months, max, byCat }
  }, [payments, expenses])

  const examTrend = useMemo(() => {
    const byExam = {}
    stuMarks.forEach((r) => {
      const name = r.exams?.exam_name || 'Exam'
      if (!byExam[name]) byExam[name] = []
      byExam[name].push(Number(r.marks_obtained) || 0)
    })
    return Object.entries(byExam).map(([name, arr]) => ({
      name,
      avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10,
    }))
  }, [stuMarks])

  const maxStuPay = Math.max(1, ...stuPays.map((p) => Number(p.amount_paid) || 0))

  return (
    <div className="space-y-4">
      <PageTitle
        title="Financial analysis"
        subtitle="Collections, expenses, and learner fee × exam timeline (Pro)"
        right={
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-black ${mode === 'term' ? 'bg-blue-700 text-white' : 'bg-slate-100'}`}
              onClick={() => setMode('term')}
            >
              This term
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-black ${mode === 'year' ? 'bg-blue-700 text-white' : 'bg-slate-100'}`}
              onClick={() => setMode('year')}
            >
              Calendar year
            </button>
          </div>
        }
      />
      {!term && mode === 'term' && <NeedTerm />}
      <Alert>{error}</Alert>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <p className="text-[10px] font-black uppercase text-slate-500">Collected</p>
          <p className="text-2xl font-black text-emerald-700">KES {fmt(stats.collected)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-black uppercase text-slate-500">Expenses</p>
          <p className="text-2xl font-black text-red-600">KES {fmt(stats.spent)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-black uppercase text-slate-500">Net</p>
          <p className={`text-2xl font-black ${stats.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>KES {fmt(stats.net)}</p>
        </Card>
      </div>

      <Card title="Monthly trend">
        {stats.months.length === 0 ? (
          <p className="text-sm text-slate-600">No payment/expense rows in this period.</p>
        ) : (
          <div className="space-y-3">
            {stats.months.map((m) => (
              <div key={m}>
                <p className="text-xs font-bold text-slate-600 mb-1">{m}</p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 h-3 rounded bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(stats.byMonth[m].in / stats.max) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold w-20 text-right">In {fmt(stats.byMonth[m].in)}</span>
                </div>
                <div className="flex gap-2 items-center mt-1">
                  <div className="flex-1 h-3 rounded bg-slate-100 overflow-hidden">
                    <div className="h-full bg-red-400" style={{ width: `${(stats.byMonth[m].out / stats.max) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold w-20 text-right">Out {fmt(stats.byMonth[m].out)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Expense mix">
        {Object.keys(stats.byCat).length === 0 ? (
          <p className="text-sm text-slate-600">Log expenses under School finance (food, utilities, trips…).</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {Object.entries(stats.byCat)
              .sort((a, b) => b[1] - a[1])
              .map(([c, v]) => (
                <li key={c} className="flex justify-between border-b border-slate-100 py-1">
                  <span className="font-semibold">{c}</span>
                  <span className="font-black">KES {fmt(v)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <Card title="Learner timeline — fees × exams">
        <label className="text-xs font-bold text-slate-600 block mb-2">
          Select learner
          <select className={input} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Choose…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.admission_no} — {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </label>
        {!studentId ? (
          <p className="text-sm text-slate-500">Pick a learner to compare fee payments with exam averages.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-xs font-black uppercase text-slate-500 mb-2">Fee payments</p>
              {stuPays.length === 0 ? (
                <p className="text-sm text-slate-500">No payments recorded</p>
              ) : (
                <div className="flex items-end gap-1.5 h-28">
                  {stuPays.map((p, i) => {
                    const amt = Number(p.amount_paid) || 0
                    const h = Math.max(6, Math.round((amt / maxStuPay) * 96))
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full min-w-0">
                        <span className="text-[8px] font-bold text-emerald-800">{amt >= 1000 ? Math.round(amt / 1000) + 'k' : amt}</span>
                        <div className="w-full max-w-[1.75rem] bg-emerald-500 rounded-t" style={{ height: h }} />
                        <span className="text-[7px] text-slate-500 truncate max-w-full">
                          {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              <Scroll>
                <table className="w-full text-xs mt-2">
                  <thead>
                    <tr>
                      <th className={th}>Date</th>
                      <th className={th}>Amount</th>
                      <th className={th}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stuPays.map((p, i) => (
                      <tr key={i}>
                        <td className={td}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB') : '—'}</td>
                        <td className={td}>KES {fmt(p.amount_paid)}</td>
                        <td className={td}>{p.payment_method || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-500 mb-2">Exam averages</p>
              {examTrend.length === 0 ? (
                <p className="text-sm text-slate-500">No exam marks</p>
              ) : (
                <div className="flex items-end gap-2 h-28">
                  {examTrend.map((ex) => {
                    const h = Math.max(8, Math.round((Math.min(100, ex.avg) / 100) * 96))
                    return (
                      <div key={ex.name} className="flex-1 flex flex-col items-center justify-end gap-1 h-full min-w-0">
                        <span className="text-[10px] font-bold text-slate-700">{ex.avg}</span>
                        <div className="w-full max-w-[2.5rem] bg-blue-600 rounded-t" style={{ height: h }} />
                        <span className="text-[8px] text-slate-500 truncate max-w-full text-center">{ex.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
