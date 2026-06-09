/**
 * Service Worker for DigiMirchi ERP PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'tileexporter-erp-v1.0.0';
const DATA_CACHE_NAME = 'tileexporter-data-v1.0.0';

// Files to cache for offline functionality
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Add other critical assets
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/.*$/,
  /\/data\/.*$/,
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests with network-first strategy
  if (isApiRequest(request.url)) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // If request is successful, clone and cache the response
            if (response.status === 200) {
              cache.put(request.url, response.clone());
            }
            return response;
          })
          .catch(() => {
            // If network fails, try to get from cache
            return cache.match(request);
          });
      })
    );
    return;
  }

  // Handle non-API requests with cache-first strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((fetchResponse) => {
          // Cache the fetched response
          if (shouldCache(event.request)) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // If both cache and network fail, return offline page
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received', event);
  
  const options = {
    body: event.data?.text() || 'New notification from DigiMirchi ERP',
    icon: '/pwa-icons/icon-192x192.png',
    badge: '/pwa-icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/pwa-icons/action-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/pwa-icons/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Tile Exporter', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.payload);
      })
    );
  }
});

/**
 * Check if request is an API request
 */
function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if request should be cached
 */
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Don't cache if it's not a GET request
  if (request.method !== 'GET') {
    return false;
  }
  
  // Don't cache if it's a Chrome extension
  if (url.protocol === 'chrome-extension:') {
    return false;
  }
  
  // Don't cache if it's a local file
  if (url.protocol === 'file:') {
    return false;
  }
  
  return true;
}

/**
 * Background sync for offline actions
 */
async function doBackgroundSync() {
  try {
    // Get pending actions from IndexedDB or localStorage
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Remove successful action
        await removePendingAction(action.id);
        
        // Notify clients of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'BACKGROUND_SYNC_SUCCESS',
              action: action
            });
          });
        });
        
      } catch (error) {
        console.log('[ServiceWorker] Background sync failed for action:', action.id, error);
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Background sync error:', error);
  }
}

/**
 * Get pending actions
 */
async function getPendingActions() {
  // In a real implementation, this would retrieve from IndexedDB
  return [];
}

/**
 * Remove pending action
 */
async function removePendingAction(actionId) {
  // In a real implementation, this would remove from IndexedDB
  console.log('[ServiceWorker] Removing pending action:', actionId);
}

/**
 * Cache cleanup - remove old entries
 */
setInterval(() => {
  caches.open(DATA_CACHE_NAME).then((cache) => {
    cache.keys().then((requests) => {
      requests.forEach((request) => {
        // Remove entries older than 24 hours
        const url = new URL(request.url);
        const timestamp = url.searchParams.get('timestamp');
        if (timestamp && Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
          cache.delete(request);
        }
      });
    });
  });
}, 60 * 60 * 1000); // Run every hour