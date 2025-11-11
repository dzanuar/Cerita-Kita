// src/scripts/config.js
function readEnv() {
  const env = {};

  env.PUSH_SERVER_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PUSH_SERVER_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.PUSH_SERVER_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_PUSH_SERVER_URL) ||
    '';

  env.VAPID_PUBLIC_KEY =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PUBLIC_VAPID_KEY) ||
    (typeof process !== 'undefined' &&
      process.env &&
      (process.env.VAPID_PUBLIC_KEY || process.env.PUBLIC_VAPID_KEY || process.env.VAPID_PUBLIC)) ||
    (typeof window !== 'undefined' && window.__ENV && window.__ENV.VAPID_PUBLIC_KEY) ||
    '';

  return env;
}

const buildEnv = readEnv();
const runtime = (typeof window !== 'undefined' && (window.__ENV || window.CONFIG)) || {};

// -------------------------
// 🔍 Deteksi lingkungan
// -------------------------
const isDevServer =
  (typeof process !== 'undefined' && process.env && process.env.WEBPACK_DEV_SERVER === 'true') ||
  (typeof window !== 'undefined' &&
    window.location &&
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      (window.location.port === '9000')));

// ✅ Tambahan: deteksi domain vercel (untuk CORS fix)
const isVercel =
  typeof window !== 'undefined' && /vercel\.app$/.test(window.location.hostname);

const isProdBuild =
  typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';

// -------------------------
// ⚙️ Konfigurasi Utama
// -------------------------
const CONFIG = {
  // Gunakan proxy '/v1' saat dev-server atau domain vercel
  BASE_URL: (isDevServer || isVercel) ? '/v1' : 'https://story-api.dicoding.dev/v1',

  // (Legacy) untuk server push sendiri (tidak dipakai Story API)
  PUSH_SERVER_URL: runtime.PUSH_SERVER_URL || buildEnv.PUSH_SERVER_URL || 'http://localhost:3000',
  get PUSH_SUBSCRIBE_ENDPOINT() {
    return `${this.PUSH_SERVER_URL}/subscribe`;
  },
  get PUSH_UNSUBSCRIBE_ENDPOINT() {
    return `${this.PUSH_SERVER_URL}/unsubscribe`;
  },
  get PUSH_SEND_ENDPOINT() {
    return `${this.PUSH_SERVER_URL}/sendNotification`;
  },

  // Endpoint resmi Story API untuk notifikasi
  get NOTIF_SUBSCRIBE_ENDPOINT() {
    return `${this.BASE_URL}/notifications/subscribe`;
  },

  // Kunci publik untuk Web Push
  VAPID_PUBLIC_KEY:
    runtime.VAPID_PUBLIC_KEY ||
    runtime.PUBLIC_VAPID_KEY ||
    buildEnv.VAPID_PUBLIC_KEY ||
    '',
};

// -------------------------
// 🧩 Logging dev/production
// -------------------------
if (!CONFIG.VAPID_PUBLIC_KEY && isProdBuild) {
  console.error('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi.');
} else if (!CONFIG.VAPID_PUBLIC_KEY) {
  console.warn('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi (mode development).');
}

export default CONFIG;
