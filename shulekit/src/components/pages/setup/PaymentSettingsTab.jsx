import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function PaymentSettingsTab({ school }) {
  const [paybill, setPaybill] = useState(school.mpesa_paybill || '')
  const [till, setTill] = useState(school.mpesa_till || '')
  const [phone, setPhone] = useState(school.mpesa_phone || '')
  const [acc, setAcc] = useState(school.mpesa_account_ref || '')
  const [instr, setInstr] = useState(school.fee_payment_instructions || '')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    setSaving(true)
    const { error } = await supabase
      .from('schools')
      .update({
        mpesa_paybill: paybill || null,
        mpesa_till: till || null,
        mpesa_phone: phone || null,
        mpesa_account_ref: acc || null,
        fee_payment_instructions: instr || null,
      })
      .eq('id', school?.id)
    setSaving(false)
    if (error) return setError(error.message)
    setOk('Payment settings saved. Parents will see Paybill/Till on the parent portal.')
    try { await logAudit('school.payment_settings', 'schools', school?.id, {}) } catch (_) {}
  }

  return (
    <Card title="Fee payment (Paybill / Till / phone)">
      <p className="text-sm text-slate-600 mb-3">
        Parents pay <strong>directly</strong> to your Till or Paybill on M-Pesa. ShuleMoja never collects school fees.
        After a parent pays, record the payment under <strong>Student Finance</strong> so their balance updates.
      </p>
      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className={input} placeholder="M-Pesa Paybill number" value={paybill} onChange={(e) => setPaybill(e.target.value)} />
        <input className={input} placeholder="Till number (buy goods)" value={till} onChange={(e) => setTill(e.target.value)} />
        <input className={input} placeholder="School M-Pesa phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={input} placeholder="Account reference (e.g. school code)" value={acc} onChange={(e) => setAcc(e.target.value)} />
        <textarea className={`${input} md:col-span-2`} rows={3} placeholder="Extra instructions for parents" value={instr} onChange={(e) => setInstr(e.target.value)} />
        <div className="md:col-span-2 space-y-2">
          <Alert>{error}</Alert>
          <Alert kind="ok">{ok}</Alert>
          <button disabled={saving} className={btnGreen}>{saving ? 'Saving…' : 'Save payment settings'}</button>
        </div>
      </form>
    </Card>
  )
}
