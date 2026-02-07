// Firebase Cloud Messaging Service Worker

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values should match your Firebase project configuration
// In production, consider loading these from a config endpoint
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'StudyAsan Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/studyasan-logo.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
    requireInteraction: false,
    silent: false,
  };

  // Show notification
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Get the URL to open from the notification data
  const urlToOpen = event.notification.data?.url || '/';

  // Focus or open window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    // Resubscribe with the new subscription
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log('Resubscribed successfully:', subscription);
        // Send the new subscription to your server
        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      })
  );
});
