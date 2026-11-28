// Red Shark Storefront – Service Worker v28.2
const CACHE_NAME = 'rs-storefront-v28.2';
const ICON_CACHE = 'rs-shop-icon';   // square shop icons drawn by the store page (kept across updates)

function readShopIcon(key) {
  return new Promise((resolve) => {
    try {
      const rq = indexedDB.open('rs-shop-icons', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('icons');
      rq.onerror = () => resolve(null);
      rq.onsuccess = () => {
        const db = rq.result;
        try {
          const g = db.transaction('icons', 'readonly').objectStore('icons').get(key);
          g.onsuccess = () => { db.close(); resolve(g.result || null); };
          g.onerror = () => { db.close(); resolve(null); };
        } catch (e) { db.close(); resolve(null); }
      };
    } catch (e) { resolve(null); }
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== ICON_CACHE).map((key) => caches.delete(key))
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
  const scope = new URL(self.registration.scope).pathname;

  // Never intercept or cache APK installer files - let browser handle download natively
  if (url.pathname.endsWith('.apk')) {
    return;
  }

  // The shop's square app icon (drawn from its logo by the store page, kept in IndexedDB)
  if (url.pathname.startsWith(scope + 'shop-icon/')) {
    event.respondWith(
      readShopIcon(url.pathname + url.search)
        .then((blob) => blob
          ? new Response(blob, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
          : fetch(scope + 'assets/app-icon-512.png'))
        .catch(() => fetch(scope + 'assets/app-icon-512.png'))
    );
    return;
  }

  // Serve the app manifest of THIS shop (name, icon, start page). Every shop gets its own app id,
  // so two shops installed from the same site never replace or open each other. Scope follows
  // where this worker lives: "/" on the cloud site, "/storefront/" on a shop's own server.
  if (url.pathname.endsWith('manifest.json') && url.searchParams.get('name')) {
    const shopSlug = url.searchParams.get('shop') || '';
    const shopName = url.searchParams.get('name');
    // Only a square icon makes the store installable: the shop's own square icon when the page
    // passes one (icon=…), otherwise the square default icons.
    const icon = url.searchParams.get('icon') || '';
    const icons = icon
      ? [{ src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' }]
      : [{ src: scope + 'assets/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
         { src: scope + 'assets/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }];
    const shopQ = shopSlug ? 'shop=' + encodeURIComponent(shopSlug) : '';
    const dynamicManifest = {
      id: `${scope}?${shopQ || 'shop=default'}`,
      name: shopName,
      short_name: shopName.length > 15 ? shopName.substring(0, 15) : shopName,
      description: `Order online from ${shopName}`,
      start_url: `${scope}?${shopQ ? shopQ + '&' : ''}source=pwa`,
      scope: scope,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: /^#[0-9a-f]{6}$/i.test(url.searchParams.get('color') || '') ? url.searchParams.get('color') : "#dc2626",
      orientation: "portrait",
      icons
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
