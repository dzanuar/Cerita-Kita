/* Service Worker (custom) - used with Workbox InjectManifest
   Features:
   - precache via self.__WB_MANIFEST (injected at build time)
   - runtime caching for navigation and images
   - push notification handler with actions
   - notificationclick handler to focus/open the app
   - background sync handler for queued 'stories' when offline
*/

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { openDB } from 'idb';

precacheAndRoute(self.__WB_MANIFEST || []);

// Navigation requests (SPA shell)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'html-pages',
  })
);

// Static images - cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// OpenStreetMap tiles (stale while revalidate) - keep as runtime rule
registerRoute(
  ({ url }) => url.origin.includes('tile.openstreetmap.org'),
  new StaleWhileRevalidate({ cacheName: 'osm-tiles' })
);

// Simple local IndexedDB used for offline queueing (sync)
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

// Message listener (skip waiting from client)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Push notification handler
self.addEventListener('push', (event) => {
  let payload = { title: 'Notifikasi', body: 'Anda menerima notifikasi', url: '/' };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    // fallback to text
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

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  event.notification.close();

  if (action === 'dismiss') {
    return;
  }

  // Fokus atau buka jendela ke URL
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

// Background sync event - process queued stories
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
      // item should contain { url, method, headers, body }
      // Reconstruct FormData if body is an object (with possible Blob/File values)
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
            // If val is a Blob/File (has size and type), append with filename if available
            if (val && typeof val === 'object' && (typeof val.size === 'number' || val instanceof Blob)) {
              // val could be a File (has name) or Blob
              const filename = val.name || `${key}`;
              formData.append(key, val, filename);
            } else {
              formData.append(key, val);
            }
          }
          fetchBody = formData;
          // Don't set Content-Type header; browser will set boundary for multipart/form-data
          if (fetchOptions.headers && fetchOptions.headers['Content-Type']) {
            delete fetchOptions.headers['Content-Type'];
          }
        } catch (errForm) {
          // Fall back to sending JSON if FormData reconstruction fails
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
      // keep item in queue to retry later
    }
  }
}

// Optional fetch handler fallback (let Workbox precache/routing handle others)
