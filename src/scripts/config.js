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

// Deteksi **khusus** dev-server (bukan sekadar NODE_ENV)
// Hanya jika benar-benar pakai webpack-dev-server (proxy /v1)
const isDevServer =
  (typeof process !== 'undefined' && process.env && process.env.WEBPACK_DEV_SERVER === 'true') ||
  (typeof window !== 'undefined' &&
    window.location &&
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      // ganti 9000 bila port dev berbeda
      (window.location.port === '9000')));

const isProdBuild = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');

const CONFIG = {
  // Gunakan proxy '/v1' **hanya** saat dev-server.
  BASE_URL: isDevServer ? '/v1' : 'https://story-api.dicoding.dev/v1',

  // kompat lama (tidak lagi dipakai untuk Story API, tapi dibiarkan agar tidak memecah kode lain)
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

if (!CONFIG.VAPID_PUBLIC_KEY && isProdBuild) {
  console.error('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi.');
} else if (!CONFIG.VAPID_PUBLIC_KEY) {
  console.warn('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi (mode development).');
}

export default CONFIG;
