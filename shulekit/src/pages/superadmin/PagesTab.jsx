import { btnGreen } from '../../components/ui'
import { saField, saFieldStyle } from './saStyles'

export default function PagesTab({
  terms, setTerms,
  privacy, setPrivacy,
  how, setHow,
  howApp, setHowApp,
  contacts, setContacts,
  savingCms, saveCms,
}) {
  return (
    <div className="space-y-4">
      {[
        { key: 'terms', label: 'Terms & Conditions', state: terms, set: setTerms },
        { key: 'privacy', label: 'Privacy Policy (Kenya DPA)', state: privacy, set: setPrivacy },
        {
          key: 'how_it_works',
          label: 'How it works (login / public)',
          hint: 'Shown on login and public pages: registration, subscription, what ShuleMoja is.',
          state: how,
          set: setHow,
        },
        {
          key: 'how_it_works_app',
          label: 'How it works (in-app)',
          hint: 'Shown from the sidebar inside the school console: how to navigate and run daily work.',
          state: howApp,
          set: setHowApp,
        },
      ].map((block) => (
        <div key={block.key} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
          <h2 className="font-black text-slate-100">{block.label}</h2>
          {block.hint && <p className="text-xs text-slate-400">{block.hint}</p>}
          <input
            className={saField}
            style={saFieldStyle}
            placeholder="Title"
            value={block.state?.title || ''}
            onChange={(e) => block.set({ ...block.state, title: e.target.value })}
          />
          <textarea
            className={saField}
            style={{ ...saFieldStyle, minHeight: 140 }}
            placeholder="Body"
            value={block.state?.body || ''}
            onChange={(e) => block.set({ ...block.state, body: e.target.value })}
          />
          <button type="button" disabled={savingCms} className={btnGreen} onClick={() => saveCms(block.key, block.state)}>
            Save {block.label}
          </button>
        </div>
      ))}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <h2 className="font-black text-slate-100">Contacts</h2>
        <input className={saField} style={saFieldStyle} placeholder="Email" value={contacts.email || ''} onChange={(e) => setContacts({ ...contacts, email: e.target.value })} />
        <input className={saField} style={saFieldStyle} placeholder="Phone" value={contacts.phone || ''} onChange={(e) => setContacts({ ...contacts, phone: e.target.value })} />
        <input className={saField} style={saFieldStyle} placeholder="WhatsApp" value={contacts.whatsapp || ''} onChange={(e) => setContacts({ ...contacts, whatsapp: e.target.value })} />
        <p className="text-xs text-slate-400">Public login Contact shows email. WhatsApp/SMS for Premium in-app support.</p>
        <input className={saField} style={saFieldStyle} placeholder="Address" value={contacts.address || ''} onChange={(e) => setContacts({ ...contacts, address: e.target.value })} />
        <button type="button" disabled={savingCms} className={btnGreen} onClick={() => saveCms('contacts', contacts)}>
          Save contacts
        </button>
      </div>
    </div>
  )
}
