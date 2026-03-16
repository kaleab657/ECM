/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAGloaibYUVnqUVXIo3-7qi4-e3m2YhWu0",
  authDomain: "ethiocars-dd66e.firebaseapp.com",
  projectId: "ethiocars-dd66e",
  storageBucket: "ethiocars-dd66e.firebasestorage.app",
  messagingSenderId: "533268030508",
  appId: "1:533268030508:web:525f7941396df5e7969d89"
});

const messaging = firebase.messaging();

// Handle background push messages (when the app/tab is not focused)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  // Use notification data from the payload, falling back to data fields
  const title = payload.notification?.title || payload.data?.title || 'EthioCars';
  const body = payload.notification?.body || payload.data?.message || 'You have a new notification';

  const notificationOptions = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    tag: payload.data?.type || 'ethiocars-notification',
    renotify: true,
    vibrate: [100, 50, 100]
  };

  self.registration.showNotification(title, notificationOptions);
});

// Handle notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
