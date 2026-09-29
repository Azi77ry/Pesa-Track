// Service Worker for PesaTrucker PWA
const CACHE_NAME = 'pesatrucker-v23';
const BASE_PATH = '/Pesa-Track';
const urlsToCache = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/css/styles.css`,
    `${BASE_PATH}/css/themes.css`,
    `${BASE_PATH}/vendor/bootstrap/css/bootstrap.min.css`,
    `${BASE_PATH}/vendor/bootstrap-icons/bootstrap-icons.min.css`,
    `${BASE_PATH}/vendor/bootstrap-icons/bootstrap-icons.min.css.map`,
    `${BASE_PATH}/vendor/bootstrap-icons/font/bootstrap-icons.woff2`,
    `${BASE_PATH}/vendor/bootstrap-icons/font/bootstrap-icons.woff`,
    `${BASE_PATH}/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2`,
    `${BASE_PATH}/vendor/bootstrap-icons/fonts/bootstrap-icons.woff`,
    `${BASE_PATH}/vendor/bootstrap/js/bootstrap.bundle.min.js`,
    `${BASE_PATH}/vendor/bootstrap/js/bootstrap.bundle.min.js.map`,
    `${BASE_PATH}/vendor/chartjs/chart.umd.min.js`,
    `${BASE_PATH}/vendor/chartjs/chart.umd.js.map`,
    `${BASE_PATH}/vendor/bootstrap/css/bootstrap.min.css.map`,
    `${BASE_PATH}/js/db.js`,
    `${BASE_PATH}/js/auth.js`,
    `${BASE_PATH}/js/license-keys.js`,
    `${BASE_PATH}/js/license.js`,
    `${BASE_PATH}/js/ui-helpers.js`,
    `${BASE_PATH}/js/notifications.js`,
    `${BASE_PATH}/js/app.js`,
    `${BASE_PATH}/js/ai.js`,
    `${BASE_PATH}/js/transactions.js`,
    `${BASE_PATH}/js/budgets.js`,
    `${BASE_PATH}/js/bills.js`,
    `${BASE_PATH}/js/events.js`,
    `${BASE_PATH}/js/reports.js`,
    `${BASE_PATH}/js/settings.js`,
    `${BASE_PATH}/js/goals.js`,
    `${BASE_PATH}/js/investments.js`,
    `${BASE_PATH}/js/sync.js`,
    `${BASE_PATH}/README.md`,
    `${BASE_PATH}/QUICKSTART.md`,
    `${BASE_PATH}/PROJECT_SUMMARY.md`,
    `${BASE_PATH}/DEVELOPER.md`,
    `${BASE_PATH}/assets/icon192.png`,
    `${BASE_PATH}/assets/icon144.png`
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
    console.log('Background sync triggered');
}

// Push Notifications
self.addEventListener('push', event => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { body: event.data ? event.data.text() : 'Financial update available' };
    }

    const title = data.title || 'PesaTrucker Alert';
    const options = {
        body: data.body || 'You have a new update in PesaTrucker.',
        icon: data.icon || `${BASE_PATH}/assets/icon192.png`,
        badge: data.badge || `${BASE_PATH}/assets/icon192.png`,
        vibrate: data.vibrate || [100, 50, 100, 50, 200],
        tag: data.tag || 'pesatrucker-push',
        renotify: true,
        data: data.data || { view: 'dashboard-view', url: `${BASE_PATH}/` },
        actions: data.actions || [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click Handler (System Notification Bar on mobile & desktop)
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const notifData = event.notification.data || {};
    const targetUrl = notifData.url || `${BASE_PATH}/`;
    const targetView = notifData.view || 'dashboard-view';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url.includes(BASE_PATH) && 'focus' in client) {
                    client.postMessage({
                        type: 'NAVIGATE_VIEW',
                        view: targetView
                    });
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
