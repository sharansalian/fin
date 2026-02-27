// ✏️ CUSTOMIZE: change cache name to match your app (bump version to force refresh)
const CACHE_NAME = 'myapp-v1';
const APP_SHELL  = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase')) return;

  const isNavigation = event.request.mode === 'navigate';
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
        }
        return res;
      })
      .catch(() => isNavigation
        ? caches.match('/index.html') || caches.match('/')
        : caches.match(event.request)
      )
  );
});
