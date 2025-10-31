// src/scripts/push-manager.js
import CONFIG from './config';
import SessionStorage from './utils/session-storage';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function isSubscribed(registration) {
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription();
  return !!sub;
}

async function subscribeUser(registration) {
  if (!registration) throw new Error('Service Worker registration required');
  if (!('PushManager' in window)) throw new Error('Push not supported in this browser');
  if (!CONFIG.VAPID_PUBLIC_KEY) throw new Error('VAPID_PUBLIC_KEY not configured in CONFIG');

  const applicationServerKey = urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY);
  const opts = { userVisibleOnly: true, applicationServerKey };
  const subscription = await registration.pushManager.subscribe(opts);

  try {
    sessionStorage.setItem('pushSubscription', JSON.stringify(subscription));
  } catch (err) {
    console.warn('Could not persist subscription locally', err);
  }

  if (CONFIG.PUSH_SUBSCRIBE_ENDPOINT) {
    try {
      await fetch(CONFIG.PUSH_SUBSCRIBE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    } catch (err) {
      console.warn('Failed to send subscription to server:', err);
    }
  }

  return subscription;
}

async function unsubscribeUser(registration) {
  if (!registration) throw new Error('Service Worker registration required');
  const sub = await registration.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    try { sessionStorage.removeItem('pushSubscription'); } catch (e) {}
    if (CONFIG.PUSH_UNSUBSCRIBE_ENDPOINT) {
      try {
        await fetch(CONFIG.PUSH_UNSUBSCRIBE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      } catch (err) {
        console.warn('Failed to notify server of unsubscription', err);
      }
    }
    return true;
  }
  return false;
}

// === 🧩 PERBAIKAN UTAMA ===
async function ensureNotificationPermission() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    console.log('[Push] Requesting permission automatically...');
    try {
      const permission = await Notification.requestPermission();
      console.log('[Push] Permission result:', permission);
    } catch (err) {
      console.warn('[Push] Permission request failed:', err);
    }
  } else {
    console.log('[Push] Permission already:', Notification.permission);
  }
}

// === 🧩 UI HELPER ===
export function initPushToggle() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.right = '12px';
  container.style.bottom = '12px';
  container.style.zIndex = 9999;

  const btn = document.createElement('button');
  btn.id = 'push-toggle';
  btn.style.padding = '8px 12px';
  btn.style.borderRadius = '6px';
  btn.style.border = 'none';
  btn.style.background = '#2b6cb0';
  btn.style.color = '#fff';
  btn.style.cursor = 'pointer';
  btn.innerText = 'Enable Push';

  container.appendChild(btn);
  document.body.appendChild(container);

  async function updateState() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const perm = Notification.permission;
    const subscribed = await isSubscribed(reg);
    if (perm === 'granted' && subscribed) {
      btn.innerText = 'Disable Push';
    } else if (perm === 'granted' && !subscribed) {
      btn.innerText = 'Enable Push';
    } else if (perm === 'denied') {
      btn.innerText = 'Push Blocked';
      btn.disabled = true;
    } else {
      btn.innerText = 'Enable Push';
    }
  }

  btn.addEventListener('click', async () => {
    try {
      const reg = await navigator.serviceWorker.ready;

      // Pastikan izin ada sebelum berlangganan
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Permission denied. Please allow notifications.');
          return;
        }
      }

      const subscribed = await isSubscribed(reg);
      if (subscribed) {
        await unsubscribeUser(reg);
      } else {
        await subscribeUser(reg);
      }
      await updateState();
    } catch (err) {
      console.error('Push toggle error:', err);
      alert('Push subscription failed: ' + err.message);
    }
  });

  // === PERBAIKAN TAMBAHAN ===
  // Jalankan pemeriksaan otomatis saat tombol dibuat
  setTimeout(async () => {
    await ensureNotificationPermission();
    await updateState();
  }, 1500);
}

export { subscribeUser, unsubscribeUser, isSubscribed, ensureNotificationPermission };
