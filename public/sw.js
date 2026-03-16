const CACHE_NAME = 'ethiocars-v4';
const STATIC_CACHE = 'ethiocars-static-v4';
const IMAGE_CACHE = 'ethiocars-images-v3';

// Essential static assets for initial load
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico'
];

// Install Event — precache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => console.warn('[SW] Precache failed:', err))
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate Event — aggressive old cache cleanup + client claiming
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, STATIC_CACHE, IMAGE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
    })
  );
  // Claim control over all open tabs immediately
  self.clients.claim();
});

// Helper for image response checking
const isImageResponse = (response) => {
  return response && response.status === 200 && response.headers.get('content-type')?.includes('image');
};

// Fetch Event — Dual Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never intercept Firebase APIs, Auth endpoints, or external core services
  if (
    !url.protocol.startsWith('http') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET' // Only cache GET requests
  ) {
    return;
  }

  // 2. Navigation requests (index.html) → Network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cached index.html, then to offline.html
          return caches.match('/index.html')
            .then(cachedResponse => cachedResponse || caches.match('/offline.html'))
            .catch(() => caches.match('/offline.html'));
        })
    );
    return;
  }

  // 3. Cloudflare R2 Images → Cache-first
  // Do NOT cache the actual cross-origin request if it fails, only successful image fetches.
  if (url.hostname.includes('r2.dev') || url.hostname.includes('cloudflarestorage.com')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (isImageResponse(response)) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Do nothing on failure, let it fail gracefully (images handled by onerror in UI)
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // 4. Static assets (JS/CSS/Locales) → Cache-first for performance, fallback to network
  // Only cache same-origin assets that are not navigation
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // If network fails, try to return offline snippet (mostly for unhandled cases)
            return caches.match('/offline.html');
          });
      })
    );
    return;
  }
});

// ⚠️ REVIEW: Push Event Handler
self.addEventListener('push', (event) => {
  let data = { title: 'EthioCars', body: 'New notification' };
  
  if (event.data) {
    try { 
      data = event.data.json(); 
    } catch (e) { 
      try {
        data = { title: 'EthioCars', body: event.data.text() }; 
      } catch (err) {
        console.warn('[SW] Failed to parse push payload', err);
      }
    }
  }

  const options = {
    body: data.body || data.message || 'Notification received',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'ethiocars-general',
    renotify: true,
    data: data
  };
  event.waitUntil(self.registration.showNotification(data.title || 'EthioCars', options));
});

// ⚠️ REVIEW: Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(location.origin) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
