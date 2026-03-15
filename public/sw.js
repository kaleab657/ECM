const CACHE_NAME = 'ethiocars-v2';
const STATIC_CACHE = 'ethiocars-static-v2';

// Only cache assets we KNOW exist; never fail install on missing files
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

// Install Event — precache only guaranteed assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        console.warn('[SW] Precache failed for some assets:', err);
      })
  );
  self.skipWaiting();
});

// Activate Event — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Network-first for navigation, Stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept: API calls, non-http, chrome-extensions, firebase
  if (
    url.pathname.startsWith('/api') ||
    !url.protocol.startsWith('http') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    return;
  }

  // Navigation requests → network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets → stale-while-revalidate (only cache same-origin)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cross-origin requests (fonts, images from R2) → just fetch, no caching to avoid CORS issues
});

// Push Notification Event
self.addEventListener('push', (event) => {
  let data = { title: 'EthioCars', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'EthioCars', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || data.message || 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data,
    vibrate: [100, 50, 100],
    tag: data.tag || 'ethiocars-notification',
    renotify: true,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EthioCars', options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if any
      for (const client of clientList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
