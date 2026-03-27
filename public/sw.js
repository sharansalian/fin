const CACHE_NAME = 'pocket-v5';
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  // Clear ALL old caches so stale assets never linger
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Listen for SKIP_WAITING message from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin navigation
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) return;

  // Let share-preview URLs pass through to the Cloud Function for OG meta tags
  const reqUrl = new URL(event.request.url);
  if (reqUrl.pathname.startsWith('/p/')) return;

  // Network first for API/Firebase calls
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('corsproxy.io')
  ) return;

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // For navigation requests (page loads / share target opens), fall back
        // to the cached app shell so the SPA can boot and handle routing.
        if (isNavigation) {
          return caches.match('/index.html') || caches.match('/');
        }
        return caches.match(event.request);
      })
  );
});
