const CACHE_NAME = 'parking-lot-v13';
const ASSETS = [
    './',
    './lottery.html',
    './index.html',
    './styles.css',
    './app.js',
    './parking-engine.js',
    './lottery-logic.js',
    './icon.png',
    './manifest.json',
    './maps/B2.json',
    './maps/B2-back.json',
    'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@400;600;700&display=swap'
];

// Install Event - Caching All Assets
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Installing V11 - Caching all assets');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Clean up old caches and take control
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => {
            console.log('[SW] V11 Activated - Taking control');
            return self.clients.claim();
        })
    );
});

// Fetch Event - Cache-First for Assets, Network-First for unknown
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // If not in cache, try network
            return fetch(event.request).catch(() => {
                // If both fail and it's a page request, return lottery.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./lottery.html');
                }
            });
        })
    );
});
