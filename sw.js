// Service Worker for A4 Editor – enables offline support and caching of static assets

const CACHE_NAME = 'a4-editor-cache-25.12.2025-1';
// List of assets to cache on install
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './js/app.js',
    './js/state.js',
    './js/core/editor.js',
    './js/core/font.js',
    './js/core/theme.js',
    './js/services/ai-service.js',
    './js/services/storage.js',
    './js/ui/ai-overlay.js',
    './js/ui/menu.js',
    './js/utils/helpers.js',
    './manifest.json',
    './fonts/IBMPlexMono-Regular.ttf',
    './fonts/IBMPlexSans-Regular.ttf',
    './fonts/IBMPlexSerif-Regular.ttf',
    './fonts/CourierPrime-Regular.ttf',
    './fonts/Caveat-Regular.ttf',
    './imgs/ico.svg',
    './imgs/ico.png',
    './imgs/logo.svg'
];

// Install event: cache all assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

// Activate event: clean old caches and claim clients
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

// Fetch event: serve from cache, fallback to network, with special handling for admin directory
self.addEventListener('fetch', (event) => {
    // Skip non-GET, external URLs, extensions, and admin directory
    if (event.request.method !== 'GET' || 
        !event.request.url.startsWith(self.location.origin) ||
        event.request.url.startsWith('chrome-extension:') ||
        event.request.url.includes('extension') ||
        event.request.url.includes('/admin/')) {
        return;
    }
    
    // For navigation requests, return index.html from cache or network
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(response => response || fetch(event.request))
        );
        return;
    }
    
    // For other requests: cache-first, network fallback
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

// Message listener for skipWaiting
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});