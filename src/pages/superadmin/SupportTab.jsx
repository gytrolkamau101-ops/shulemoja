import { supabase } from '../../supabaseClient'
import { btnGreen } from '../../components/ui'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'

export default function SupportTab({ tickets, setTickets }) {
  return (
    <>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-300">
              <p className="font-bold text-white mb-1">Support tickets</p>
              <p>In-app messages from Premium schools. Reply below; schools see your reply on their Support page.</p>
            </div>
            <div className="space-y-3">
              {(tickets || []).length === 0 && <p className="text-slate-400 text-sm">No tickets (run 21_v34_support.sql if empty after schools message).</p>}
              {(tickets || []).map((tk) => (
                <div key={tk.id} className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
                  <div className="flex justify-between gap-2 text-white font-bold">
                    <span>{tk.subject}</span>
                    <span className="text-xs text-amber-400 uppercase">{tk.status}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">School {String(tk.school_id).slice(0, 8)}… · {new Date(tk.created_at).toLocaleString()}</p>
                  <p className="text-slate-300 mt-2 whitespace-pre-wrap">{tk.body}</p>
                  {tk.media_url && <a className="text-cyan-400 text-xs" href={tk.media_url} target="_blank" rel="noreferrer">Media</a>}
                  {tk.admin_reply && <p className="mt-2 text-emerald-300 text-xs whitespace-pre-wrap">Reply: {tk.admin_reply}</p>}
                  <div className="mt-2 flex gap-2">
                    <input
                      className={saField}
                      style={{ color: '#f8fafc', backgroundColor: '#1e293b' }}
                      placeholder="Type reply…"
                      id={`reply-${tk.id}`}
                    />
                    <button
                      type="button"
                      className={btnGreen}
                      onClick={async () => {
                        const el = document.getElementById(`reply-${tk.id}`)
                        const reply = el?.value?.trim()
                        if (!reply) return
                        await supabase.from('support_tickets').update({ admin_reply: reply, status: 'replied', replied_at: new Date().toISOString() }).eq('id', tk.id)
                        el.value = ''
                        const { data: tks } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(100)
                        setTickets(tks || [])
                      }}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
    </>
  )
}
