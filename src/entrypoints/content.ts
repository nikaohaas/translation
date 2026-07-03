import { extractTextBlocks, resetBlockIdCounter } from '../content/text-extractor'
import { translatePage } from '../content/translator'
import { startObserving, stopObserving } from '../content/observer'

async function startTranslation() {
  console.log('[Translation] Manual translation triggered')
  resetBlockIdCounter()
  const blocks = extractTextBlocks(document.body)
  if (blocks.length > 0) {
    await translatePage(blocks)
  }
  startObserving()
}

function removeTranslation() {
  console.log('[Translation] Removing all translations')
  stopObserving()
  // Remove all translation wrappers and restore original content
  document.querySelectorAll('.bilingual-translation-wrapper').forEach((wrapper) => {
    const original = wrapper.querySelector('.bilingual-original')
    if (original && original.parentElement === wrapper) {
      // Move original children back to the parent element
      while (original.firstChild) {
        wrapper.parentElement?.insertBefore(original.firstChild, wrapper)
      }
    }
    wrapper.remove()
  })
}

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_TRANSLATION') {
    if (message.payload?.enabled) {
      startTranslation()
    } else {
      removeTranslation()
    }
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'PAGE_ACTION') {
    sendResponse({ enabled: true })
    return true
  }
})

console.log('[Translation] Content script loaded (manual translation mode)')