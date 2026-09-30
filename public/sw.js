const CACHE_NAME = 'glow-ai-pwa-v24';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/app.js?v=83',
  '/glow15.js?v=16',
  '/i18n.js?v=2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls must remain network-first; never serve stale analysis/payment data.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation: use the live app when online, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Versioned app/i18n assets must always refresh after a deployment.
  if (url.pathname === '/app.js' || url.pathname === '/i18n.js') {
    const freshUrl = new URL(request.url); if (url.pathname === '/app.js') freshUrl.search = '?v=83'; if (url.pathname === '/i18n.js') freshUrl.search = '?v=3'; event.respondWith(fetch(new Request(freshUrl.toString(), {cache: 'no-store'})));
    return;
  }

  // Static assets: cache-first with a network fallback.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});