// Fix: Prevent Google Translate DOM alterations (<font> tags) from crashing React with NotFoundError
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child) as T;
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return referenceNode.parentNode.insertBefore(newNode, referenceNode) as T;
      }
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/google-translate.css'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'

// Register Firebase Messaging Service Worker
// Note: Service workers are web-only — skip on Capacitor native apps where
// @capacitor/push-notifications handles FCM natively via APNs / FCM SDK.
import { Capacitor } from '@capacitor/core';

if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
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
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
