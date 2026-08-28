import { registerSW } from 'virtual:pwa-register'

const UPDATE_INTERVAL_MS = 15 * 60 * 1000

registerSW({
  immediate: true,
  onRegisteredSW(_serviceWorkerUrl, registration) {
    if (!registration) return
    const checkForUpdate = () => {
      if (navigator.onLine) void registration.update()
    }
    window.setInterval(() => {
      checkForUpdate()
    }, UPDATE_INTERVAL_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
  },
})
