// Red Shark Storefront — Service Worker v3.0
const CACHE_NAME = 'rs-storefront-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch fresh from network for CSS and JS
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
