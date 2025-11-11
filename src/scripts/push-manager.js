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

/** Minta izin notifikasi bila belum ada */
async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Push: Notifications API tidak didukung di browser ini.');
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
    console.error('Push: VAPID_PUBLIC_KEY kosong. Set via src/public/env.js atau env build.');
    throw new Error('VAPID public key missing');
  }

  const applicationServerKey = urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

/** Validasi sederhana JWT (3 part terpisah titik & non-trivial) */
function isLikelyJwt(token) {
  return (
    typeof token === 'string' &&
    token.split('.').length === 3 &&
    token.length > 20
  );
}

/** Kirim subscription ke Story API: POST {BASE_URL}/notifications/subscribe */
async function sendSubscriptionToStoryAPI(subscription) {
  const endpoint = CONFIG.NOTIF_SUBSCRIBE_ENDPOINT; // ex: https://story-api.dicoding.dev/v1/notifications/subscribe
  const token = SessionStorage.getUserToken?.();

  if (!endpoint) throw new Error('Endpoint subscribe Story API tidak terdefinisi.');
  if (!token) throw new Error('Token tidak ditemukan. Login terlebih dahulu sebelum subscribe.');
  if (!isLikelyJwt(token)) {
    throw new Error('Token tidak valid. Silakan login ulang.');
  }

  // Pastikan body berupa object plain, bukan PushSubscription langsung
  const body = subscription?.toJSON ? subscription.toJSON() : subscription;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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
 * - cek token valid
 * - buat/ambil subscription
 * - kirim ke Story API
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

    const token = SessionStorage.getUserToken?.();
    if (!token) {
      console.warn('Push: belum login; tunda pendaftaran subscription.');
      return;
    }
    if (!isLikelyJwt(token)) {
      console.warn('Push: token login tidak tampak valid; abaikan registrasi push.');
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

/** Opsional: matikan push dari UI / saat logout */
export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    console.log('Push: subscription dihentikan (klien).');
  }
}
