// src/scripts/sw-register.js
export default async function swRegister() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service worker not supported');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    // Tunggu ready supaya Push siap dipakai
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    throw err;
  }
}
