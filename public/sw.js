// PRODICTA service worker.
//
// Bump CACHE_NAME on every deploy that ships visible front-end changes.
// The activate handler deletes every cache that does not match the
// current name, which is the only way to evict stale HTML on browsers
// that have an older version of the worker registered.
//
// Bumped to v3 to fix a TypeError in production where two code paths
// in the previous fetch handler could resolve to undefined (network
// failure on an un-cached navigation, or a static asset miss with
// network failure). respondWith(undefined) throws "Failed to convert
// value to 'Response'" — every branch now ends in a real Response.
const CACHE_NAME = 'prodicta-v3'
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

// Cache writes are fire-and-forget but every put is wrapped so an
// opaque cross-origin response or a QuotaExceeded does not produce an
// unhandled promise rejection in the worker.
function safeCachePut(request, response) {
  if (!response || !response.ok) return
  const clone = response.clone()
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // API and auth always hit the network. No caching at this layer.
  // Returning without calling event.respondWith hands the request back
  // to the browser's default handling.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  const isNavigation = event.request.mode === 'navigate'
    || (event.request.headers.get('accept') || '').includes('text/html')

  event.respondWith((async () => {
    try {
      if (isNavigation) {
        // Network-first for HTML so a fresh deploy is visible on the
        // next page load. The cached copy is only used when the
        // network fails. If both fail we still return a real Response
        // so respondWith never resolves to undefined.
        try {
          const networkResponse = await fetch(event.request)
          safeCachePut(event.request, networkResponse)
          return networkResponse
        } catch (networkErr) {
          const cachedResponse = await caches.match(event.request)
          if (cachedResponse) return cachedResponse
          return new Response(
            'You are offline and this page is not in the cache.',
            { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
          )
        }
      }

      // Cache-first for static assets. Next.js fingerprints filenames,
      // so a new deploy ships new URLs and never collides with cached
      // versions, which means stale-cache here is safe.
      const cachedResponse = await caches.match(event.request)
      if (cachedResponse) return cachedResponse
      try {
        const networkResponse = await fetch(event.request)
        safeCachePut(event.request, networkResponse)
        return networkResponse
      } catch (networkErr) {
        return new Response(
          'Resource unavailable offline.',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        )
      }
    } catch (err) {
      // Belt and braces. If anything above throws unexpectedly, return
      // a real Response so respondWith does not reject and crash the
      // worker.
      console.error('[sw] fetch handler error:', err && err.message)
      return new Response(
        'Service worker error.',
        { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      )
    }
  })())
})
