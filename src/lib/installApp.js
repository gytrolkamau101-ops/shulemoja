/** PWA install prompt — capture beforeinstallprompt; same origin, no extra permissions */

let deferred = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(canInstall())
    } catch (_) {}
  })
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function canInstall() {
  return !!(deferred && !isStandalone())
}

export function onInstallAvailability(fn) {
  listeners.add(fn)
  try {
    fn(canInstall())
  } catch (_) {}
  return () => listeners.delete(fn)
}

export function initInstallCapture() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** Returns true if prompt was shown */
export async function promptInstall() {
  if (!deferred) return false
  const e = deferred
  deferred = null
  notify()
  e.prompt()
  const choice = await e.userChoice
  return choice?.outcome === 'accepted'
}
