import { canExportReports } from '../../lib/plans'
import { canEditFinance } from '../../lib/roles'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { isOnline, enqueue } from '../../lib/offline'
import { logAudit } from '../../lib/audit'
import { Card, Scroll, Alert, NeedTerm, PageTitle, input, btn, btnGreen, th, td, fmt, toast } from '../ui'
import { computeAllBalances, sumOutstanding, sumCollected } from '../../lib/feeBalances'
import { openPrintDocument } from '../../lib/docHeader'

export default function StudentFinance({ school, term, user }) {
  const canEdit = canEditFinance(user?.role)
  const [gradeFilter, setGradeFilter] = useState('all')
  const [grades, setGrades] = useState([])
  const [students, setStudents] = useState([])
  const [payments, setPayments] = useState([])
  const [feeStructures, setFeeStructures] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [openings, setOpenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [receipt, setReceipt] = useState('')
  const [notes, setNotes] = useState('')
  const [pendingStk, setPendingStk] = useState([])
  const [matchBusy, setMatchBusy] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [arrearsStudent, setArrearsStudent] = useState('')
  const [arrearsAmt, setArrearsAmt] = useState('')
  const [view, setView] = useState('balances')

  const printStatement = (student, paidAmt, bal) => {
    try {
      const name = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
      const ok = openPrintDocument({
        school,
        title: 'Fee statement',
        bodyHtml: `
        <h2 style="text-align:center">Fee statement</h2>
        <p style="text-align:center"><strong>${name}</strong> · Adm ${student?.admission_no || '—'}</p>
        <p style="text-align:center">Term ${term?.term || ''}, ${term?.year || ''}</p>
        <table><tr><th>Description</th><th>Amount (KES)</th></tr>
        <tr><td>Recorded payments (this term)</td><td>${Number(paidAmt || 0).toLocaleString()}</td></tr>
        <tr><td>Outstanding balance (approx.)</td><td>${bal == null ? '—' : Number(bal).toLocaleString()}</td></tr>
        </table>`,
      })
      if (!ok) toast('Allow pop-ups to print the statement', 'error')
    } catch (e) {
      toast(e?.message || 'Could not print', 'error')
    }
  }

  const fetchAll = useCallback(async () => {
    if (!term) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [{ data: s }, { data: p }, { data: fs }, { data: enr }, { data: op }, { data: g }] =
        await Promise.all([
          supabase
            .from('students')
            .select('id, admission_no, first_name, last_name, parent_phone')
            .eq('school_id', school?.id)
            .eq('status', 'Active')
            .order('first_name'),
          supabase
            .from('fee_payments')
            .select('*, students(admission_no, first_name, last_name)')
            .eq('school_id', school?.id)
            .eq('term_id', term.id)
            .order('payment_date', { ascending: false }),
          supabase.from('fee_structures').select('*').eq('school_id', school?.id).eq('term_id', term.id),
          supabase
            .from('student_enrollments')
            .select('student_id, grade_id')
            .eq('school_id', school?.id)
            .eq('term_id', term.id),
          supabase
            .from('fee_opening_balances')
            .select('student_id, amount')
            .eq('school_id', school?.id)
            .eq('term_id', term.id),
          supabase.from('grades').select('id, grade_name').eq('school_id', school?.id).order('grade_name'),
        ])
      setStudents(s || [])
      setPayments(p || [])
      setFeeStructures(fs || [])
      setEnrollments(enr || [])
      setOpenings(op || [])
      setGrades(g || [])
    } catch (e) {
      setError(e.message || 'Failed to load fees')
    }
    setLoading(false)
  }, [school?.id, term])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase
          .from('subscription_events')
          .select('*')
          .eq('school_id', school?.id)
          .ilike('api_ref', 'fee-%')
          .order('created_at', { ascending: false })
          .limit(40)
        if (alive) setPendingStk(data || [])
      } catch (_) {
        if (alive) setPendingStk([])
      }
    })()
    return () => {
      alive = false
    }
  }, [school?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const gradeByStudent = useMemo(() => {
    const map = {}
    ;(enrollments || []).forEach((e) => {
      map[e.student_id] = e.grade_id
    })
    return map
  }, [enrollments])

  const filteredStudents = useMemo(() => {
    if (gradeFilter === 'all') return students
    return students.filter((s) => gradeByStudent[s.id] === gradeFilter)
  }, [students, gradeFilter, gradeByStudent])

  const totalCollected = useMemo(() => sumCollected(payments), [payments])
  const balances = useMemo(
    () => computeAllBalances(students, enrollments, feeStructures, payments, openings),
    [students, enrollments, feeStructures, payments, openings]
  )

  const printClassFeeList = () => {
    const gmap = Object.fromEntries((grades || []).map((g) => [g.id, g.grade_name]))
    const list = (filteredBalances || balances || []).slice()
    const gradeLabel =
      gradeFilter && gradeFilter !== 'all' ? gmap[gradeFilter] || 'Class' : 'All grades'
    const rows = list
      .map((b, i) => {
        const name = `${b.first_name || ''} ${b.last_name || ''}`.trim()
        const g = gmap[b.gradeId] || '—'
        const bal = b.balance == null ? '—' : Number(b.balance).toLocaleString()
        return `<tr><td>${i + 1}</td><td>${b.admission_no || ''}</td><td>${name}</td><td>${g}</td><td>${Number(b.termFee || 0).toLocaleString()}</td><td>${Number(b.arrears || 0).toLocaleString()}</td><td>${Number(b.paid || 0).toLocaleString()}</td><td>${bal}</td></tr>`
      })
      .join('')
    const ok = openPrintDocument({
      school,
      title: `Fee list — ${gradeLabel}`,
      bodyHtml: `<h2 style="text-align:center">Class fee list — ${gradeLabel}</h2>
        <p style="text-align:center">Term ${term?.term || ''} · ${term?.year || ''} · ${list.length} learner(s)</p>
        <table><thead><tr><th>#</th><th>Adm</th><th>Name</th><th>Grade</th><th>Term fee</th><th>Arrears</th><th>Paid</th><th>Balance</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8">No rows</td></tr>'}</tbody></table>
        <p class="no-print" style="margin-top:12px"><button onclick="window.print()">Print / Save PDF</button></p>`,
    })
    if (!ok) toast('Allow pop-ups to print the fee list', 'error')
  }

  const exportBalancesCsv = () => {
    const gmap = Object.fromEntries((grades || []).map((g) => [g.id, g.grade_name]))
    const rows = (balances || []).map((b) => ({
      admission_no: b.admission_no || '',
      name: `${b.first_name || ''} ${b.last_name || ''}`.trim(),
      grade: gmap[b.gradeId] || '',
      term_fee: b.termFee ?? '',
      arrears: b.arrears ?? '',
      paid: b.paid ?? '',
      balance: b.balance ?? '',
    }))
    const header = ['admission_no', 'name', 'grade', 'term_fee', 'arrears', 'paid', 'balance']
    const lines = [header.join(',')]
    rows.forEach((r) => lines.push(header.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fee_balances_${school?.school_code || 'school'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const shareReceiptWa = (student, amount, method, receiptNo) => {
    const name = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
    const text = encodeURIComponent(
      `Fee receipt — ${school?.school_name || 'School'}\nLearner: ${name}\nAdm: ${student?.admission_no || '—'}\nAmount: KES ${Number(amount || 0).toLocaleString()}\nMethod: ${method || '—'}\nReceipt: ${receiptNo || '—'}\nThank you.`
    )
    const phone = String(student?.parent_phone || '').replace(/\D/g, '')
    const local = phone.startsWith('0') ? '254' + phone.slice(1) : phone
    window.open(local ? `https://wa.me/${local}?text=${text}` : `https://wa.me/?text=${text}`, '_blank')
  }
  const filteredBalances = useMemo(() => {
    if (gradeFilter === 'all') return balances
    return balances.filter((b) => b.gradeId === gradeFilter)
  }, [balances, gradeFilter])
  const totalOwed = useMemo(() => sumOutstanding(filteredBalances), [filteredBalances])
  const filteredPayments = useMemo(() => {
    if (gradeFilter === 'all') return payments
    return payments.filter((p) => gradeByStudent[p.student_id] === gradeFilter)
  }, [payments, gradeFilter, gradeByStudent])

  const removePayment = async (p) => {
    if (!canEdit) return
    if (!confirm('Delete this payment?')) return
    setError('')
    const { error } = await supabase.from('fee_payments').delete().eq('id', p.id)
    if (error) setError(error.message)
    else {
      try {
        await logAudit('fee.payment_delete', 'fee_payments', p.id, { amount: p.amount_paid })
      } catch (_) {}
      toast('Payment deleted', 'ok')
      fetchAll()
    }
  }

  const postStkAsFee = async (ev) => {
    const ref = String(ev.api_ref || '')
    const parts = ref.split('-')
    const sid = parts.length >= 3 ? parts[2] : null
    if (!sid || sid.length < 20) {
      setError('Cannot read student from api_ref.')
      return
    }
    setMatchBusy(true)
    setError('')
    const receipt = ev.invoice_id || ref
    const { data: existing } = await supabase
      .from('fee_payments')
      .select('id')
      .eq('school_id', school.id)
      .eq('receipt_no', String(receipt))
      .maybeSingle()
    if (existing) {
      setMatchBusy(false)
      setError('Already posted (same receipt).')
      return
    }
    const { error } = await supabase.from('fee_payments').insert([
      {
        school_id: school.id,
        student_id: sid,
        term_id: term?.id || null,
        amount_paid: Number(ev.amount || 0),
        payment_method: 'M-Pesa STK',
        payment_date: (ev.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
        receipt_no: String(receipt),
        notes: 'Matched from STK',
      },
    ])
    setMatchBusy(false)
    if (error) setError(error.message)
    else {
      toast('Matched to ledger', 'ok')
      fetchAll()
    }
  }

  const saveArrears = async (e) => {
    e.preventDefault()
    if (!canEdit || !term) return
    if (!arrearsStudent) return setError('Choose student for arrears')
    setSaving(true)
    setError('')
    const { error } = await supabase.from('fee_opening_balances').upsert(
      [
        {
          school_id: school?.id,
          student_id: arrearsStudent,
          term_id: term.id,
          amount: Number(arrearsAmt) || 0,
        },
      ],
      { onConflict: 'school_id,student_id,term_id' }
    )
    setSaving(false)
    if (error) setError(error.message)
    else {
      setArrearsStudent('')
      setArrearsAmt('')
      fetchAll()
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!canEdit || !term) return
    setError('')
    if (!studentId) return setError('Choose a student')
    setSaving(true)
    const row = {
      school_id: school?.id,
      term_id: term.id,
      student_id: studentId,
      amount_paid: Number(amount),
      payment_method: method,
      receipt_no: receipt || null,
      notes,
    }
    if (!isOnline()) {
      enqueue('fee_payment', row)
      setSaving(false)
      toast('Payment queued offline', 'info')
      setStudentId('')
      setAmount('')
      setReceipt('')
      setNotes('')
      setShowForm(false)
      return
    }
    const { error } = await supabase.from('fee_payments').insert([row])
    setSaving(false)
    if (error) {
      setError(error.code === '23505' ? 'That receipt number has already been used.' : error.message)
      return
    }
    try {
      await logAudit('fee.payment', 'fee_payments', studentId, { amount: Number(amount), method })
    } catch (_) {}
    toast('Payment recorded', 'ok')
    setStudentId('')
    setAmount('')
    setReceipt('')
    setNotes('')
    setShowForm(false)
    fetchAll()
  }

  if (!term) {
    return (
      <div className="space-y-4">
                <NeedTerm />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-2">
        {canExportReports(school) ? (
          <>
            <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-black border shrink-0 bg-sky-600 text-white border-sky-500 hover:bg-sky-500 active:bg-amber-400 active:text-amber-950 shadow-[0_0_12px_rgba(56,189,248,0.35)]" onClick={exportBalancesCsv}>Export balances CSV</button>
            <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-black border shrink-0 bg-sky-600 text-white border-sky-500 hover:bg-sky-500 active:bg-amber-400 active:text-amber-950 shadow-[0_0_12px_rgba(56,189,248,0.35)]" onClick={printClassFeeList}>Class fee PDF</button>
          </>
        ) : (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 shrink-0">CSV / PDF download · Premium & Pro only (Basic is view-only)</span>
        )}
      </div>
      <PageTitle
        title="Student fees"
        right={
          canEdit ? (
            <button type="button" onClick={() => setShowForm((v) => !v)} className={btnGreen}>
              {showForm ? 'Cancel' : '+ Record payment'}
            </button>
          ) : (
            <span className="text-xs text-slate-500">View only</span>
          )
        }
      />
      <Alert>{error}</Alert>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-bold text-slate-500">Collected</p>
          <p className="text-xl font-black text-emerald-700">KES {fmt(totalCollected)}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-slate-500">Outstanding</p>
          <p className="text-xl font-black text-red-700">KES {fmt(totalOwed)}</p>
        </Card>
      </div>

      <select className={input} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
        <option value="all">All classes</option>
        {grades.map((g) => (
          <option key={g.id} value={g.id}>
            {g.grade_name}
          </option>
        ))}
      </select>

      {canEdit && pendingStk.length > 0 && (
        <Card title="STK to match">
          <ul className="space-y-2 text-sm">
            {pendingStk.slice(0, 12).map((ev) => (
              <li key={ev.id || ev.api_ref} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-xs">{ev.api_ref}</span>
                <span className="font-bold">KES {Number(ev.amount || 0).toLocaleString('en-KE')}</span>
                <button type="button" disabled={matchBusy} className="text-xs font-black text-blue-700 underline" onClick={() => postStkAsFee(ev)}>
                  Match
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showForm && canEdit && (
        <Card title="Record payment">
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
            <select className={input} value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              <option value="">Student…</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.admission_no} — {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
            <input className={input} type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Cash</option>
              <option>M-Pesa</option>
              <option>Bank</option>
              <option>Cheque</option>
              <option>Other</option>
            </select>
            <input className={input} placeholder="Receipt no." value={receipt} onChange={(e) => setReceipt(e.target.value)} />
            <input className={`${input} sm:col-span-2`} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button disabled={saving} className={btnGreen}>
              {saving ? 'Saving…' : 'Save payment'}
            </button>
          </form>
        </Card>
      )}

      {canEdit && (
        <Card title="Opening arrears">
          <form onSubmit={saveArrears} className="flex flex-wrap gap-2">
            <select className={input} value={arrearsStudent} onChange={(e) => setArrearsStudent(e.target.value)}>
              <option value="">Student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
            <input className={input} type="number" placeholder="Arrears KES" value={arrearsAmt} onChange={(e) => setArrearsAmt(e.target.value)} />
            <button className={btnGreen} disabled={saving}>
              Save arrears
            </button>
          </form>
        </Card>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('balances')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'balances' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
        >
          Balances
        </button>
        <button
          type="button"
          onClick={() => setView('payments')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'payments' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
        >
          Payment history
        </button>
      </div>

      {view === 'balances' ? (
        <Card title="Balances" className="!p-0">
          {loading ? (
            <p className="p-6 text-slate-600">Loading…</p>
          ) : (
            <Scroll>
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className={th}>Class</th>
                    <th className={th}>Adm</th>
                    <th className={th}>Student</th>
                    <th className={th}>Term fee</th>
                    <th className={th}>Arrears</th>
                    <th className={th}>Paid</th>
                    <th className={th}>Balance</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredBalances]
                    .sort((a, b) => String(a.gradeId || '').localeCompare(String(b.gradeId || '')))
                    .map((b) => (
                      <tr key={b.id} className="border-b hover:bg-gray-50">
                        <td className={td}>{grades.find((g) => g.id === b.gradeId)?.grade_name || '—'}</td>
                        <td className={td}>{b.admission_no}</td>
                        <td className={td}>
                          {b.first_name} {b.last_name}
                        </td>
                        <td className={td}>{b.termFee != null ? `KES ${fmt(b.termFee)}` : '—'}</td>
                        <td className={td}>{b.arrears ? `KES ${fmt(b.arrears)}` : '—'}</td>
                        <td className={td}>KES {fmt(b.paid)}</td>
                        <td className={`${td} font-semibold ${b.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {b.balance == null ? '—' : `KES ${fmt(b.balance)}`}
                        </td>
                        <td className={td}>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              className="text-xs font-bold text-blue-700 underline text-left"
                              onClick={() => printStatement(b, b.paid, b.balance)}
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              className="text-xs font-bold text-emerald-700 underline text-left"
                              onClick={() => shareReceiptWa(b, b.paid, 'Statement', b.admission_no)}
                            >
                              WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Scroll>
          )}
        </Card>
      ) : (
        <Card title="Payment history" className="!p-0">
          {loading ? (
            <p className="p-6 text-slate-600">Loading…</p>
          ) : (
            <Scroll>
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className={th}>Adm</th>
                    <th className={th}>Student</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Date</th>
                    <th className={th}>Method</th>
                    <th className={th}>Receipt</th>
                    {canEdit ? <th className={th}></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className={td}>{p.students?.admission_no}</td>
                      <td className={td}>
                        {p.students?.first_name} {p.students?.last_name}
                      </td>
                      <td className={`${td} font-semibold`}>KES {fmt(p.amount_paid)}</td>
                      <td className={td}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td className={td}>{p.payment_method}</td>
                      <td className={td}>{p.receipt_no || '—'}</td>
                      {canEdit ? (
                        <td className={td}>
                          <button type="button" className="text-red-600 text-xs font-bold" onClick={() => removePayment(p)}>
                            Delete
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
          )}
        </Card>
      )}
    </div>
  )
}
