/* ═══════════════════════════════════════════
   SmartBandage AI — Service Worker
   Network-first strategy, instant SW takeover
   ═══════════════════════════════════════════ */

const CACHE = 'sb-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/dashboard.css',
  '/css/auth.css',
  '/js/hardware.js',
  '/js/drug-engine.js',
  '/js/wound-model.js',
  '/js/auth.js',
  '/js/app.js',
  '/manifest.json',
];

// Install: cache all assets immediately
self.addEventListener('install', e => {
  self.skipWaiting(); // take over immediately
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first (always fresh), fall back to cache offline
self.addEventListener('fetch', e => {
  // Only handle GET requests to our origin
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache a fresh copy
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request)) // offline fallback
  );
});
