'use strict';
const CACHE = 'cartas-offline-v1';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add('/offline.html')));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('cartas-offline-') && key !== CACHE)
      .map(key => caches.delete(key))
  )));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate' ||
      new URL(request.url).origin !== self.location.origin ||
      new URL(request.url).pathname.startsWith('/api/')) return;
  event.respondWith(fetch(request).catch(async () => {
    const page = await caches.match('/offline.html');
    return page || Response.error();
  }));
});
