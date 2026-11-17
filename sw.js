// Red Shark Storefront – Service Worker v26.5
const CACHE_NAME = 'rs-storefront-v26.8';

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

  // Never intercept or cache APK installer files - let browser handle download natively
  if (url.pathname.endsWith('.apk')) {
    return;
  }

  // Serve dynamic Web App Manifest per shop
  // The page passes the shop's own name and logo (name=…&logo=…). Without them, the server's (or
  // the site's) manifest is used as it is. Scope follows where this worker lives: "/" on the
  // cloud site, "/storefront/" on a shop's own server.
  if (url.pathname.endsWith('manifest.json') && url.searchParams.get('name')) {
    const shopSlug = url.searchParams.get('shop') || '';
    const shopName = url.searchParams.get('name');
    const logo = url.searchParams.get('logo') || '';
    const scope = new URL(self.registration.scope).pathname;
    const icons = [];
    if (logo) icons.push({ src: logo, sizes: 'any', purpose: 'any' });
    icons.push({ src: scope + 'assets/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' });
    icons.push({ src: scope + 'assets/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' });
    const dynamicManifest = {
      name: shopName,
      short_name: shopName.length > 15 ? shopName.substring(0, 15) : shopName,
      description: `Order online from ${shopName}`,
      start_url: `${scope}?${shopSlug ? 'shop=' + encodeURIComponent(shopSlug) + '&' : ''}source=pwa`,
      scope: scope,
      display: "standalone",
      background_color: "#09101d",
      theme_color: "#dc2626",
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
