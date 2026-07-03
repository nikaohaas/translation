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

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_TRANSLATION') {
    if (message.payload?.enabled) {
      startTranslation()
    } else {
      stopObserving()
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