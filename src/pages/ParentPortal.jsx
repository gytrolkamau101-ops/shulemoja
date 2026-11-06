import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { Card, Scroll, Alert, th, td, fmt, btn, btnGreen, Spinner, input } from '../components/ui'
import { planEntitlements } from '../lib/plans'
import { openPrintDocument } from '../lib/docHeader'

export default function ParentPortal({ session }) {
  const [parent, setParent] = useState(null)
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeChild, setActiveChild] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: p } = await supabase.from('parents').select('*').eq('id', session.user.id).maybeSingle()
      setParent(p || null)
      if (p && p.status === 'active') {
        const { data: links } = await supabase
          .from('parent_children')
          .select('id, status, students(*)')
          .eq('parent_id', session.user.id)
          .eq('status', 'approved')
        const list = (links || [])
          .map((l) => l.students)
          .filter((s) => s && String(s.status || 'Active') === 'Active')
        setChildren(list)
        if (list.length > 0) setActiveChild((cur) => cur || list[0].id)
      } else setChildren([])
    } catch (e) {
      console.warn(e)
      setParent(null)
      setChildren([])
    } finally {
      setLoading(false)
    }
  }, [session.user.id])

  useEffect(() => {
    load()
  }, [load])

  const logout = () => supabase.auth.signOut()

  if (loading) {
    return (
      <div className="min-h-screen sk-mesh-light flex flex-col items-center justify-center gap-3">
        <Spinner dark />
        <p className="text-slate-600 text-sm">Loading…</p>
      </div>
    )
  }

  if (!parent || parent.status !== 'active') {
    return (
      <div className="min-h-screen sk-mesh-light flex items-center justify-center p-4">
        <div className="sk-glass rounded-2xl p-6 max-w-md text-center space-y-4">
          <h1 className="text-2xl font-black text-slate-900">ShuleMoja — Parent</h1>
          <p className="text-slate-600 text-sm">
            {parent?.status === 'suspended'
              ? 'Your account has been suspended. Please contact the school.'
              : "Your account is waiting for the school to confirm your child's details."}
          </p>
          <button onClick={() => window.location.reload()} className={btn}>
            Refresh
          </button>{' '}
          <button onClick={logout} className="text-red-600 underline text-sm font-semibold">
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen sk-mesh-light">
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black text-blue-700">ShuleMoja</h1>
          <p className="text-xs text-slate-500">Parent portal · {parent.full_name}</p>
        </div>
        <button onClick={logout} className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">
          Logout
        </button>
      </header>
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {children.length === 0 ? (
          <Alert kind="info">No children are linked to your account yet.</Alert>
        ) : (
          <>
            {children.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChild(c.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                      activeChild === c.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    {c.first_name} {c.last_name}
                  </button>
                ))}
              </div>
            )}
            {children
              .filter((c) => c.id === activeChild)
              .map((c) => (
                <ChildDetail key={c.id} student={c} schoolId={c.school_id} session={session} />
              ))}
          </>
        )}
      </main>
    </div>
  )
}


function printFeeStatement({ student, schoolName, logoUrl, rows, termLabel }) {
  const body = (rows || []).map((r) =>
    `<tr><td>${r.payment_date || ''}</td><td>${r.payment_method || ''}</td><td style="text-align:right">${Number(r.amount_paid||0).toLocaleString()}</td><td>${r.receipt_no||''}</td></tr>`
  ).join('')
  const total = (rows || []).reduce((s, r) => s + Number(r.amount_paid || 0), 0)
  const ok = openPrintDocument({
    school: { school_name: schoolName, logo_url: logoUrl },
    title: 'Fee statement',
    bodyHtml: `
    <p style="text-align:center">Fee statement · ${termLabel || ''} · ${student.first_name} ${student.last_name} (${student.admission_no||''})</p>
    <table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Receipt</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td colspan="2"><strong>Total paid</strong></td><td style="text-align:right"><strong>KES ${total.toLocaleString()}</strong></td><td></td></tr></tfoot>
    </table>`,
  })
  if (!ok) alert('Allow pop-ups to print')
}


