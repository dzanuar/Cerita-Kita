// src/scripts/push-manager.js
import CONFIG from './config';

/**
 * Mengubah base64 url-safe public key menjadi Uint8Array untuk subscribe()
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Meminta permission notifikasi (kalau belum) dan mengembalikan statusnya.
 */
async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications API tidak didukung browser ini.');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  const perm = await Notification.requestPermission();
  return perm; // 'granted' | 'denied' | 'default'
}

/**
 * Membuat atau mengambil subscription push yang sudah ada.
 */
async function getOrCreateSubscription(registration) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  if (!CONFIG.VAPID_PUBLIC_KEY) {
    console.error('Push: VAPID_PUBLIC_KEY kosong. Set env VAPID_PUBLIC_KEY saat build.');
    throw new Error('VAPID public key missing');
  }

  const applicationServerKey = urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

/**
 * Mengirim subscription ke server push Anda.
 */
async function sendSubscriptionToServer(subscription) {
  const endpoint = CONFIG.PUSH_SUBSCRIBE_ENDPOINT;
  if (!endpoint) {
    console.warn('Push: PUSH_SUBSCRIBE_ENDPOINT kosong; lewati pengiriman ke server.');
    return;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Register subscription gagal: ${res.status} ${text}`);
  }
}

/**
 * Menghapus subscription di server push Anda (opsional: panggil saat toggle off).
 */
async function removeSubscriptionOnServer(subscription) {
  const endpoint = CONFIG.PUSH_UNSUBSCRIBE_ENDPOINT;
  if (!endpoint) return;
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});
}

/**
 * Dipanggil dari index.js setelah SW ter-register.
 * - Pastikan permission granted
 * - Buat subscription
 * - Kirim ke server
 */
export async function initPushToggle() {
  try {
    const perm = await ensureNotificationPermission();
    if (perm !== 'granted') {
      console.warn('Push: permission tidak granted; tombol/fitur push dinonaktifkan.');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Push: serviceWorker tidak tersedia.');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await getOrCreateSubscription(reg);
    await sendSubscriptionToServer(sub);

    console.log('Push: subscription aktif & terdaftar ke server.');
  } catch (err) {
    console.error('Push init error:', err);
  }
}

/**
 * Opsional: fungsi untuk menonaktifkan push via UI (toggle off).
 */
export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await removeSubscriptionOnServer(sub);
    await sub.unsubscribe();
    console.log('Push: subscription dihentikan.');
  }
}
