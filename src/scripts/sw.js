/* eslint-disable no-undef */
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { openDB } from 'idb';

// 1. Precache App Shell
precacheAndRoute(self.__WB_MANIFEST || []);

// 2. Cache Navigasi (HTML)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({ cacheName: 'html-pages' })
);

// 3. Cache Ikon & Gambar Lokal
registerRoute(
  ({ request }) =>
    request.destination === 'image' &&
    (request.url.includes('/icons/') || request.url.includes('/images/')),
  new CacheFirst({
    cacheName: 'local-images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// 4. Cache Tile Peta
registerRoute(
  ({ url }) => url.origin.includes('tile.openstreetmap.org'),
  new StaleWhileRevalidate({ cacheName: 'osm-tiles-cache' })
);

// 5. Cache Gambar Cerita (CDN Dicoding)
registerRoute(
  ({ url }) => url.href.startsWith('https://story-api.dicoding.dev/images/stories/'),
  new StaleWhileRevalidate({
    cacheName: 'story-images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// 6. Cache DATA DINAMIS API (Stale-While-Revalidate)
//   → Saat offline, daftar/story terakhir tetap ada (Skilled/Advanced saran reviewer)
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === 'https://story-api.dicoding.dev' &&
    (url.pathname.startsWith('/v1/stories') || url.pathname.startsWith('/v1/detail')),
  new StaleWhileRevalidate({
    cacheName: 'api-stories-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  })
);

// ==== IndexedDB untuk Background Sync Queue ====
const DB_NAME = 'pwa-app-db';
const DB_VERSION = 1;
const QUEUE_STORE = 'sync-queue';

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}
async function getAllQueue() {
  const db = await getDb();
  return db.getAll(QUEUE_STORE);
}
async function deleteQueueItem(id) {
  const db = await getDb();
  return db.delete(QUEUE_STORE, id);
}

// Lifecycle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ==== PUSH NOTIFICATION ====
// Dinamis + actions (Skilled/Advanced)
self.addEventListener('push', (event) => {
  let payload = { title: 'Notifikasi Baru', body: 'Ada data baru ditambahkan.', url: '/' };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  const title = payload.title || 'PWA Notification';
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    data: { url: payload.url || '/', id: payload.id || Date.now() },
    actions: [
      { action: 'open', title: 'Lihat Detail' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const same = all.find((c) => c.url.includes(new URL(targetUrl, self.location.origin).pathname));
      if (same) {
        await same.focus();
        return same.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    })()
  );
});

// ==== BACKGROUND SYNC ====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-new-stories') event.waitUntil(processQueue());
});

async function processQueue() {
  const queue = await getAllQueue();
  if (!queue || queue.length === 0) return;

  for (const item of queue) {
    try {
      let fetchBody = item.body;
      const fetchOptions = { method: item.method || 'POST', headers: item.headers || {} };

      // Siapkan body (FormData atau JSON)
      if (fetchBody && typeof fetchBody === 'object' && !(fetchBody instanceof ArrayBuffer) && !(fetchBody instanceof String)) {
        try {
          const formData = new FormData();
          for (const key of Object.keys(fetchBody)) {
            const val = fetchBody[key];
            if (val && typeof val === 'object' && (typeof val.size === 'number' || val instanceof Blob)) {
              const filename = val.name || `${key}`;
              formData.append(key, val, filename);
            } else {
              formData.append(key, val);
            }
          }
          fetchBody = formData;
          if (fetchOptions.headers && fetchOptions.headers['Content-Type']) delete fetchOptions.headers['Content-Type'];
        } catch {
          fetchBody = JSON.stringify(fetchBody);
          fetchOptions.headers = Object.assign({}, fetchOptions.headers, { 'Content-Type': 'application/json' });
        }
      }

      const res = await fetch(item.url, Object.assign(fetchOptions, { body: fetchBody }));
      if (res && (res.status === 200 || res.status === 201)) {
        await deleteQueueItem(item.id);
      } else {
        console.warn('SW sync: server rejected item', item, res && res.status);
      }
    } catch (err) {
      console.error('SW sync: Failed to send queued item', err);
    }
  }
}
