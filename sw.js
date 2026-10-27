// Red Shark Storefront – Service Worker v9.0
const CACHE_NAME = 'rs-storefront-v26.1';

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
  const url = new URL(event.request.url);

  // Serve dynamic Web App Manifest per shop
  if (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('manifest.json')) {
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
          src: "icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "assets/app-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "assets/app-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
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

  // Always fetch fresh from network with no-store to guarantee immediate CSS and JS updates
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
  );
});
