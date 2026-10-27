// Red Shark Storefront – Service Worker v26.2
const CACHE_NAME = 'rs-storefront-v26.2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests - never touch POST / PUT / Supabase RPC
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Serve dynamic Web App Manifest per shop
  if (url.pathname.endsWith('manifest.json') || url.pathname.endsWith('/manifest.json')) {
    const shopSlug = url.searchParams.get('shop') || 'shop101';
    const dynamicManifest = {
      name: `${shopSlug} — Red Shark Online Store`,
      short_name: shopSlug,
      description: `Order directly from ${shopSlug} store.`,
      start_url: `/?shop=${encodeURIComponent(shopSlug)}&source=pwa`,
      scope: `/`,
      display: "standalone",
      background_color: "#09101d",
      theme_color: "#dc2626",
      orientation: "portrait",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        }
      ]
    };

    event.respondWith(
      new Response(JSON.stringify(dynamicManifest), {
        headers: {
          'Content-Type': 'application/manifest+json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    );
    return;
  }

  // Safe standard fetch with cache fallback - never pass options to event.request
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
