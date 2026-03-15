importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAGloaibYUVnqUVXIo3-7qi4-e3m2YhWu0",
  authDomain: "ethiocars-dd66e.firebaseapp.com",
  projectId: "ethiocars-dd66e",
  storageBucket: "ethiocars-dd66e.firebasestorage.app",
  messagingSenderId: "533268030508",
  appId: "1:533268030508:web:525f7941396df5e7969d89"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/logo/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
