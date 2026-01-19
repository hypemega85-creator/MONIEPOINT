const CACHE_NAME = 'mp-ai-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (e.request.url.startsWith('http')) {
            cache.put(e.request, response.clone());
          }
          return response;
        });
      });
    }).catch(() => caches.match('/index.html'))
  );
});