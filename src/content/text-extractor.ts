export interface TextBlock {
  id: string
  nodes: Text[]
  text: string
  originalHtml: string
  parentElement: HTMLElement
}

let blockIdCounter = 0

export function extractTextBlocks(root: HTMLElement): TextBlock[] {
  const blocks: TextBlock[] = []
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT

        // Skip hidden/invisible elements
        if (isHiddenElement(parent)) return NodeFilter.FILTER_REJECT

        // Skip script, style, noscript, code, pre, svg
        const tag = parent.tagName.toLowerCase()
        const skipTags = ['script', 'style', 'noscript', 'code', 'pre', 'svg', 'canvas', 'math']
        if (skipTags.includes(tag)) return NodeFilter.FILTER_REJECT

        // Skip already translated blocks
        if (parent.closest('.bilingual-translation-wrapper')) return NodeFilter.FILTER_REJECT

        // Skip empty text
        const text = node.textContent?.trim()
        if (!text || text.length < 2) return NodeFilter.FILTER_REJECT

        // Skip pure whitespace/punctuation
        if (/^[\s.,!?;:\-–—()\[\]{}'""'']+$/.test(text)) return NodeFilter.FILTER_REJECT

        // Skip elements that are likely navigation/menus
        if (parent.tagName === 'A' && parent.getAttribute('href')?.startsWith('#')) {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_ACCEPT
      },
    }
  )

  // Group text nodes by block-level parent
  let currentBlock: TextBlock | null = null

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const parent = node.parentElement!

    if (currentBlock && currentBlock.parentElement === parent) {
      // Same block — collect adjacent text nodes
      const lastNode = currentBlock.nodes[currentBlock.nodes.length - 1]
      if (isAdjacentSibling(lastNode, node)) {
        currentBlock.nodes.push(node)
        currentBlock.text += node.textContent || ''
        currentBlock.originalHtml += node.textContent || ''
      } else {
        // Different text segment under same parent — treat as new block
        if (currentBlock.text.trim()) {
          blocks.push(currentBlock)
        }
        currentBlock = createBlock(node, parent)
      }
    } else {
      // New parent — finish old block, start new
      if (currentBlock && currentBlock.text.trim()) {
        blocks.push(currentBlock)
      }
      currentBlock = createBlock(node, parent)
    }
  }

  // Push last block
  if (currentBlock && currentBlock.text.trim()) {
    blocks.push(currentBlock)
  }

  return blocks
}

function createBlock(node: Text, parent: HTMLElement): TextBlock {
  return {
    id: `block_${++blockIdCounter}`,
    nodes: [node],
    text: node.textContent || '',
    originalHtml: node.textContent || '',
    parentElement: parent,
  }
}

function isAdjacentSibling(a: Node, b: Node): boolean {
  let current = a
  while (current.nextSibling) {
    current = current.nextSibling
    if (current === b) return true
  }
  return false
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