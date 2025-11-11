// src/scripts/push-manager.js
import CONFIG from './config';
import SessionStorage from './utils/session-storage';

/** Base64 URL-safe → Uint8Array (untuk VAPID) */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** ArrayBuffer → base64url (untuk kunci p256dh/auth bila perlu) */
function ab2b64url(buf) {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Minta izin notifikasi bila belum ada */
async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Push: Notifications API tidak didukung.');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

/** Ambil subscription existing atau buat baru */
async function getOrCreateSubscription(registration) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  if (!CONFIG.VAPID_PUBLIC_KEY) {
    console.error('Push: VAPID_PUBLIC_KEY kosong. Set via env.js atau env build.');
    throw new Error('VAPID public key missing');
  }
  const applicationServerKey = urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

/** Normalisasi subscription: hanya { endpoint, keys: { p256dh, auth } } */
function normalizeSubscription(subscription) {
  // Coba ambil via toJSON()
  let raw = {};
  try {
    raw = subscription?.toJSON ? subscription.toJSON() : {};
  } catch {
    raw = {};
  }

  let endpoint = raw.endpoint || subscription?.endpoint || '';
  let keys = raw.keys || null;

  // Jika keys belum ada (atau kosong), ambil manual via getKey()
  if (!keys || !keys.p256dh || !keys.auth) {
    try {
      const p256dh = ab2b64url(subscription.getKey && subscription.getKey('p256dh'));
      const auth = ab2b64url(subscription.getKey && subscription.getKey('auth'));
      if (p256dh && auth) {
        keys = { p256dh, auth };
      }
    } catch {
      // biarkan keys tetap null; akan tertangani di bawah
    }
  }

  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new Error('Subscription tidak lengkap: endpoint/keys hilang.');
  }

  // Kembalikan hanya properti yang diizinkan API (tanpa expirationTime, dll)
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

/** Kirim subscription ke Story API: POST {BASE_URL}/notifications/subscribe */
async function sendSubscriptionToStoryAPI(subscription) {
  const endpoint = CONFIG.NOTIF_SUBSCRIBE_ENDPOINT; // ex: https://story-api.dicoding.dev/v1/notifications/subscribe
  const token = SessionStorage.getUserToken?.();
  if (!endpoint) throw new Error('Endpoint subscribe Story API tidak terdefinisi.');
  if (!token) throw new Error('Token tidak ditemukan. Login terlebih dahulu sebelum subscribe.');

  const payload = normalizeSubscription(subscription);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    // Kirim hanya endpoint + keys
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Subscribe ke Story API gagal: ${res.status} ${text}`);
  }
}

/**
 * Inisialisasi push:
 * - pastikan permission
 * - pastikan SW ready
 * - buat/ambil subscription
 * - kirim ke Story API (disanitasi)
 */
export async function initPushToggle() {
  try {
    const perm = await ensureNotificationPermission();
    if (perm !== 'granted') {
      console.warn('Push: permission tidak granted; fitur push dilewati.');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Push: serviceWorker tidak tersedia.');
      return;
    }

    // Jika user belum login, tunda—hindari error token
    const token = SessionStorage.getUserToken?.();
    if (!token) {
      console.warn('Push: belum login; tunda pendaftaran subscription.');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await getOrCreateSubscription(reg);
    await sendSubscriptionToStoryAPI(sub);

    console.log('Push: subscription aktif & terdaftar ke Story API.');
  } catch (err) {
    console.error('Push init error:', err);
  }
}

/** Opsional: matikan push dari UI */
export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    console.log('Push: subscription dihentikan (klien).');
  }
}
