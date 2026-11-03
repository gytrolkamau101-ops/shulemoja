/**
 * Pure fee balance math — testable, used by Student Finance.
 * balance = termFee + arrears - paid (null when no grade fee structure and no arrears)
 */

export function computeStudentBalance({
  student,
  gradeId,
  termFee = 0,
  arrears = 0,
  paid = 0,
}) {
  const hasGrade = gradeId !== undefined && gradeId !== null
  const tf = Number(termFee) || 0
  const ar = Number(arrears) || 0
  const pd = Number(paid) || 0
  const totalFee = hasGrade ? tf + ar : ar || null
  const balance =
    totalFee === null || (totalFee === 0 && !hasGrade) ? null : totalFee - pd
  return {
    ...student,
    gradeId: gradeId ?? null,
    termFee: tf,
    arrears: ar,
    totalFee: totalFee === 0 && !hasGrade ? null : totalFee,
    paid: pd,
    balance,
  }
}

/**
 * @param {Array} students
 * @param {Array<{student_id, grade_id}>} enrollments
 * @param {Array<{grade_id, total_fee}>} feeStructures
 * @param {Array<{student_id, amount_paid}>} payments
 * @param {Array<{student_id, amount}>} openings
 */
export function computeAllBalances(students, enrollments, feeStructures, payments, openings) {
  const gradeByStudent = {}
  ;(enrollments || []).forEach((e) => {
    gradeByStudent[e.student_id] = e.grade_id
  })
  const feeByGrade = {}
  ;(feeStructures || []).forEach((f) => {
    feeByGrade[f.grade_id] = Number(f.total_fee)
  })
  const paidByStudent = {}
  ;(payments || []).forEach((p) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount_paid)
  })
  const openByStudent = {}
  ;(openings || []).forEach((o) => {
    openByStudent[o.student_id] = Number(o.amount || 0)
  })

  return (students || []).map((s) => {
    const gradeId = gradeByStudent[s.id]
    return computeStudentBalance({
      student: s,
      gradeId,
      termFee: gradeId !== undefined ? feeByGrade[gradeId] ?? 0 : 0,
      arrears: openByStudent[s.id] || 0,
      paid: paidByStudent[s.id] || 0,
    })
  })
}

export function sumOutstanding(balances) {
  return (balances || []).reduce(
    (sum, b) => sum + (b.balance && b.balance > 0 ? b.balance : 0),
    0
  )
}

export function sumCollected(payments) {
  return (payments || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
}
