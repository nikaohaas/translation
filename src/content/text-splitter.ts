const MAX_CHUNK_LENGTH = 2000
const MIN_CHUNK_LENGTH = 100

export interface TextChunk {
  index: number
  text: string
}

export function splitIntoChunks(text: string): TextChunk[] {
  if (!text || !text.trim()) return []

  // If text is short enough, return as single chunk
  if (text.length <= MAX_CHUNK_LENGTH) {
    return [{ index: 0, text }]
  }

  // Try to split by paragraph breaks first
  const paragraphs = text.split(/\n\s*\n/)
  if (paragraphs.length > 1) {
    return groupChunks(paragraphs)
  }

  // Split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text]
  return groupChunks(sentences)
}

function groupChunks(segments: string[]): TextChunk[] {
  const chunks: TextChunk[] = []
  let current = ''
  let index = 0

  for (const segment of segments) {
    const trimmed = segment.trim()
    if (!trimmed) continue

    if (current.length + trimmed.length > MAX_CHUNK_LENGTH && current.length >= MIN_CHUNK_LENGTH) {
      chunks.push({ index: index++, text: current.trim() })
      current = trimmed
    } else {
      current += (current ? '\n\n' : '') + trimmed
    }
  }

  if (current.trim()) {
    chunks.push({ index, text: current.trim() })
  }

  return chunks
}

export function shouldTranslate(text: string): boolean {
  // Check if text contains mostly CJK characters (already Chinese)
  const cjkCount = (text.match(/[一-鿿㐀-䶿豈-﫿]/g) || []).length
  const totalChars = text.replace(/\s/g, '').length
  if (totalChars === 0) return false

  const cjkRatio = cjkCount / totalChars

  // If more than 20% is CJK, assume already Chinese
  if (cjkRatio > 0.2) return false

  // Check minimum English content
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length
  return englishChars > 5
}