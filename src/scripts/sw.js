// src/scripts/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { openDB } from 'idb';

// ⬇️ WAJIB persis begini
precacheAndRoute(self.__WB_MANIFEST);

// HTML navigation
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'html-pages',
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Static assets (CSS/JS/Font/Favicon)
registerRoute(
  ({ request, url }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    (request.destination === 'image' && /\/favicon\.ico$/.test(url.pathname)),
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Local images (icons/screenshots/images)
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    (url.pathname.startsWith('/icons/') ||
     url.pathname.startsWith('/images/') ||
     url.pathname.startsWith('/screenshots/')),
  new CacheFirst({
    cacheName: 'local-images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 24 * 60 * 60 }),
    ],
  })
);

// OSM tiles
registerRoute(
  ({ url }) => url.origin.includes('tile.openstreetmap.org'),
  new StaleWhileRevalidate({
    cacheName: 'osm-tiles-cache',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Story images (cross-origin)
registerRoute(
  ({ url, request }) =>
    request.destination === 'image' &&
    url.origin === 'https://story-api.dicoding.dev' &&
    url.pathname.startsWith('/images/stories/'),
  new StaleWhileRevalidate({
    cacheName: 'story-images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// API stories (JSON) — agar data tetap ada saat offline
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === 'https://story-api.dicoding.dev' &&
    url.pathname.startsWith('/v1/stories'),
  new StaleWhileRevalidate({
    cacheName: 'api-stories-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// ===== DB / Sync / Push: sama seperti sebelumnya =====
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
async function addToQueue(item) { const db = await getDb(); return db.add(QUEUE_STORE, item); }
async function getAllQueue() { const db = await getDb(); return db.getAll(QUEUE_STORE); }
async function deleteQueueItem(id) { const db = await getDb(); return db.delete(QUEUE_STORE, id); }

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  let payload = { title: 'Notifikasi', body: 'Anda menerima notifikasi', url: '/' };
  try { if (event.data) payload = event.data.json(); } catch {}
  const title = payload.title || 'PWA Notification';
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    data: { url: payload.url || '/', dateOfArrival: Date.now(), primaryKey: payload.id || 0 },
    actions: [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification.data || {};
  event.notification.close();
  if (action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === data.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(data.url || '/');
    })
  );
});

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
      if (fetchBody && typeof fetchBody === 'object' && !(fetchBody instanceof ArrayBuffer) && !(fetchBody instanceof String)) {
        try {
          const formData = new FormData();
          for (const key of Object.keys(fetchBody)) {
            const val = fetchBody[key];
            if (val && typeof val === 'object' && (typeof val.size === 'number' || val instanceof Blob)) {
              formData.append(key, val, val.name || key);
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
      if (res && (res.status === 200 || res.status === 201)) await deleteQueueItem(item.id);
    } catch {}
  }
}
