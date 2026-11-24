const CACHE = 'wys-musculation-v3';

const ASSETS = [
  './',
  './index.html',
  './split.html',
  './split.js',
  './backup.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k =>
          k.startsWith('wys-musculation-') &&
          k !== CACHE
        ).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(async r => {
        if (r.ok) {
          const c = await caches.open(CACHE);
          await c.put(e.request, r.clone());
        }
        return r;
      })
      .catch(async () => {
        const r = await caches.match(e.request);
        if (r) return r;
        if (e.request.mode === 'navigate') {
          const page = await caches.match('./index.html');
          if (page) return page;
        }
        return Response.error();
      })
  );
});
