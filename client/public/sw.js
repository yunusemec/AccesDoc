/**
 * AccessiScan Service Worker
 * Strateji: Cache-first for static assets, Network-first for API calls
 */

const CACHE_NAME    = 'accessiscan-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: static dosyaları önbelleğe al ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Statik dosyalar önbelleğe alınıyor...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Kurulum tamamlandı.');
      return self.skipWaiting();
    })
  );
});

// ── Activate: eski önbellekleri temizle ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Eski önbellek siliniyor:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Aktifleşti, tüm istemciler kontrol altında.');
      return self.clients.claim();
    })
  );
});

// ── Fetch: istek stratejisi ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API istekleri → her zaman ağdan al, önbelleğe alma
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Statik dosyalar → Cache-first, yoksa ağdan al + önbelleğe ekle
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Sadece başarılı GET isteklerini önbelle
        if (!response || response.status !== 200 || event.request.method !== 'GET') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Ağ yok + önbellekte de yok → /index.html dön (SPA fallback)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
