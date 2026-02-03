// Service Worker for PesaTrucker PWA
const CACHE_NAME = 'pesatrucker-v13';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/themes.css',
    '/vendor/bootstrap/css/bootstrap.min.css',
    '/vendor/bootstrap-icons/bootstrap-icons.min.css',
    '/vendor/bootstrap-icons/bootstrap-icons.min.css.map',
    '/vendor/bootstrap-icons/font/bootstrap-icons.woff2',
    '/vendor/bootstrap-icons/font/bootstrap-icons.woff',
    '/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2',
    '/vendor/bootstrap-icons/fonts/bootstrap-icons.woff',
    '/vendor/bootstrap/js/bootstrap.bundle.min.js',
    '/vendor/bootstrap/js/bootstrap.bundle.min.js.map',
    '/vendor/chartjs/chart.umd.min.js',
    '/vendor/chartjs/chart.umd.js.map',
    '/vendor/bootstrap/css/bootstrap.min.css.map',
    '/js/db.js',
    '/js/auth.js',
    '/js/license-keys.js',
    '/js/license.js',
    '/js/app.js',
    '/js/transactions.js',
    '/js/budgets.js',
    '/js/bills.js',
    '/js/reports.js',
    '/js/settings.js',
    '/js/sync.js',
    '/assets/icon192.png',
    '/assets/icon144.png'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Fetch from cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                return fetch(event.request).then(
                    response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background Sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // This would sync data with the server
    console.log('Background sync triggered');
    
    // In production, this would:
    // 1. Get unsync items from IndexedDB
    // 2. Send them to the server
    // 3. Mark them as synced
}

// Push Notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/assets/icon192.png',
        badge: '/assets/icon192.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('PesaTrucker', options)
    );
});

// Notification Click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
