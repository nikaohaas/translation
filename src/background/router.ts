import type { TranslationRequest, TranslationResponse } from '../shared/types'
import type { ChromeMessage, TranslateRequestMessage } from '../shared/messages'
import { getSettings } from '../shared/storage'
import { translationCache } from './cache'
import { requestQueue } from './api-client'

export function setupMessageRouter() {
  chrome.runtime.onMessage.addListener(
    (message: ChromeMessage, _sender, sendResponse) => {
      switch (message.type) {
        case 'TRANSLATE_REQUEST':
          handleTranslateRequest(message as TranslateRequestMessage, sendResponse)
          return true // Keep channel open for async response

        case 'GET_SETTINGS':
          getSettings().then(sendResponse)
          return true

        case 'PING':
          sendResponse({ pong: true })
          return true

        default:
          return false
      }
    }
  )
}

async function handleTranslateRequest(
  message: TranslateRequestMessage,
  sendResponse: (response: TranslationResponse) => void
) {
  const request = message.payload

  // Check cache first
  const cached = translationCache.get(request.text, request.engine)
  if (cached) {
    sendResponse({
      id: request.id,
      translatedText: cached,
      engine: request.engine,
      success: true,
    })
    return
  }

  try {
    const response = await requestQueue.enqueue(request)

    // Cache successful translation
    if (response.success && response.translatedText) {
      translationCache.set(request.text, response.translatedText, request.engine)
    }

    sendResponse(response)
  } catch (error) {
    sendResponse({
      id: request.id,
      translatedText: '',
      engine: request.engine,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}