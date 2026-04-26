/* Simple offline service worker:
   - Caches navigations and static assets on first load
   - Enables offline usage after first successful visit
*/

const VERSION = (() => {
  try {
    const url = new URL(self.location.href);
    const v = url.searchParams.get('v') || 'v1';
    const b = url.searchParams.get('b') || '';
    return b ? `${v}-${b}` : v;
  } catch {
    return 'v1';
  }
})();
const CACHE = `fursalink-cache-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/site.webmanifest',
        '/favicon.ico',
        '/brand/logo.png',
      ]),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // SPA navigations: network-first, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match('/index.html');
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        const fetchPromise = fetch(req)
          .then(async (res) => {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);

        return cached || (await fetchPromise) || Response.error();
      })(),
    );
  }
});
