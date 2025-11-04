import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { openDB } from 'idb';

// === PRE-CACHE APP SHELL ===
// WAJIB: persis seperti ini (tanpa komentar di baris yang sama)
precacheAndRoute(self.__WB_MANIFEST);

// === HTML (navigasi SPA) ===
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'html-pages',
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// === STATIC ASSETS (CSS/JS/Font/Favicon) ===
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

// === GAMBAR LOKAL (icons / images / screenshots) ===
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
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 24 * 60 * 60 }),
    ],
  })
);

// === OSM TILES (CacheFirst supaya offline tidak error) ===
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    url.hostname.endsWith('tile.openstreetmap.org'),
  new CacheFirst({
    cacheName: 'osm-tiles-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 24 * 60 * 60 }),
    ],
  })
);

// === GAMBAR CERITA (cross-origin) — gunakan CacheFirst ===
registerRoute(
  ({ url, request }) =>
    request.destination === 'image' &&
    url.origin === 'https://story-api.dicoding.dev' &&
    url.pathname.startsWith('/images/stories/'),
  new CacheFirst({
    cacheName: 'story-images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// === API STORIES (JSON) — data tetap ada saat offline (ter-cache saat online) ===
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

// === FALLBACK: bila request gambar gagal & belum ada di cache, tampilkan placeholder SVG ===
setCatchHandler(async ({ event, request }) => {
  if (request && request.destination === 'image') {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-family="Arial" font-size="14">
          Offline - image not cached
        </text>
      </svg>`;
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
  }
  // Untuk request lain, biarkan error default (agar tidak menutupi bug penting)
  return Response.error();
});

// === IDB / SYNC QUEUE (punyamu tetap sama) ===
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

// Lifecycle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

// === PUSH NOTIFICATION ===
self.addEventListener('push', (event) => {
  let payload = { title: 'Notifikasi', body: 'Anda menerima notifikasi', url: '/' };
  try { if (event.data) payload = event.data.json(); } catch { /* ignore */ }

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

// Klik notifikasi → fokus/ buka tab target
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

// Background Sync
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
    } catch { /* biarkan tetap di queue untuk dicoba lagi */ }
  }
}
