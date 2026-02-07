import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Firebase Messaging Service Worker
// Note: This is separate from the PWA service worker
if ('serviceWorker' in navigator) {
  // Wait for the page to load to avoid conflicts
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      })
      .then((registration) => {
        console.log('Firebase Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Firebase Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
