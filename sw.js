 
const CACHE_NAME = 'quran-app-v27';
const STATIC_CACHE = 'quran-static-v27';
const DYNAMIC_CACHE = 'quran-dynamic-v27';
const AUDIO_CACHE = 'quran-audio-v27';

// Audio cache configuration
const MAX_AUDIO_CACHE_SIZE = 200 * 1024 * 1024; // 200MB
const AUDIO_CACHE_QUOTA_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

 
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/quran.html',
    '/manifest.json',
    '/sw.js',
    '/css/quran.css',
    '/css/fonts-quran.css',
    '/js/quran.js',
    '/js/AudioService.js',
    '/js/AudioPlayer.js',
    '/assets/quran.json',
    '/assets/tafseerMouaser_v03.json',
    '/assets/js/lib/lucide.min.js',
    '/img/page-logo.png',
    '/img/app-logo11.png',
    '/img/app-logo.png',
    '/img/app-logo1.png',
    '/img/app-logo2.png',
    '/img/app-logo4.png',
    '/img/apple-touch-icon.png',
    '/img/arabesque.png',
    '/assets/fonts/Iura6YBj_oCad4k1rzY.ttf',
    '/assets/fonts/Iurf6YBj_oCad4k1l4qkLrY.ttf',
    '/assets/fonts/Iurf6YBj_oCad4k1l5anLrY.ttf',
    '/assets/fonts/Iurf6YBj_oCad4k1l8KiLrY.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklTYzORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklVozORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklWgyORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklWgzORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklY80ORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklbY0ORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklcE0ORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRkleg0ORc.ttf',
    '/assets/fonts/Dxx78j6PP2D_kU2muijPEe1n2vVbfJRklegzORc.ttf',
    '/assets/fonts/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwWslkrA.ttf',
    '/assets/fonts/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwY8lkrA.ttf',
    '/assets/fonts/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwj85krA.ttf',
    '/assets/fonts/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwvc5krA.ttf',
    '/img/1.png',
    '/img/arabesque.png',
    '/img/app-logo.png',
    '/img/app-logo1.png',
    '/img/app-logo11.png',
    '/img/app-logo2.png',
    '/img/app-logo4.png',
    '/img/apple-touch-icon.png',
    '/img/android-chrome-192x192.png',
    '/img/android-chrome-512x512.png',
    '/img/page-logo.png'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE)
                .then(cache => cache.addAll(STATIC_ASSETS)),
            caches.open(AUDIO_CACHE) // Initialize audio cache
        ]).then(() => self.skipWaiting())
    );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE && cache !== AUDIO_CACHE) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Start periodic cache cleanup
            scheduleCacheCleanup();
            return self.clients.claim();
        })
    );
});

 
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

 
    if (!request.method.startsWith('GET')) {
        return;
    }

 
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // Check if request is for audio file (MP3)
    const isAudioRequest = url.pathname.endsWith('.mp3') || 
                          url.hostname.includes('everyayah.com') ||
                          url.hostname.includes('quran.com');

    // Handle audio requests with Stale-While-Revalidate
    if (isAudioRequest) {
        event.respondWith(handleAudioRequest(request));
        return;
    }

    // Handle same-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(response => {
 
                if (response) {
                    return response;
                }

 
                const accept = request.headers.get('accept') || '';
                if (accept.includes('text/html')) {
                    return fetch(request)
                        .then(networkResponse => {
 
                            if (networkResponse.ok) {
                                return caches.open(DYNAMIC_CACHE)
                                    .then(cache => cache.put(request, networkResponse.clone()))
                                    .then(() => networkResponse);
                            }
                            return networkResponse;
                        })
                        .catch(() => {
 
                            return new Response('لا يوجد اتصال بالإنترنت', {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: { 'Content-Type': 'text/html; charset=utf-8' }
                            });
                        });
                }

 
                return fetch(request)
                    .then(networkResponse => {
 
                        if (networkResponse.ok && STATIC_ASSETS.includes(url.pathname)) {
                            return caches.open(STATIC_CACHE)
                                .then(cache => cache.put(request, networkResponse.clone()))
                                .then(() => networkResponse);
                        }
 
                        if (networkResponse.ok) {
                            return caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(request, networkResponse.clone()))
                                .then(() => networkResponse);
                        }
                        return networkResponse;
                    })
                    .catch(() => {
 
                        return new Response('لا يوجد اتصال بالإنترنت', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

/**
 * Handle audio requests with Stale-While-Revalidate strategy
 * @param {Request} request - The audio request
 * @returns {Promise<Response>} Cached or network response
 */
async function handleAudioRequest(request) {
    const cache = await caches.open(AUDIO_CACHE);
    const cachedResponse = await cache.match(request);

    // Return cached response immediately if available
    if (cachedResponse) {
        // Update access timestamp for LRU
        updateAccessTimestamp(request.url);
        
        // Revalidate in background
        fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
        }).catch(() => {
            // Ignore network errors for background revalidation
        });
        
        return cachedResponse;
    }

    // No cache, fetch from network
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Check cache size before storing
            await ensureCacheSizeLimit();
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed, return error response
        return new Response('فشل تحميل الصوت - تحقق من الاتصال بالإنترنت', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

/**
 * Store access timestamp for LRU tracking
 * @param {string} url - Audio URL
 */
async function updateAccessTimestamp(url) {
    const cache = await caches.open(AUDIO_CACHE);
    const response = await cache.match(url);
    
    if (response) {
        const clonedResponse = response.clone();
        const headers = new Headers(clonedResponse.headers);
        headers.set('sw-access-time', Date.now().toString());
        
        // Create new response with updated headers
        const modifiedResponse = new Response(clonedResponse.body, {
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            headers: headers
        });
        
        await cache.put(url, modifiedResponse);
    }
}

/**
 * Ensure audio cache doesn't exceed size limit using LRU
 */
async function ensureCacheSizeLimit() {
    const cache = await caches.open(AUDIO_CACHE);
    const keys = await cache.keys();
    
    if (keys.length === 0) return;

    // Calculate current cache size
    let totalSize = 0;
    const entries = [];
    
    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const size = await getResponseSize(response);
            const accessTime = parseInt(response.headers.get('sw-access-time') || '0');
            
            entries.push({
                request,
                size,
                accessTime
            });
            totalSize += size;
        }
    }

    // If under limit, no cleanup needed
    if (totalSize <= MAX_AUDIO_CACHE_SIZE) return;

    // Sort by access time (oldest first) for LRU
    entries.sort((a, b) => a.accessTime - b.accessTime);

    // Delete oldest entries until under limit
    for (const entry of entries) {
        if (totalSize <= MAX_AUDIO_CACHE_SIZE) break;
        
        await cache.delete(entry.request);
        totalSize -= entry.size;
    }
}

/**
 * Get response size in bytes
 * @param {Response} response - Cached response
 * @returns {Promise<number>} Size in bytes
 */
async function getResponseSize(response) {
    const clone = response.clone();
    const blob = await clone.blob();
    return blob.size;
}

/**
 * Periodic cache cleanup scheduler
 */
let cleanupInterval = null;

function scheduleCacheCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }
    
    cleanupInterval = setInterval(() => {
        cleanUpCache();
    }, AUDIO_CACHE_QUOTA_CHECK_INTERVAL);
}

