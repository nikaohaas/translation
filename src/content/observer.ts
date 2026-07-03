import { extractTextBlocks } from './text-extractor'
import { translatePage } from './translator'

let observer: MutationObserver | null = null
let debounceTimer: number | null = null
let periodicTimer: number | null = null

/** Set to true after manual translation, so observer can translate new content. */
let translationActive = false

export function isTranslationActive() {
  return translationActive
}

export function startObserving() {
  translationActive = true
  if (observer) return

  observer = new MutationObserver((mutations) => {
    const hasContentChanges = mutations.some((m) => {
      if (m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement
            const text = el.textContent || ''
            if (text.trim().length > 30) return true
          }
        }
      }
      if (m.type === 'characterData') {
        const text = (m.target as Text).textContent || ''
        if (text.trim().length > 10) return true
      }
      return false
    })

    if (hasContentChanges) {
      debounceProcessPage()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  // Periodic scan for content that MutationObserver might miss
  startPeriodicScan()
}

function startPeriodicScan() {
  let attempts = 0
  periodicTimer = window.setInterval(async () => {
    attempts++
    if (attempts > 15) { // scan every 2s for 30s
      if (periodicTimer) {
        clearInterval(periodicTimer)
        periodicTimer = null
      }
      return
    }

    // Manual mode — translateActive reflects user's last action
    if (!translationActive) return

    const blocks = extractTextBlocks(document.body)
    if (blocks.length > 0) {
      await translatePage(blocks)
    }
  }, 2000)
}

function debounceProcessPage() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = window.setTimeout(async () => {
    if (!translationActive) return

    const blocks = extractTextBlocks(document.body)
    if (blocks.length > 0) {
      await translatePage(blocks)
    }
  }, 800)
}

export function stopObserving() {
  translationActive = false
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (periodicTimer) {
    clearInterval(periodicTimer)
    periodicTimer = null
  }
}