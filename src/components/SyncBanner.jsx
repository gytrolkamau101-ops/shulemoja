import { useEffect, useState, useRef } from 'react'
import { queueCount, isOnline, flushQueue } from '../lib/offline'
import { buildOfflineHandlers } from '../lib/offlineHandlers'
import { supabase } from '../supabaseClient'
import { toast } from './ui'

/** Shows offline queue status; auto-sync when back online; manual sync button */
export default function SyncBanner() {
  const [n, setN] = useState(0)
  const [online, setOnline] = useState(true)
  const [busy, setBusy] = useState(false)
  const syncing = useRef(false)

  const refresh = () => {
    setN(queueCount())
    setOnline(isOnline())
  }

  const sync = async (silent) => {
    if (syncing.current || !isOnline()) return
    syncing.current = true
    setBusy(true)
    try {
      const r = await flushQueue(buildOfflineHandlers(supabase))
      if (!silent) {
        if (r.flushed) toast(`Synced ${r.flushed} offline item(s)`, 'ok')
        if (r.fail) toast(`${r.fail} item(s) failed — will retry`, 'error')
      } else if (r.flushed) {
        toast(`Synced ${r.flushed} offline item(s)`, 'ok')
      }
      refresh()
    } finally {
      setBusy(false)
      syncing.current = false
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    const onOnline = () => {
      refresh()
      // Auto-flush when connection returns
      setTimeout(() => sync(true), 800)
    }
    const onOffline = () => refresh()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearInterval(id)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (n === 0 && online) return null

  return (
    <div
      className={`px-3 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${
        online ? 'bg-amber-50 text-amber-950 border-b border-amber-200' : 'bg-slate-800 text-white'
      }`}
    >
      <span>
        {!online ? 'Offline — changes save on this device' : null}
        {online && n > 0 ? `${n} change(s) waiting to sync` : null}
        {!online && n > 0 ? ` · ${n} pending` : null}
      </span>
      {online && n > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => sync(false)}
          className="px-3 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-black"
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
      )}
    </div>
  )
}
