// src/scripts/index.js
import '../styles/styles.css';
import App from './pages/app';
import swRegister from './sw-register';
import { initPushToggle } from './push-manager';
import SyncManager from './utils/sync-manager';

console.log('DEBUG: index.js loaded');

async function initApp() {
  console.log('DEBUG: DOMContentLoaded fired');

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  // Render halaman pertama
  await app.renderPage();

  console.log('DEBUG: DOM ready — registering service worker and push toggle');
  try {
    const registration = await swRegister();
    if (registration) {
      // init pertama
      await initPushToggle();
    }
  } catch (err) {
    console.error('SW registration or Push init failed:', err);
  }

  // Flush antrian sync saat startup
  try {
    await SyncManager.flushQueueViaClient();
  } catch (err) {
    console.warn('Initial flush failed (likely offline):', err);
  }
  SyncManager.setupAutoFlush({ intervalMs: 30000 });

  // Re-render & re-init toggle setiap navigasi SPA
  window.addEventListener('hashchange', async () => {
    await app.renderPage();
    await initPushToggle(); // <-- re-inisialisasi tombol setelah DOM berganti
  });
}

document.addEventListener('DOMContentLoaded', initApp);
