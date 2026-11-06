import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessPage,
  canEditData,
  canEditFinance,
  roleCapabilities,
  FINANCE_EDITORS,
} from '../src/lib/roles.js'

describe('roles', () => {
  it('Principal can open setup and finance', () => {
    assert.equal(canAccessPage('Principal', 'setup'), true)
    assert.equal(canAccessPage('Principal', 'finance'), true)
    assert.equal(canEditFinance('Principal'), true)
  })

  it('Teacher cannot edit finance or open school-finance', () => {
    assert.equal(canEditFinance('Teacher'), false)
    assert.equal(canAccessPage('Teacher', 'school-finance'), false)
    assert.equal(canAccessPage('Teacher', 'students'), true)
  })

  it('Secretary can edit data and fees but page matrix still applies', () => {
    assert.equal(canEditData('Secretary'), true)
    assert.equal(canEditFinance('Secretary'), true)
    assert.equal(FINANCE_EDITORS.includes('Secretary'), true)
  })

  it('Watchman limited to desk and dashboard', () => {
    assert.equal(canAccessPage('Watchman', 'staff-desk'), true)
    assert.equal(canAccessPage('Watchman', 'dashboard'), true)
    assert.equal(canAccessPage('Watchman', 'students'), false)
    assert.equal(canAccessPage('Watchman', 'finance'), false)
  })

  it('roleCapabilities reflects editors', () => {
    const c = roleCapabilities('Teacher')
    assert.equal(c.editStudents, false)
    assert.equal(c.editFees, false)
    assert.equal(c.editAttendance, true)
  })
})
