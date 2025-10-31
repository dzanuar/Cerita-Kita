// src/scripts/index.js
import '../styles/styles.css';
import App from './pages/app';
import swRegister from './sw-register'; // pastikan file ini berada di src/scripts/sw-register.js
import { initPushToggle, ensureNotificationPermission } from './push-manager';
import SyncManager from './utils/sync-manager';

// Debug log
console.log('[DEBUG] index.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[DEBUG] DOMContentLoaded fired');

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  // Render halaman pertama
  await app.renderPage();

  // Jalankan mekanisme sinkronisasi offline
  try {
    await SyncManager.flushQueueViaClient();
  } catch (err) {
    console.warn('[Sync] Initial flush failed (likely offline):', err);
  }

  // Setup auto flush setiap 30 detik & saat kembali online
  SyncManager.setupAutoFlush({ intervalMs: 30000 });

  // Re-render ketika hash berubah (SPA routing)
  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  // === SERVICE WORKER REGISTRATION ===
  window.addEventListener('load', async () => {
    console.log('[DEBUG] window.load fired — registering service worker');

    try {
      const registration = await swRegister();
      console.log('[SW] Registered:', registration);

      // ✅ Perbaikan utama:
      // 1. Pastikan izin notifikasi diminta segera setelah SW siap.
      // 2. Tidak perlu menunggu klik tombol.
      await ensureNotificationPermission();

      // 3. Buat tombol toggle push di UI
      try {
        initPushToggle();
      } catch (e) {
        console.warn('[Push] initPushToggle failed:', e);
      }

      return registration;
    } catch (err) {
      console.error('[SW] Registration failed:', err);
    }
  });
});
