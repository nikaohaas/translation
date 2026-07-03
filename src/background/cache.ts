import type { TranslationCacheEntry } from '../shared/types'

interface CacheStore {
  [key: string]: TranslationCacheEntry
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

class TranslationCache {
  private store: CacheStore = {}

  constructor() {
    this.loadFromStorage()
  }

  private async loadFromStorage() {
    const result = await chrome.storage.local.get('translationCache')
    if (result.translationCache) {
      this.store = result.translationCache
      this.cleanup()
    }
  }

  private async persist() {
    await chrome.storage.local.set({ translationCache: this.store })
  }

  private cleanup() {
    const now = Date.now()
    for (const key in this.store) {
      if (now - this.store[key].timestamp > CACHE_TTL) {
        delete this.store[key]
      }
    }
  }

  getKey(text: string, engine: string): string {
    // Normalize text for cache key
    const normalized = text.trim().toLowerCase().slice(0, 200)
    return `${engine}:${normalized}`
  }

  get(text: string, engine: string): string | null {
    const key = this.getKey(text, engine)
    const entry = this.store[key]
    if (!entry) return null

    // Check if original text matches exactly (case-insensitive)
    if (entry.text.trim().toLowerCase() !== text.trim().toLowerCase()) return null

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      delete this.store[key]
      this.persist()
      return null
    }

    return entry.translatedText
  }

  set(text: string, translatedText: string, engine: string) {
    const key = this.getKey(text, engine)
    this.store[key] = {
      text,
      translatedText,
      engine: engine as TranslationCacheEntry['engine'],
      timestamp: Date.now(),
    }
    this.persist()
  }
}

export const translationCache = new TranslationCache()