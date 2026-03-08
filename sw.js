const CACHE_NAME = 'parking-lot-v10';
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

// Install Event - Caching
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching assets...');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Cleaning Up Old Caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Offline First Strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(response => {
            return response || fetch(event.request);
        })
    );
});