/**
 * Clean up cache based on LRU and storage quota
 */
async function cleanUpCache() {
    try {
        // Check storage quota
        if ('storage' in self && 'estimate' in self.storage) {
            const estimate = await self.storage.estimate();
            const usagePercentage = estimate.usage / estimate.quota;
            
            // If using more than 80% of quota, be more aggressive
            if (usagePercentage > 0.8) {
                await ensureCacheSizeLimit();
                // Additional cleanup: delete entries older than 30 days
                await deleteOldEntries(30 * 24 * 60 * 60 * 1000);
            }
        } else {
            // Fallback: just ensure size limit
            await ensureCacheSizeLimit();
        }
    } catch (error) {
        console.error('Cache cleanup error:', error);
    }
}

/**
 * Delete entries older than specified time
 * @param {number} maxAge - Maximum age in milliseconds
 */
async function deleteOldEntries(maxAge) {
    const cache = await caches.open(AUDIO_CACHE);
    const keys = await cache.keys();
    const now = Date.now();
    
    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const accessTime = parseInt(response.headers.get('sw-access-time') || '0');
            
            if (now - accessTime > maxAge) {
                await cache.delete(request);
            }
        }
    }
}

// معالجة الرسائل من التطبيق
self.addEventListener('message', event => {
    const { type, payload } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0].postMessage({
                type: 'VERSION_RESPONSE',
                payload: CACHE_NAME
            });
            break;

        case 'GET_CACHES':
            event.ports[0].postMessage({
                type: 'CACHES_RESPONSE',
                payload: [STATIC_CACHE, DYNAMIC_CACHE, AUDIO_CACHE]
            });
            break;

        case 'CLEANUP_AUDIO_CACHE':
            event.waitUntil(
                cleanUpCache().then(() => {
                    event.ports[0].postMessage({
                        type: 'AUDIO_CACHE_CLEANED'
                    });
                })
            );
            break;

        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.delete(STATIC_CACHE)
                    .then(() => caches.delete(DYNAMIC_CACHE))
                    .then(() => caches.delete(AUDIO_CACHE))
                    .then(() => {
                        event.ports[0].postMessage({
                            type: 'CACHE_CLEARED'
                        });
                    })
            );
            break;

        default:
            console.log('Unknown message type:', type);
    }
});
