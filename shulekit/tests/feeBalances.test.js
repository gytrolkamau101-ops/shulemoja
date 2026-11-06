import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeStudentBalance,
  computeAllBalances,
  sumOutstanding,
  sumCollected,
} from '../src/lib/feeBalances.js'

describe('feeBalances', () => {
  it('balance = term fee + arrears - paid', () => {
    const b = computeStudentBalance({
      student: { id: '1', first_name: 'Ada' },
      gradeId: 'g1',
      termFee: 10000,
      arrears: 2000,
      paid: 3000,
    })
    assert.equal(b.balance, 9000)
    assert.equal(b.totalFee, 12000)
  })

  it('null balance when no grade and no arrears', () => {
    const b = computeStudentBalance({
      student: { id: '2' },
      gradeId: undefined,
      termFee: 0,
      arrears: 0,
      paid: 0,
    })
    assert.equal(b.balance, null)
  })

  it('computeAllBalances aggregates payments', () => {
    const rows = computeAllBalances(
      [{ id: 's1' }, { id: 's2' }],
      [{ student_id: 's1', grade_id: 'g1' }],
      [{ grade_id: 'g1', total_fee: 5000 }],
      [
        { student_id: 's1', amount_paid: 1000 },
        { student_id: 's1', amount_paid: 500 },
      ],
      [{ student_id: 's1', amount: 0 }]
    )
    const s1 = rows.find((r) => r.id === 's1')
    assert.equal(s1.paid, 1500)
    assert.equal(s1.balance, 3500)
  })

  it('sum helpers', () => {
    assert.equal(sumCollected([{ amount_paid: 10 }, { amount_paid: 5 }]), 15)
    assert.equal(
      sumOutstanding([{ balance: 10 }, { balance: -2 }, { balance: null }, { balance: 3 }]),
      13
    )
  })
})
