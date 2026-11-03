import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'
import ImagePicker from '../../ImagePicker'

export default function SchoolIdentityTab({ school, user }) {
  const canEdit = ['Principal', 'Deputy Principal'].includes(user?.role)
  const [form, setForm] = useState({
    school_name: school.school_name || '',
    logo_url: school.logo_url || '',
    po_box: school.po_box || '',
    physical_address: school.physical_address || '',
    motto: school.motto || '',
    phone: school.phone || '',
    email: school.email || '',
  })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const save = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (!canEdit) return setError('Only Principal / Deputy can edit school identity.')
    const { error } = await supabase.from('schools').update(form).eq('id', school?.id)
    if (error) return setError(error.message)
    setOk('Saved — used on receipts and report cards.')
  }
  return (
    <Card title="School identity (receipts & reports)">
      <form onSubmit={save} className="space-y-3">
        <input className={input} placeholder="School name" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} required disabled={!canEdit} />
        <div className="space-y-2">
          <ImagePicker
            label="School logo"
            value={form.logo_url || ''}
            onChange={(url) => setForm((prev) => ({ ...prev, logo_url: url }))}
            maxW={400}
            previewClass="h-16 object-contain rounded-lg border"
          />
        </div>
        <input className={input} placeholder="P.O. Box" value={form.po_box} onChange={(e) => setForm({ ...form, po_box: e.target.value })} disabled={!canEdit} />
        <input className={input} placeholder="Physical address" value={form.physical_address} onChange={(e) => setForm({ ...form, physical_address: e.target.value })} disabled={!canEdit} />
        <input className={input} placeholder="Motto" value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} disabled={!canEdit} />
        <input className={input} placeholder="School phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} />
        <input className={input} placeholder="School email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canEdit} />
        <Alert>{error}</Alert>
        <Alert kind="ok">{ok}</Alert>
        {canEdit && <button className={btnGreen}>Save identity</button>}
      </form>
    </Card>
  )
}
