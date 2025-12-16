const CACHE_NAME = 'a4-editor-cache-v5-16.12.2025-10';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './fonts/IBMPlexMono-Regular.ttf',
    './fonts/IBMPlexSans-Regular.ttf',
    './fonts/IBMPlexSerif-Regular.ttf',
    './fonts/CourierPrime-Regular.ttf',
    './fonts/Caveat-Regular.ttf',
    './imgs/ico.svg',
    './imgs/logo.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || 
        !event.request.url.startsWith(self.location.origin) ||
        event.request.url.startsWith('chrome-extension:') ||
        event.request.url.includes('extension')) {
        return;
    }
    
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(response => response || fetch(event.request))
        );
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(response => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => response || caches.match('./index.html'));
            return response || fetchPromise;
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});