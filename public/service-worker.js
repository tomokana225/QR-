
// A simple service worker for caching application assets and enabling offline functionality.
const CACHE_NAME = 'qr-student-manager-cache-v2';
const URLS_TO_CACHE = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html5-qrcode'
];

// Install the service worker and cache core assets.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching core assets.');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => {
        console.error('Failed to open cache or cache assets:', err);
      })
  );
  self.skipWaiting();
});

// Clean up old caches when a new service worker is activated.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Serve content from the cache first (cache-first strategy), but exclude HTML to ensure env injection
self.addEventListener('fetch', event => {
  // Navigation requests (HTML) should go to network to get environment variables
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If a cached response is found, return it.
        if (response) {
          return response;
        }
        // Otherwise, fetch the resource from the network.
        return fetch(event.request);
      })
  );
});
