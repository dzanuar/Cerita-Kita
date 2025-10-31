// src/scripts/index.js
import '../styles/styles.css';
import App from './pages/app';
import swRegister from './sw-register';
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

  // Render halaman pertama
  await app.renderPage();

  // --- PERBAIKAN DI SINI ---
  // Jangan menunggu 'window.load'.
  // Daftarkan SW dan tombol Push segera setelah DOM siap.
  console.log('DEBUG: DOM ready — registering service worker and push toggle');
  try {
    const registration = await swRegister();
    // Inisialisasi tombol Push setelah SW siap
    if (registration) {
      initPushToggle();
    }
  } catch (err) {
    console.error('SW registration or Push init failed:', err);
  }
  // --- AKHIR PERBAIKAN ---

  // Coba jalankan antrian sinkronisasi saat startup
  try {
    await SyncManager.flushQueueViaClient();
  } catch (err) {
    console.warn('Initial flush failed (likely offline):', err);
  }

  // Atur auto flush (saat online / periodik)
  SyncManager.setupAutoFlush({ intervalMs: 30000 });

  // Setup SPA routing
  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  // HAPUS 'window.load' listener yang lama
});