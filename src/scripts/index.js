// src/scripts/index.js
import '../styles/styles.css';
import App from './pages/app';
import swRegister from './sw-register';
import { initPushToggle } from './push-manager';
import SyncManager from './utils/sync-manager';

console.log('DEBUG: index.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DEBUG: DOMContentLoaded fired');

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  await app.renderPage();

  // Deteksi production berbasis token compile-time dari DefinePlugin
  // Gunakan __PROD__ jika tersedia; fallback ke process.env.NODE_ENV.
  // Keduanya akan direplace ke literal saat build, jadi aman di browser.
  // eslint-disable-next-line no-undef
  const isProd = (typeof __PROD__ !== 'undefined' ? __PROD__ : process.env.NODE_ENV === 'production');

  if (isProd) {
    console.log('DEBUG: Production — registering service worker and push toggle');
    try {
      const reg = await swRegister();
      if (reg) initPushToggle();
    } catch (e) {
      console.error('SW registration or Push init failed:', e);
    }
  } else {
    console.log('DEBUG: Development — SW disabled (to avoid watch/reload loop)');
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    }
  }

  try {
    await SyncManager.flushQueueViaClient();
  } catch (err) {
    console.warn('Initial flush failed (likely offline):', err);
  }
  SyncManager.setupAutoFlush({ intervalMs: 30000 });

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });
});
