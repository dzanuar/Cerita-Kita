import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { openDB } from 'idb';

// 1. Precache App Shell (Sudah Benar)
precacheAndRoute(self.__WB_MANIFEST || []);

// 2. Cache Navigasi (Sudah Benar)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'html-pages',
  })
);

// 3. Cache Ikon Aplikasi Lokal (CacheFirst)
registerRoute(
  ({ request }) =>
    request.destination === 'image' &&
    (request.url.includes('/icons/') || request.url.includes('/images/')), // Ikon & gambar lokal
  new CacheFirst({
    cacheName: 'local-images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// 4. Cache Tile Peta (StaleWhileRevalidate)
registerRoute(
  ({ url }) => url.origin.includes('tile.openstreetmap.org'),
  new StaleWhileRevalidate({ 
    cacheName: 'osm-tiles-cache' 
  })
);

// 5. INI PERBAIKANNYA: Cache Gambar Cerita (StaleWhileRevalidate)
registerRoute(
  ({ url }) => url.href.startsWith('https://story-api.dicoding.dev/images/stories/'),
  new StaleWhileRevalidate({
    cacheName: 'story-images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60, // Simpan 60 gambar terakhir
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
      }),
    ],
  })
);


// --- SISANYA TETAP SAMA (IDB, PUSH, SYNC) ---

// Database untuk Sync Queue
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
async function addToQueue(item) {
  const db = await getDb();
  return db.add(QUEUE_STORE, item);
}
async function getAllQueue() {
  const db = await getDb();
  return db.getAll(QUEUE_STORE);
}
async function deleteQueueItem(id) {
  const db = await getDb();
  return db.delete(QUEUE_STORE, id);
}

// Lifecycle (Sudah Benar)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Push Notification (Sudah Benar)
self.addEventListener('push', (event) => {
  let payload = { title: 'Notifikasi', body: 'Anda menerima notifikasi', url: '/' };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    payload.body = event.data ? event.data.text() : payload.body;
  }

  const title = payload.title || 'PWA Notification';
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    data: {
      url: payload.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: payload.id || 0,
    },
    actions: [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click (Sudah Benar)
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  event.notification.close();

  if (action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(data.url);
      }
    })
  );
});

// Background Sync (Sudah Benar)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-new-stories') {
    event.waitUntil(processQueue());
  }
});
async function processQueue() {
  const queue = await getAllQueue();
  if (!queue || queue.length === 0) return;

  for (const item of queue) {
    try {
      let fetchBody = item.body;
      let fetchOptions = {
        method: item.method || 'POST',
        headers: item.headers || {},
      };

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
          if (fetchOptions.headers && fetchOptions.headers['Content-Type']) {
            delete fetchOptions.headers['Content-Type'];
          }
        } catch (errForm) {
          try {
            fetchBody = JSON.stringify(fetchBody);
            fetchOptions.headers = Object.assign({}, fetchOptions.headers, { 'Content-Type': 'application/json' });
          } catch (jsonErr) {
            console.error('SW: Failed to prepare queued item body', jsonErr);
          }
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