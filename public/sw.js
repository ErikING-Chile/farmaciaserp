/**
 * Service Worker for FarmaciaERP PWA
 * Handles offline functionality, caching, and sync
 */

const CACHE_NAME = 'farmacia-erp-v1'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/pos',
  '/products',
  '/inventory',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Claim clients immediately
  self.clients.claim()
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API calls (except sync)
  if (url.pathname.startsWith('/api/') && !url.pathname.includes('/sync')) {
    return
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response
      }

      return fetch(request)
        .then((networkResponse) => {
          // Cache successful GET requests
          if (networkResponse.ok && request.method === 'GET') {
            const clonedResponse = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // Return offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('Offline', { status: 503 })
        })
    })
  )
})

// Background sync for offline sales
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncPendingSales())
  }
})

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const options = {
    body: data.message || 'Nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data,
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'FarmaciaERP', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data
  let url = '/'

  if (data?.type === 'ALERT') {
    url = '/alerts'
  } else if (data?.type === 'SYNC_ERROR') {
    url = '/pos'
  }

  event.waitUntil(
    self.clients.openWindow(url)
  )
})

// Sync pending sales function
async function syncPendingSales() {
  try {
    // Notify all clients to trigger sync
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((client) => {
      client.postMessage({
        type: 'TRIGGER_SYNC',
        timestamp: new Date().toISOString(),
      })
    })
  } catch (error) {
    console.error('Error syncing sales:', error)
  }
}

