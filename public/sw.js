// Bump CACHE_NAME on every deploy that ships visible front-end changes. The
// activate handler deletes every cache that does not match the current name,
// which is the only way to evict stale HTML on browsers that have an older
// version of the worker registered.
const CACHE_NAME = 'prodicta-v2'
const SHELL_URLS = [
  '/dashboard',
  '/login',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // API and auth always hit the network. No caching at this layer.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Navigations (HTML pages) are network-first. The cached copy is only
  // returned when the network fails, so a fresh deploy is visible on the
  // next page load instead of being shadowed by a stale shell.
  const isNavigation = event.request.mode === 'navigate'
    || (event.request.headers.get('accept') || '').includes('text/html')

  if (isNavigation) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => caches.match(event.request))
    )
    return
  }

  // Static assets (Next.js bundles, images, fonts) keep cache-first because
  // Next.js fingerprints filenames, so a new deploy ships new URLs and
  // never collides with the cached versions.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})
