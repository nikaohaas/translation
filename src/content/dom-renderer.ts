import type { TextBlock } from './text-extractor'
import type { TextChunk } from './text-splitter'

const WRAPPER_CLASS = 'bilingual-translation-wrapper'
const ORIGINAL_CLASS = 'bilingual-original'
const TRANSLATION_CLASS = 'bilingual-translation'
const SEPARATOR_CLASS = 'bilingual-separator'

export function renderTranslation(block: TextBlock, chunk: TextChunk, translatedText: string) {
  // Create wrapper if it doesn't exist
  let wrapper = block.parentElement.querySelector(`.${WRAPPER_CLASS}`) as HTMLElement

  if (!wrapper) {
    wrapper = document.createElement('div')
    wrapper.className = WRAPPER_CLASS

    // Wrap original content
    const originalSpan = document.createElement('span')
    originalSpan.className = ORIGINAL_CLASS

    // Move all child nodes into the original span
    while (block.parentElement.firstChild) {
      originalSpan.appendChild(block.parentElement.firstChild)
    }

    wrapper.appendChild(originalSpan)

    // Add separator
    const separator = document.createElement('span')
    separator.className = SEPARATOR_CLASS
    separator.textContent = '  ⇩  '
    wrapper.appendChild(separator)

    // Add translation
    const translationSpan = document.createElement('span')
    translationSpan.className = TRANSLATION_CLASS
    translationSpan.textContent = translatedText
    wrapper.appendChild(translationSpan)

    block.parentElement.appendChild(wrapper)
  } else {
    // Update existing translation (for incremental chunks)
    const translationSpan = wrapper.querySelector(`.${TRANSLATION_CLASS}`)
    if (translationSpan) {
      const existing = translationSpan.textContent || ''
      translationSpan.textContent = existing + (existing ? '\n\n' : '') + translatedText
    }
  }
}

export function renderError(block: TextBlock, errorMessage: string) {
  // Don't add error if wrapper already exists
  if (block.parentElement.querySelector(`.${WRAPPER_CLASS}`)) return

  const wrapper = document.createElement('div')
  wrapper.className = WRAPPER_CLASS
  wrapper.style.borderLeftColor = '#e74c3c'
  wrapper.style.background = 'rgba(231, 76, 60, 0.05)'

  const originalSpan = document.createElement('span')
  originalSpan.className = ORIGINAL_CLASS
  while (block.parentElement.firstChild) {
    originalSpan.appendChild(block.parentElement.firstChild)
  }
  wrapper.appendChild(originalSpan)

  const errorSpan = document.createElement('span')
  errorSpan.className = TRANSLATION_CLASS
  errorSpan.style.color = '#e74c3c'
  errorSpan.style.fontSize = '12px'
  errorSpan.textContent = `⚠️ ${errorMessage}`
  wrapper.appendChild(errorSpan)

  block.parentElement.appendChild(wrapper)
}