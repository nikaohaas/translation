import type { TextBlock } from './text-extractor'
import type { TextChunk } from './text-splitter'
import { splitIntoChunks, shouldTranslate } from './text-splitter'
import { renderTranslation, renderError } from './dom-renderer'
import { sendTranslateRequest } from '../shared/messages'
import { getSettings } from '../shared/storage'

export async function translatePage(blocks: TextBlock[]) {
  const settings = await getSettings()
  if (!settings.enabled) return

  const engine = settings.engine
  const allChunks: { chunk: TextChunk; block: TextBlock }[] = []

  for (const block of blocks) {
    if (!shouldTranslate(block.text)) continue

    const chunks = splitIntoChunks(block.text)
    for (const chunk of chunks) {
      allChunks.push({ chunk, block })
    }
  }

  if (allChunks.length === 0) return

  // Translate chunks with the engine
  // Group chunks into batches for efficiency
  const batchSize = 5

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize)

    const promises = batch.map(async ({ chunk, block }) => {
      const request = {
        id: `${block.id}_${chunk.index}`,
        text: chunk.text,
        sourceLang: 'en',
        targetLang: 'zh',
        engine,
      }

      try {
        const response = await sendTranslateRequest(request)
        if (response.success && response.translatedText) {
          renderTranslation(block, chunk, response.translatedText)
        } else if (response.error) {
          console.warn('[Translation] API error:', response.error)
          renderError(block, response.error)
        }
      } catch (error) {
        console.warn('[Translation] Failed to translate chunk:', error)
        renderError(block, error instanceof Error ? error.message : String(error))
      }
    })

    // Process batch concurrently but with rate limiting through the queue
    await Promise.all(promises)
  }
}