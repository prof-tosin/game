const CACHE_NAME = 'the-table-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',

  './games/karachi/index.html',
  './games/karachi/style.css',
  './games/karachi/game.js',

  './games/bible-trivia/index.html',
  './games/bible-trivia/style.css',
  './games/bible-trivia/game.js',
  './games/bible-trivia/questions.json'
];

// Install: cache everything up front so the whole hub works offline
// the very first time it's opened.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first, falling back to network, and stashing new
// same-origin responses as they come in.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && new URL(event.request.url).origin === location.origin){
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached: fall back to the hub shell for
          // navigations so the user never sees a browser error page.
          if (event.request.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
