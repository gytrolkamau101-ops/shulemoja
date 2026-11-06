import { useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Alert, input, btnGreen } from '../../ui'
import ImagePicker from '../../ImagePicker'
import { compressDataUrl } from '../../../lib/media'

const SHELL_THEMES = [
  { id: 'sky', label: 'Sky blue (default)', hint: 'Clean office blue' },
  { id: 'indigo', label: 'Indigo', hint: 'Deep professional' },
  { id: 'teal', label: 'Teal', hint: 'Fresh campus green-blue' },
  { id: 'slate', label: 'Slate', hint: 'Neutral grey-blue' },
  { id: 'sunrise', label: 'Sunrise', hint: 'Warm gold-amber wash' },
]

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
    shell_theme: school.shell_theme || 'sky',
  })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const applyShell = (themeId) => {
    const id = themeId || 'sky'
    document.documentElement.setAttribute('data-shell', id)
    try {
      if (school?.id) localStorage.setItem(`sm_shell_${school.id}`, id)
    } catch (_) {}
  }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (!canEdit) return setError('Only Principal / Deputy can edit school identity.')
    setBusy(true)
    try {
      let logo = form.logo_url || ''
      if (logo.startsWith('data:image')) {
        logo = await compressDataUrl(logo, { maxW: 400, quality: 0.65 })
      }
      const payload = {
        school_name: form.school_name,
        logo_url: logo,
        po_box: form.po_box,
        physical_address: form.physical_address,
        motto: form.motto,
        phone: form.phone,
        email: form.email,
        shell_theme: form.shell_theme || 'sky',
      }
      const { error: upErr } = await supabase.from('schools').update(payload).eq('id', school?.id)
      if (upErr) {
        // shell_theme column may be missing — still apply look locally
        applyShell(payload.shell_theme)
        setForm((f) => ({ ...f, logo_url: logo }))
        if (/shell_theme|column/i.test(upErr.message)) {
          setError(upErr.message + ' — Run migrations/038_shell_theme.sql once, then save again to persist.')
          setOk('Colours applied on this device. Logo save may have failed if only shell_theme was unknown — try saving identity fields only after SQL.')
          // retry without shell_theme
          const { shell_theme, ...rest } = payload
          const r2 = await supabase.from('schools').update(rest).eq('id', school?.id)
          if (!r2.error) setOk('Identity saved. Shell colour is local until 038_shell_theme.sql is run.')
        } else {
          setError(upErr.message)
        }
        setBusy(false)
        return
      }
      setForm((f) => ({ ...f, logo_url: logo }))
      applyShell(payload.shell_theme)
      setOk('Saved — identity & desk colour theme applied.')
    } catch (err) {
      setError(err.message || 'Save failed')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <Card title="School identity (receipts & reports)">
        <form onSubmit={save} className="space-y-3">
          <input className={input} placeholder="School name" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} required disabled={!canEdit} />
          <ImagePicker
            label="School logo"
            value={form.logo_url || ''}
            onChange={(url) => setForm((prev) => ({ ...prev, logo_url: url }))}
            maxW={400}
            previewClass="h-16 object-contain rounded-lg border"
          />
          <input className={input} placeholder="P.O. Box" value={form.po_box} onChange={(e) => setForm({ ...form, po_box: e.target.value })} disabled={!canEdit} />
          <input className={input} placeholder="Physical address" value={form.physical_address} onChange={(e) => setForm({ ...form, physical_address: e.target.value })} disabled={!canEdit} />
          <input className={input} placeholder="Motto" value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} disabled={!canEdit} />
          <input className={input} placeholder="School phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} />
          <input className={input} placeholder="School email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canEdit} />
          <Alert>{error}</Alert>
          <Alert kind="ok">{ok}</Alert>
          {canEdit && (
            <button type="submit" className={btnGreen} disabled={busy}>
              {busy ? 'Saving…' : 'Save identity'}
            </button>
          )}
        </form>
      </Card>

      <Card title="Desk colour theme">
        <p className="text-sm text-slate-600 mb-3">
          Soft gradient behind the school desk — no photo background. Keeps text and tables clear.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {SHELL_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setForm((f) => ({ ...f, shell_theme: t.id }))
                applyShell(t.id)
              }}
              className={`text-left rounded-xl border-2 p-3 transition ${
                form.shell_theme === t.id ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200'
              }`}
            >
              <div className={`h-10 rounded-lg mb-2 shell-preview shell-preview-${t.id}`} />
              <div className="font-bold text-slate-900 text-sm">{t.label}</div>
              <div className="text-xs text-slate-500">{t.hint}</div>
            </button>
          ))}
        </div>
        {canEdit && (
          <button type="button" className={btnGreen} disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save colour theme'}
          </button>
        )}
      </Card>
    </div>
  )
}