function printExamSummary({ student, schoolName, results, termLabel, logoUrl }) {
  const body = (results || [])
    .map(
      (r) =>
        `<tr><td>${r.exams?.exam_name || ''}</td><td>${r.subjects?.subject_name || ''}</td><td style="text-align:center">${r.marks_obtained ?? '—'}</td><td style="text-align:center">${r.grade || '—'}</td></tr>`
    )
    .join('')
  const ok = openPrintDocument({
    school: { school_name: schoolName, logo_url: logoUrl },
    title: 'Results',
    bodyHtml: `
    <div style="text-align:center;color:#64748b;font-size:12px;margin-bottom:12px">Exam results · ${termLabel || ''}</div>
    <p style="text-align:center;font-weight:700">${student?.first_name || ''} ${student?.last_name || ''} · Adm ${student?.admission_no || ''}</p>
    <table><thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead>
    <tbody>${body || '<tr><td colspan="4">No results</td></tr>'}</tbody></table>`,
  })
  if (!ok) alert('Allow pop-ups to print')
}

function ChildDetail({ student, schoolId, session }) {
  const [terms, setTerms] = useState([])
  const [termId, setTermId] = useState('')
  const [term, setTerm] = useState(null)
  const [payments, setPayments] = useState([])
  const [feeTotal, setFeeTotal] = useState(null)
  const [arrears, setArrears] = useState(0)
  const [results, setResults] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [schoolPay, setSchoolPay] = useState(null)
  const [schoolPlan, setSchoolPlan] = useState(null)
  const [canDownload, setCanDownload] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [circulars, setCirculars] = useState([])
  const [notices, setNotices] = useState([])
  const [timetable, setTimetable] = useState([])
  const [gradeId, setGradeId] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: tlist }, { data: sch }] = await Promise.all([
        supabase
          .from('terms')
          .select('*')
          .eq('school_id', schoolId)
          .order('year', { ascending: false })
          .order('term', { ascending: false }),
        supabase
          .from('schools')
          .select('school_name, logo_url, mpesa_paybill, mpesa_till, mpesa_phone, mpesa_account_ref, fee_payment_instructions, plan, plan_expires_at')
          .eq('id', schoolId)
          .maybeSingle(),
      ])
      setTerms(tlist || [])
      setSchoolPay(sch || null)
      const { data: nlist } = await supabase
        .from('parent_notices')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotices(nlist || [])
      setSchoolPlan(sch || null)
      if (sch?.school_name) setSchoolName(sch.school_name)
      const cur = (tlist || []).find((t) => t.is_current) || (tlist || [])[0]
      if (cur) setTermId(cur.id)
    })()
  }, [schoolId])

  useEffect(() => {
    if (!termId) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const t = terms.find((x) => x.id === termId) || null
      setTerm(t)
      if (!t) {
        setLoading(false)
        return
      }

      const { data: enr } = await supabase
        .from('student_enrollments')
        .select('grade_id')
        .eq('student_id', student.id)
        .eq('term_id', t.id)
        .maybeSingle()

      let fee = null
      if (enr) {
        const { data: fs } = await supabase
          .from('fee_structures')
          .select('total_fee')
          .eq('school_id', schoolId)
          .eq('term_id', t.id)
          .eq('grade_id', enr.grade_id)
          .maybeSingle()
        fee = fs ? Number(fs.total_fee) : null
      }
      const { data: op } = await supabase
        .from('fee_opening_balances')
        .select('amount')
        .eq('student_id', student.id)
        .eq('term_id', t.id)
        .maybeSingle()
      const arr = op ? Number(op.amount) : 0
      if (!alive) return
      setFeeTotal(fee)
      setArrears(arr)

      const { data: pay } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('student_id', student.id)
        .eq('term_id', t.id)
        .order('payment_date', { ascending: false })
      setPayments(pay || [])

      const { data: res } = await supabase
        .from('exam_results')
        .select('*, exams(exam_name, term_id), subjects(subject_name)')
        .eq('student_id', student.id)
        .order('updated_at', { ascending: false })
        .limit(40)
      const filtered = (res || []).filter((r) => !r.exams?.term_id || r.exams.term_id === t.id)
      setResults(filtered)

      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false })
        .limit(20)
      const gid = enr?.grade_id || null
      setGradeId(gid)

      const { data: schMeta } = await supabase
        .from('schools')
        .select('plan, plan_expires_at, school_name')
        .eq('id', schoolId)
        .maybeSingle()
      const prem = planEntitlements(schMeta || {})
      setCanDownload(!!prem.parentDownloads)
      if (schMeta) setSchoolPlan((prev) => ({ ...(prev || {}), ...schMeta }))
      /* school name */
      setSchoolName(schMeta?.school_name || '')
      let circ = []
      let slots = []
      if (prem.circulars) {
        const { data: c } = await supabase
          .from('circulars')
          .select('*')
          .eq('school_id', schoolId)
          .in('audience', ['all', 'parents'])
          .order('published_at', { ascending: false })
          .limit(15)
        circ = c || []
      }
      if (prem.timetable && gid && t) {
        const { data: slotsData } = await supabase
          .from('timetable_slots')
          .select('*, subjects(subject_name)')
          .eq('school_id', schoolId)
          .eq('term_id', t.id)
          .eq('grade_id', gid)
          .order('day_of_week')
          .order('start_time')
        slots = slotsData || []
      }
      if (!alive) return
      setAttendance(att || [])
      setCirculars(circ)
      setTimetable(slots)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [student.id, schoolId, termId, terms])

  const paid = payments.reduce((s, p) => s + Number(p.amount_paid), 0)
  const totalDue = (feeTotal || 0) + arrears
  const balance = feeTotal === null && !arrears ? null : totalDue - paid

  const ent = planEntitlements(schoolPlan && typeof schoolPlan === 'object' ? schoolPlan : { plan: schoolPlan || 'free' })
  const showCharts = !!(ent.parentDownloads || ent.messages || (ent.planId && ent.planId !== 'free' && !ent.readOnly))

  const examTrends = useMemo(() => {
    const byExam = {}
    ;(results || []).forEach((r) => {
      const name = r.exams?.exam_name || 'Exam'
      if (!byExam[name]) byExam[name] = []
      byExam[name].push(Number(r.marks_obtained) || 0)
    })
    return Object.entries(byExam).map(([name, arr]) => ({
      name,
      avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10,
    }))
  }, [results])

  const paymentBars = useMemo(() => {
    return (payments || []).slice(0, 8).map((p) => ({
      label: p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—',
      amount: Number(p.amount_paid) || 0,
    })).reverse()
  }, [payments])

  const maxPay = Math.max(1, ...paymentBars.map((b) => b.amount))

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-black text-slate-900">
          {student.first_name} {student.last_name}
        </h2>
        <p className="text-sm text-slate-600">Admission No: {student.admission_no}</p>
        <label className="block text-xs font-bold text-slate-500 mt-3 mb-1">Term / Year</label>
        <select className="w-full p-3 border border-slate-200 rounded-xl bg-white" value={termId} onChange={(e) => setTermId(e.target.value)}>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              Term {t.term}, {t.year}
              {t.is_current ? ' (current)' : ''}
            </option>
          ))}
        </select>
      </Card>

      {!term ? (
        <Alert kind="info">No terms available yet.</Alert>
      ) : loading ? (
        <p className="text-slate-600">Loading term data…</p>
      ) : (
        <>
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-3">
            Fee balance · pay the school · exam results
          </p>
          {notices.length > 0 && (
            <Card title="Letters from school">
              <ul className="space-y-3">
                {notices.map((n) => (
                  <li key={n.id} className="border border-slate-200 rounded-xl p-3">
                    <p className="text-xs font-bold uppercase text-slate-500">{n.notice_type}</p>
                    <p className="font-bold text-slate-900">{n.title}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{n.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title={`Fees — Term ${term.term}, ${term.year}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Term fee</p>
                <p className="font-bold">{feeTotal == null ? '—' : `KES ${fmt(feeTotal)}`}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Arrears</p>
                <p className="font-bold">KES {fmt(arrears)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Paid</p>
                <p className="font-bold text-emerald-700">KES {fmt(paid)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Balance</p>
                <p className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {balance == null ? '—' : `KES ${fmt(balance)}`}
                </p>
              </div>
            </div>
            {(balance == null || balance >= 0) && (
              <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">How to pay</p>
                <p className="text-xs text-slate-600">
                  Pay the school directly on M-Pesa. ShuleMoja does not collect school fees — money goes to the school only.
                </p>
                {(schoolPay?.mpesa_paybill || schoolPay?.mpesa_till || schoolPay?.mpesa_phone) ? (
                  <div className="text-sm text-slate-800 space-y-1.5 bg-white rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Lipa na M-Pesa</p>
                    {schoolPay.mpesa_till && (
                      <p>
                        <span className="text-slate-500">Till (Buy Goods): </span>
                        <strong className="text-lg tracking-wide">{schoolPay.mpesa_till}</strong>
                      </p>
                    )}
                    {schoolPay.mpesa_paybill && (
                      <p>
                        <span className="text-slate-500">Paybill: </span>
                        <strong className="text-lg tracking-wide">{schoolPay.mpesa_paybill}</strong>
                      </p>
                    )}
                    {(schoolPay.mpesa_account_ref || student.admission_no) && (
                      <p>
                        <span className="text-slate-500">Account: </span>
                        <strong>{schoolPay.mpesa_account_ref || student.admission_no}</strong>
                        <span className="text-xs text-slate-500"> (use admission no. if unsure)</span>
                      </p>
                    )}
                    {schoolPay.mpesa_phone && (
                      <p>
                        <span className="text-slate-500">School M-Pesa phone: </span>
                        <strong>{schoolPay.mpesa_phone}</strong>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500">Amount: </span>
                      <strong>KES {fmt(Math.ceil(balance))}</strong>
                    </p>
                    {schoolPay.fee_payment_instructions && (
                      <p className="text-xs text-slate-600 pt-1 border-t border-slate-100 mt-2">
                        {schoolPay.fee_payment_instructions}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    No Till/Paybill on file yet. Principal: School Setup → Payment settings (Paybill/Till). If already saved, run SQL 27_v54_parent_school_pay.sql so parents can read it.
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  After you pay, the school records the payment in ShuleMoja. Your balance updates when they confirm — usually the same day.
                </p>
              </div>
            )}
            {canDownload && payments.length > 0 && (
              <button
                type="button"
                className="mt-3 mb-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black shadow-md"
                onClick={() =>
                  printFeeStatement({
                    student,
                    schoolName,
                    rows: payments,
                    termLabel: term ? `Term ${term.term} ${term.year}` : '',
                    logoUrl: schoolPay?.logo_url || null,
                    paid: payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0),
                    balance: null,
                    termFee: null,
                    arrears: null,
                  })
                }
              >
                Download fee statement
              </button>
            )}
            {!canDownload && (
              <p className="text-xs text-slate-500 mt-2">Fee statement download is a Premium parent benefit.</p>
            )}
            {payments.length > 0 && (
              <Scroll>
                <table className="w-full mt-4">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className={th}>Date</th>
                      <th className={th}>Amount</th>
                      <th className={th}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className={td}>{new Date(p.payment_date).toLocaleDateString('en-GB')}</td>
                        <td className={td}>KES {fmt(p.amount_paid)}</td>
                        <td className={td}>{p.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </Card>

          {results.length > 0 && (
              <button type="button" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-black shadow-md mb-2"
                onClick={() => printExamSummary({ student, schoolName, logoUrl: schoolPay?.logo_url || null, results, termLabel: term ? `Term ${term.term} ${term.year}` : '' })}>
                Download / print results
              </button>
            )}
          {(ent.planId === 'free' || ent.readOnly) && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
              School plan limited — contact the school office.
            </div>
          )}
          
          {showCharts && (examTrends.length > 1 || paymentBars.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {examTrends.length > 1 && (
                <Card title="Results trend">
                  <div className="flex items-end gap-2 h-28">
                    {examTrends.map((ex) => {
                      const h = Math.max(8, Math.round((Math.min(100, ex.avg) / 100) * 96))
                      return (
                        <div key={ex.name} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                          <span className="text-[10px] font-bold text-slate-700">{ex.avg}</span>
                          <div className="w-full max-w-[2.5rem] bg-blue-600 rounded-t" style={{ height: h }} />
                          <span className="text-[9px] text-slate-500 truncate max-w-full text-center">{ex.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
              {paymentBars.length > 0 && (
                <Card title="Fee payments">
                  <div className="flex items-end gap-1.5 h-28">
                    {paymentBars.map((b, i) => {
                      const h = Math.max(6, Math.round((b.amount / maxPay) * 96))
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                          <span className="text-[9px] font-bold text-emerald-800">{b.amount >= 1000 ? Math.round(b.amount / 1000) + 'k' : b.amount}</span>
                          <div className="w-full max-w-[2rem] bg-emerald-500 rounded-t" style={{ height: h }} />
                          <span className="text-[8px] text-slate-500 truncate max-w-full">{b.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          <Card title="Exam results" className="!p-0">
            {results.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No results for this term</p>
            ) : (
              <Scroll>
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className={th}>Exam</th>
                      <th className={th}>Subject</th>
                      <th className={th}>Marks</th>
                      <th className={th}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className={td}>{r.exams?.exam_name}</td>
                        <td className={td}>{r.subjects?.subject_name}</td>
                        <td className={td}>{r.marks_obtained}</td>
                        <td className={td}>{r.grade || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </Card>

          <Card title="Recent attendance" className="!p-0">
            {attendance.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No records</p>
            ) : (
              <Scroll>
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className={th}>Date</th>
                      <th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id} className="border-b">
                        <td className={td}>{new Date(a.date).toLocaleDateString('en-GB')}</td>
                        <td className={td}>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
