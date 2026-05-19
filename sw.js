// ═══════════════════════════════════════════════════════
//  SERVICE WORKER — Kasir Warung Pro
//  Upload file ini ke GitHub di folder yang sama dengan index.html
// ═══════════════════════════════════════════════════════
const CACHE_NAME = 'kasir-warung-v3';

// Semua aset yang perlu di-cache agar bisa offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
];

// ── Install: cache semua aset ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll gagal jika satu URL error, gunakan add satu per satu
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(e => console.warn('Cache miss:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: hapus cache lama ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first untuk aset statis, network-first untuk halaman ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET dan browser-internal requests
  if (event.request.method !== 'GET') return;
  if (url.startsWith('chrome-extension://')) return;
  if (url.includes('bluetooth') || url.includes('api.')) return;

  // CDN assets (React, fonts, dll) → Cache First
  if (
    url.includes('unpkg.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return response;
        }).catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // Halaman utama (index.html) → Network First, fallback cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
