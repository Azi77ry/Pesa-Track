// Service Worker for PesaTrucker PWA
const CACHE_NAME = 'pesatrucker-v26';
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
    `${BASE_PATH}/assets/icon192.png`,
    `${BASE_PATH}/assets/icon144.png`
];

// Install Service Worker - precache essential assets & immediately activate
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker - aggressively purge all outdated caches & claim clients
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Purging old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: Network-First for App Code (HTML, JS, CSS) to guarantee instant updates
// Cache-First with revalidation for static media (fonts, images)
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    const isCode = event.request.destination === 'document' ||
                   event.request.destination === 'script' ||
                   event.request.destination === 'style' ||
                   url.pathname.endsWith('.html') ||
                   url.pathname.endsWith('.js') ||
                   url.pathname.endsWith('.css');

    if (isCode) {
        // Network-First: Always fetch fresh code from the server when online
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request).then(cached => {
                        if (cached) return cached;
                        if (event.request.destination === 'document') {
                            return caches.match(`${BASE_PATH}/index.html`);
                        }
                        return new Response('Offline', { status: 503, statusText: 'Offline' });
                    });
                })
        );
        return;
    }

    // Static Assets (fonts, images): Cache-first with background cache update
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // Revalidate in background
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                    }
                }).catch(() => {});
                return cached;
            }

            return fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return networkResponse;
            });
        })
    );
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
