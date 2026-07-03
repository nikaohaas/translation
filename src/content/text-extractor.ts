export interface TextBlock {
  id: string
  text: string
  parentElement: HTMLElement
}

let blockIdCounter = 0

/** Tags whose content we want to translate as a unit. */
const BLOCK_TAGS = new Set([
  'p', 'div', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'dd', 'dt', 'figcaption', 'caption',
])

/** Tags we climb past to find a block-level container. */
const INLINE_TAGS = new Set([
  'b', 'i', 'u', 'strong', 'em', 'a', 'span', 'code', 'pre', 'kbd',
  'samp', 'sub', 'sup', 'small', 'mark', 'q', 'cite', 'abbr', 'time',
  'font', 'label',
])

/** Tags whose content should never be translated. */
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'code', 'pre', 'svg', 'canvas', 'math',
])

/**
 * Walk the DOM and extract translatable text blocks.
 *
 * Instead of creating one block per text node, we climb to the nearest
 * block-level ancestor and merge ALL text from that container into a
 * single block. This avoids fragmenting inline elements (b, a, code…)
 * into separate blocks and prevents the "disappearing original" problem.
 */
export function extractTextBlocks(root: HTMLElement): TextBlock[] {
  const textNodes: { node: Text; container: HTMLElement }[] = []

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT

      // Skip hidden / invisible
      if (isHiddenElement(parent)) return NodeFilter.FILTER_REJECT

      // Skip tags we never translate
      const tag = parent.tagName.toLowerCase()
      if (SKIP_TAGS.has(tag)) return NodeFilter.FILTER_REJECT

      // Skip already-translated blocks
      if (parent.closest('.bilingual-translation-wrapper')) return NodeFilter.FILTER_REJECT

      // Skip empty / whitespace-only
      const text = node.textContent?.trim()
      if (!text || text.length < 2) return NodeFilter.FILTER_REJECT
      if (/^[\s.,!?;:\-–—()\[\]{}'""'']+$/.test(text)) return NodeFilter.FILTER_REJECT

      return NodeFilter.FILTER_ACCEPT
    },
  })

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const parent = node.parentElement!

    // Climb to the nearest block-level container
    const container = findBlockContainer(parent)
    if (!container) continue

    textNodes.push({ node, container })
  }

  // Group by container element
  const containerMap = new Map<HTMLElement, string>()
  for (const { node, container } of textNodes) {
    const existing = containerMap.get(container) || ''
    containerMap.set(container, existing + (node.textContent || ''))
  }

  // Build TextBlocks, deduplicating by text content
  const seenTexts = new Set<string>()
  const blocks: TextBlock[] = []

  for (const [container, text] of containerMap) {
    const trimmed = text.trim()
    if (!trimmed) continue
    // Deduplicate identical text
    if (seenTexts.has(trimmed)) continue
    seenTexts.add(trimmed)

    blocks.push({
      id: `block_${++blockIdCounter}`,
      text: trimmed,
      parentElement: container,
    })
  }

  return blocks
}

/**
 * Walk up from an inline element to find the nearest block-level container.
 */
function findBlockContainer(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase()
    if (BLOCK_TAGS.has(tag)) return current
    if (!INLINE_TAGS.has(tag)) return current // treat unknown tags as block
    current = current.parentElement
  }
  return null
}

function isHiddenElement(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    el.hidden
  )
}

export function resetBlockIdCounter() {
  blockIdCounter = 0
}