import { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, input, btnGreen, Alert } from '../../ui'
import { getLang, setLang as persistLang } from '../../../lib/prefs'

/** Profile + language — lives under Setup (not top bar). */
export default function ProfileLangTab({ user }) {
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [lang, setLang] = useState(() => getLang())
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFullName(user?.full_name || '')
    setPhone(user?.phone || '')
  }, [user?.id, user?.full_name, user?.phone])

  const saveProfile = async () => {
    if (!user?.id) {
      setErr('No user session. Sign out and sign in again.')
      return
    }
    setBusy(true)
    setErr('')
    setMsg('')
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', user.id)
    setBusy(false)
    if (error) setErr(error.message)
    else setMsg('Profile saved. Reload if the dashboard name does not update yet.')
  }

  const saveLang = (code) => {
    setLang(code)
    persistLang(code)
    setMsg(code === 'sw' ? 'Lugha: Kiswahili (inatumika baada ya refresh kwenye baadhi ya skrini).' : 'Language: English.')
    try {
      window.dispatchEvent(new CustomEvent('shulemoja-lang', { detail: code }))
    } catch (_) {}
  }

  return (
    <div className="space-y-4">
      <Card title="Your profile">
        <p className="text-xs text-slate-500 mb-3">Name and phone shown on the dashboard. Role is assigned by the school.</p>
        <label className="block text-xs font-bold text-slate-600 mb-1">Full name</label>
        <input className={`${input} mb-3`} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
        <input className={`${input} mb-3`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" />
        <p className="text-xs text-slate-500 mb-3">
          Role: <strong>{user?.role || '—'}</strong>
        </p>
        {err && <Alert kind="error">{err}</Alert>}
        {msg && <Alert kind="ok">{msg}</Alert>}
        <button type="button" disabled={busy} className={btnGreen} onClick={saveProfile}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </Card>

      <Card title="Language">
        <p className="text-xs text-slate-500 mb-3">Interface language preference for this device.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => saveLang('en')}
            className={`flex-1 py-3 rounded-xl text-sm font-black border-2 ${
              lang === 'en'
                ? 'bg-gradient-to-b from-sky-400 to-blue-700 text-white border-sky-300 shadow-[0_3px_0_#1e3a8a,0_0_14px_rgba(56,189,248,0.45)]'
                : 'bg-sky-50 text-sky-900 border-sky-200'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => saveLang('sw')}
            className={`flex-1 py-3 rounded-xl text-sm font-black border-2 ${
              lang === 'sw'
                ? 'bg-gradient-to-b from-sky-400 to-blue-700 text-white border-sky-300 shadow-[0_3px_0_#1e3a8a,0_0_14px_rgba(56,189,248,0.45)]'
                : 'bg-sky-50 text-sky-900 border-sky-200'
            }`}
          >
            Kiswahili
          </button>
        </div>
      </Card>
    </div>
  )
}
