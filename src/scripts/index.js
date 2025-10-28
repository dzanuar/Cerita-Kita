// src/scripts/index.js
import '../styles/styles.css';
import App from './pages/app';
import swRegister from './sw-register'; // pastikan file ini berada di src/scripts/sw-register.js
import { initPushToggle } from './push-manager';
import SyncManager from './utils/sync-manager';

// debug
console.log('DEBUG: index.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DEBUG: DOMContentLoaded fired');

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  // render first page
  await app.renderPage();

  // Attempt to flush any queued offline uploads on startup
  try {
    await SyncManager.flushQueueViaClient();
  } catch (err) {
    console.warn('Initial flush failed (likely offline):', err);
  }

  // Start auto flush mechanism (online event + periodic)
  SyncManager.setupAutoFlush({ intervalMs: 30000 });

  // re-render saat hash berubah (SPA routing)
  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  // Daftarkan service worker saat window.load atau segera setelah app render selesai.
  // window.load menunggu semua aset (gambar, font) selesai; cukup aman untuk registrasi SW.
  window.addEventListener('load', () => {
    console.log('DEBUG: window.load fired — registering service worker');
      swRegister()
        .then((registration) => {
          // Initialize push toggle UI after SW is ready
          try {
            initPushToggle();
          } catch (e) {
            console.warn('Push toggle init failed:', e);
          }
          return registration;
        })
        .catch((err) => console.error('swRegister error:', err));
  });
});
