// src/scripts/config.js
/**
 * Sumber konfigurasi diurutkan:
 * 1) Environment build (Vite/webpack): import.meta.env / process.env
 * 2) Global runtime: window.__ENV atau window.CONFIG
 * 3) Fallback kosong (akan memicu error terarah)
 */
function readEnv() {
  const env = {};

  // Build-time (Vite/webpack/Node env)
  env.PUSH_SERVER_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PUSH_SERVER_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.PUSH_SERVER_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_PUSH_SERVER_URL) ||
    '';

  // Kunci VAPID: dukung beberapa nama agar tidak mismatch lagi
  env.VAPID_PUBLIC_KEY =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PUBLIC_VAPID_KEY) ||
    (typeof process !== 'undefined' && process.env && (process.env.VAPID_PUBLIC_KEY || process.env.PUBLIC_VAPID_KEY || process.env.VAPID_PUBLIC)) ||
    '';

  return env;
}

const buildEnv = readEnv();

// Runtime globals (optional)
const runtime = (typeof window !== 'undefined' && (window.__ENV || window.CONFIG)) || {};

const CONFIG = {
  BASE_URL: 'https://story-api.dicoding.dev/v1',

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

  // VAPID public key (url-safe base64)
  VAPID_PUBLIC_KEY: runtime.VAPID_PUBLIC_KEY || runtime.PUBLIC_VAPID_KEY || buildEnv.VAPID_PUBLIC_KEY || '',
};

// Validasi dini agar error jelas
if (!CONFIG.VAPID_PUBLIC_KEY) {
  // Jangan lempar exception keras di sini; biarkan caller yang memutus,
  // tapi kita log agar mudah didiagnosis.
  console.error('CONFIG: VAPID_PUBLIC_KEY tidak terkonfigurasi. Set VITE_PUBLIC_VAPID_KEY / VAPID_PUBLIC_KEY atau window.__ENV.VAPID_PUBLIC_KEY');
}

export default CONFIG;
