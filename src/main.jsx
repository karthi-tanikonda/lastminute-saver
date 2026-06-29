import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Helper function to convert base64 VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register PWA Service Worker & Setup Push Notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker registered with scope: ', reg.scope);
        return navigator.serviceWorker.ready;
      })
      .then(async (reg) => {
        // Request browser notifications permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission not granted.');
          return;
        }

        // Fetch VAPID key
        const response = await fetch('/api/vapidPublicKey');
        if (!response.ok) throw new Error('VAPID key not available');
        const data = await response.json();
        const publicKey = data.publicKey;
        
        // Subscribe to push notifications
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // Send subscription payload to server
        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        console.log('Subscribed to PWA Push Notifications.');
      })
      .catch(err => {
        console.warn('PWA Push registration skipped or failed:', err.message);
      });
  });
}

