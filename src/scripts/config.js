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
    (typeof process !== 'undefined' && process.env && (process.env.VAPID_PUBLIC_KEY || process.env.PUBLIC_VAPID_KEY || process.env.PUBLIC_VAPID)) ||
    '';
  return env;
}

const buildEnv = readEnv();
const runtime = (typeof window !== 'undefined' && (window.__ENV || window.CONFIG)) || {};

// Deteksi production berbasis token compile-time
// eslint-disable-next-line no-undef
const isProd = (typeof __PROD__ !== 'undefined' ? __PROD__ : process.env.NODE_ENV === 'production');

const CONFIG = {
  // Saat production → gunakan domain API asli
  // Saat development → gunakan path proxy dev-server (/v1)
  BASE_URL: isProd ? 'https://story-api.dicoding.dev/v1' : '/v1',

  // PUSH server endpoints
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

  VAPID_PUBLIC_KEY: runtime.VAPID_PUBLIC_KEY || runtime.PUBLIC_VAPID_KEY || buildEnv.VAPID_PUBLIC_KEY || '',
};

if (!CONFIG.VAPID_PUBLIC_KEY && isProd) {
  console.error('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi.');
} else if (!CONFIG.VAPID_PUBLIC_KEY) {
  console.warn('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi (mode development).');
}

export default CONFIG;
