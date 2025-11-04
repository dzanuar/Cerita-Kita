// src/scripts/push-manager.js
import CONFIG from './config';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((ch) => ch.charCodeAt(0)));
}

async function getRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
  return navigator.serviceWorker.ready;
}

async function subscribe() {
  if (!CONFIG.VAPID_PUBLIC_KEY) {
    throw new Error('VAPID_PUBLIC_KEY not configured in CONFIG');
  }
  const reg = await getRegistration();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY),
  });

  // Simpan subscription di server
  await fetch(CONFIG.PUSH_SUBSCRIBE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });

  return sub;
}

async function unsubscribe() {
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try {
      await fetch(CONFIG.PUSH_UNSUBSCRIBE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch {
      // biarkan lanjut unsubscribe lokal sekalipun server gagal
    }
    await sub.unsubscribe();
  }
}

export async function initPushToggle() {
  const btn = document.querySelector('#btnPushToggle');
  if (!btn) return;

  const updateLabel = async () => {
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    btn.textContent = sub ? 'Disable notifications' : 'Enable notifications';
    btn.setAttribute('aria-pressed', sub ? 'true' : 'false');
  };

  btn.addEventListener('click', async () => {
    try {
      const reg = await getRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribe();
      } else {
        await subscribe();
      }
      await updateLabel();
    } catch (err) {
      console.error('Push toggle error:', err);
      alert(err.message || 'Failed to toggle push');
    }
  });

  await updateLabel();
}

export async function debugSendSample() {
  // Opsional: memicu notifikasi contoh dari server
  await fetch(CONFIG.PUSH_SEND_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Belajar Coding',
      body: 'Ada event baru ditambahkan. Klik untuk lihat detail.',
      icon: '/icons/icon-192x192.png',
      url: '/#/detail/123'
    }),
  });
}