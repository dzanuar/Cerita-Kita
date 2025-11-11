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
    (typeof process !== 'undefined' && process.env && (process.env.VAPID_PUBLIC_KEY || process.env.PUBLIC_VAPID_KEY || process.env.VAPID_PUBLIC)) ||
    (typeof window !== 'undefined' && window.__ENV && window.__ENV.VAPID_PUBLIC_KEY) ||
    '';
  return env;
}

const buildEnv = readEnv();
const runtime = (typeof window !== 'undefined' && (window.__ENV || window.CONFIG)) || {};

// Deteksi build mode berbasis flag dari webpack
const isProd =
  (typeof __PROD__ !== 'undefined' && __PROD__ === true) ||
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');

const isDevServer =
  // flag khas webpack-dev-server
  (typeof process !== 'undefined' && process.env && process.env.WEBPACK_DEV_SERVER === 'true') ||
  // host/port dev server klasik
  (typeof window !== 'undefined' &&
    window.location &&
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      (window.location.port === '9000')));

// ❗Kunci: di production SELALU pakai host absolut Story API.
// Hanya ketika dev-server aktif barulah pakai proxy '/v1'.
const CONFIG = {
  BASE_URL: isProd ? 'https://story-api.dicoding.dev/v1' : (isDevServer ? '/v1' : 'https://story-api.dicoding.dev/v1'),

  // (Legacy, tidak dipakai Story API; tetap dipertahankan agar tidak memecah kode lain)
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

  // Endpoint resmi Story API untuk subscription notifikasi
  get NOTIF_SUBSCRIBE_ENDPOINT() {
    return `${this.BASE_URL}/notifications/subscribe`;
  },

  VAPID_PUBLIC_KEY: runtime.VAPID_PUBLIC_KEY || runtime.PUBLIC_VAPID_KEY || buildEnv.VAPID_PUBLIC_KEY || '',
};

if (!CONFIG.VAPID_PUBLIC_KEY && isProd) {
  console.error('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi.');
} else if (!CONFIG.VAPID_PUBLIC_KEY) {
  console.warn('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi (mode development).');
}

export default CONFIG;
