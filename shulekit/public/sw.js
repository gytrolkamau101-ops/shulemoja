/* ShuleMoja service worker — app shell + static assets; never cache auth/API */
const CACHE = 'shulemoja-shell-v65'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

function isApiHost(hostname) {
  return (
    hostname.includes('supabase') ||
    hostname.includes('intasend') ||
    hostname.includes('sentry') ||
    hostname.includes('google') ||
    hostname.includes('gstatic')
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (isApiHost(url.hostname)) return

  // Navigations: network first, fall back to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put('/index.html', copy))
          }
          return res
        })
        .catch(async () => {
          const cached = await caches.match('/index.html')
          if (cached) return cached
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — ShuleMoja</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;margin:0;padding:24px;text-align:center}h1{font-size:1.25rem;margin:0 0 8px}p{color:#94a3b8;margin:0}</style></head><body><div><h1>You are offline</h1><p>ShuleMoja will reopen when the connection returns. Pending changes stay on this device until sync.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        })
    )
    return
  }

  // Same-origin static: cache first, then network (and update cache)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(request, copy))
            }
            return res
          })
          .catch(() => cached)
        return cached || fetched
      })
    )
  }
})
