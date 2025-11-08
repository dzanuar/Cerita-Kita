// src/scripts/sw-register.js
export default async function swRegister() {
  if (!('serviceWorker' in navigator)) {
    console.log('SW not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    registration.addEventListener('updatefound', () => {
      const nw = registration.installing;
      if (nw) {
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });

    console.log('SW registered:', registration);
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}
