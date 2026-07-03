import { setupMessageRouter } from '../background/router'

// Initialize background service worker
setupMessageRouter()

console.log('[Background] Translation extension background worker started')