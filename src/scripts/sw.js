/* eslint-disable no-undef */
/* global self, clients */

import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  matchPrecache,
} from 'workbox-precaching';
import { registerRoute, setCatchHandler, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ——— Lifecycle ———
self.skipWaiting();
clientsClaim();

// ——— Precache hasil build ———
// ⚠️ Jangan menambahkan offline-image.png manual di sini.
// File dari src/public (termasuk /offline-image.png) sudah otomatis masuk manifest.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ——— App Shell / SPA navigation ———
const appShellHandler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(appShellHandler));

// ——— Runtime caching untuk asset (JS/CSS) ———
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'assets' })
);

// ——— Runtime caching gambar lokal (same-origin) ———
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' && url.origin === self.location.origin,
  new CacheFirst({
    cacheName: 'images-local',
    plugins: [
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 24 * 60 * 60 }), // 60 hari
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ——— Runtime caching gambar eksternal (CDN/dll) ———
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    url.origin !== self.location.origin,
  new CacheFirst({
    cacheName: 'images-external',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 hari
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ——— Khusus tile OpenStreetMap (Leaflet) ———
registerRoute(
  ({ url }) =>
    (url.hostname === 'a.tile.openstreetmap.org' ||
     url.hostname === 'b.tile.openstreetmap.org' ||
     url.hostname === 'c.tile.openstreetmap.org') &&
    url.pathname.endsWith('.png'),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }), // tile bisa opaque (0)
      new ExpirationPlugin({
        maxEntries: 300,                  // batasi jumlah tile
        maxAgeSeconds: 14 * 24 * 60 * 60, // 14 hari
      }),
    ],
  })
);

// ——— (Opsional) cache API GET agar daftar terakhir tetap ada saat offline ———
registerRoute(
  ({ url, request }) =>
    url.origin === 'https://story-api.dicoding.dev' &&
    url.pathname.startsWith('/v1') &&
    request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-story',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// ——— Global catch handler (fallback offline) ———
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return appShellHandler({ request });
  }
  if (request.destination === 'image') {
    // Ambil dari precache. Pastikan /offline-image.png ada di src/public (dan ikut ke dist).
    const fallback = await matchPrecache('/offline-image.png');
    return fallback || Response.error();
  }
  return Response.error();
});

// ——— Push Notifications ———
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return;

    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch (_) {
      try {
        const text = event.data?.text?.();
        data = { title: 'New Message', body: text || 'You have a new notification.' };
      } catch {
        data = { title: 'New Message', body: 'You have a new notification.' };
      }
    }

    const title = data.title || 'PWA App';
    const options = {
      body: data.body || 'You have a new notification.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: data.url ? { url: data.url } : {},
    };

    await self.registration.showNotification(title, options);
  })());
});

// ——— Klik notifikasi: buka/jump tab ———
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = allClients.find((c) => c.url.includes(url));
    if (open) {
      open.focus();
    } else {
      await clients.openWindow(url);
    }
  })());
});
