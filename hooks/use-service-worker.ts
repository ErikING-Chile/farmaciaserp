import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration)

          // Listen for messages from SW
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'TRIGGER_SYNC') {
              // Trigger sync in the app
              window.dispatchEvent(new CustomEvent('trigger-sync'))
            }
          })

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update available
                  window.dispatchEvent(new CustomEvent('sw-update-available'))
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    }
  }, [])
}

export function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      if ('sync' in registration) {
        const syncRegistration = registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> }
        }
        return syncRegistration.sync.register('sync-sales')
      }
      return undefined
    })
  }
}

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}
