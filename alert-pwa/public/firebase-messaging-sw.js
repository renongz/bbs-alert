// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAbohcONTb1FGRjPiVxWblTc-esImwEcI8",
  authDomain: "bbs-alert.firebaseapp.com",
  projectId: "bbs-alert",
  storageBucket: "bbs-alert.appspot.com",
  messagingSenderId: "188088530343",
  appId: "1:188088530343:web:63f5a52963276ed0cdf282",
  measurementId: "G-3E21ZRM641"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);

  const notificationTitle = payload.notification?.title || "New Alert";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    data: payload.data || {}, // Pass type (panic/suspicious) in data
  };

  // Show system notification
  self.registration.showNotification(notificationTitle, notificationOptions);

  // Notify React app if it’s open
  self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        firebaseMessaging: {
          title: notificationTitle,
          body: notificationOptions.body,
          type: payload.data?.type || "suspicious",
        }
      });
    });
  });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow("/"); // Open app if no window
    })
  );
});
