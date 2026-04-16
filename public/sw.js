const CACHE_NAME = 'interpulse-v3';
const urlsToCache = [
  '/',
  '/catat-tensi',
  '/monitor-jantung',
  '/postur-tubuh',
  '/tips-kesehatan',
  '/video-kesehatan',
  '/profil',
  '/manifest.json',
  '/logo-app.png',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// Install event - cache resources and skip waiting
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[InterPulse SW] Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
  // Langsung aktifkan SW baru tanpa menunggu
  self.skipWaiting();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate event - clean up ALL old caches (including from other apps)
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Hapus SEMUA cache yang bukan cache kita saat ini
          if (cacheName !== CACHE_NAME) {
            console.log('[InterPulse SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Klaim semua clients agar SW baru segera aktif
      return self.clients.claim();
    })
  );
});

// Push notification handler (optional)
self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : 'InterPulse - Reminder Kesehatan',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Buka InterPulse',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Tutup',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('InterPulse', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
