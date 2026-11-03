import { btnGreen } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'


export default function PagesTab({ terms, setTerms, privacy, setPrivacy, how, setHow, contacts, setContacts, savingCms, saveCms }) {
  return (
    <>

          <div className="space-y-4">
            {[
              { key: 'terms', label: 'Terms & Conditions', state: terms, set: setTerms },
              { key: 'privacy', label: 'Privacy Policy (Kenya DPA)', state: privacy, set: setPrivacy },
              { key: 'how_it_works', label: 'How it works', state: how, set: setHow },
            ].map((block) => (
              <div key={block.key} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
                <h2 className="font-black">{block.label}</h2>
                <input
                  className={saField} style={saFieldStyle}
                  value={block.state.title || ''}
                  onChange={(e) => block.set({ ...block.state, title: e.target.value })}
                />
                <textarea
                  className={saField} style={saFieldStyle}
                  value={block.state.body || ''}
                  onChange={(e) => block.set({ ...block.state, body: e.target.value })}
                />
                <button type="button" disabled={savingCms} className={btnGreen} onClick={() => saveCms(block.key, block.state)}>
                  Save {block.label}
                </button>
              </div>
            ))}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
              <h2 className="font-black">Contacts</h2>
              <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} placeholder="Email" value={contacts.email || ''} onChange={(e) => setContacts({ ...contacts, email: e.target.value })} />
              <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} placeholder="Phone" value={contacts.phone || ''} onChange={(e) => setContacts({ ...contacts, phone: e.target.value })} />
              <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} placeholder="WhatsApp (Premium support — not shown on public contact page)" value={contacts.whatsapp || ''} onChange={(e) => setContacts({ ...contacts, whatsapp: e.target.value })} />
              <p className="text-xs text-slate-400">Public login Contact page shows email only. WhatsApp/SMS open only for Premium schools inside the app.</p>
              <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} placeholder="Address" value={contacts.address || ''} onChange={(e) => setContacts({ ...contacts, address: e.target.value })} />
              <button type="button" disabled={savingCms} className={btnGreen} onClick={() => saveCms('contacts', contacts)}>
                Save contacts
              </button>
            </div>
          </div>
    </>
  )
}
