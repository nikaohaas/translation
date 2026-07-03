import type { TranslationRequest, TranslationResponse } from './types'

export type MessageType =
  | 'TRANSLATE_REQUEST'
  | 'TRANSLATE_RESPONSE'
  | 'GET_SETTINGS'
  | 'SETTINGS_UPDATED'
  | 'TOGGLE_TRANSLATION'
  | 'PAGE_ACTION'
  | 'PING'

export interface ChromeMessage {
  type: MessageType
  payload?: unknown
}

export interface TranslateRequestMessage extends ChromeMessage {
  type: 'TRANSLATE_REQUEST'
  payload: TranslationRequest
}

export interface TranslateResponseMessage extends ChromeMessage {
  type: 'TRANSLATE_RESPONSE'
  payload: TranslationResponse
}

export function sendTranslateRequest(request: TranslationRequest): Promise<TranslationResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage<TranslateRequestMessage>(
      { type: 'TRANSLATE_REQUEST', payload: request },
      (response: TranslationResponse | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else if (response) {
          resolve(response)
        } else {
          reject(new Error('No response from background'))
        }
      }
    )
  })
}