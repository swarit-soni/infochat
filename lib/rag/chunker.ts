export interface DocumentChunk {
  chunkIndex: number
  heading: string | null
  content: string
  containsTable: number
  tokenCount: number
}

export interface ChunkOptions {
  maxTokens?: number
  overlapTokens?: number
  documentTitle?: string
}

interface ParsedBlock {
  heading: string | null
  text: string
  isTable: boolean
  isCodeFence: boolean
  isQaPair: boolean
}

const DEFAULT_MAX_TOKENS = 450
const DEFAULT_OVERLAP_TOKENS = 60
const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*$/
const TABLE_SEPARATOR_PATTERN = /^\s*\|?[\s:-]+\|[\s|:-]*$/
const CODE_FENCE_PATTERN = /^\s*(`{3,}|~{3,})/
const QA_START_PATTERN = /^(?:\*\*Q[:.]?\*\*|Q\d*[:.])\s+/i
const QA_ANSWER_PATTERN = /^(?:\*\*A[:.]?\*\*|A\d*[:.])\s+/i

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.ceil(trimmed.length / 4)
}

function isTableRowLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.includes('|') && trimmed.length > 1
}

function isTableStart(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) return false
  return (
    isTableRowLine(lines[index]) &&
    TABLE_SEPARATOR_PATTERN.test(lines[index + 1])
  )
}

function buildHeadingBreadcrumb(
  stack: Array<{ level: number; title: string }>,
  documentTitle?: string
): string | null {
  if (stack.length > 0) {
    return stack.map(entry => entry.title).join(' > ')
  }
  return documentTitle?.trim() || null
}

function splitLongText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const parts: string[] = []
  let start = 0
  while (start < text.length) {
    if (text.length - start <= maxChars) {
      parts.push(text.slice(start).trim())
      break
    }
    let splitAt = text.lastIndexOf('\n', start + maxChars)
    if (splitAt <= start + Math.floor(maxChars * 0.4)) {
      splitAt = text.lastIndexOf(' ', start + maxChars)
    }
    if (splitAt <= start) {
      splitAt = start + maxChars
    }
    const slice = text.slice(start, splitAt).trim()
    if (slice) parts.push(slice)
    start = splitAt + 1
  }
  return parts
}

function parseMarkdownBlocks(
  markdown: string,
  documentTitle?: string
): ParsedBlock[] {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []

  const lines = normalized.split('\n')
  const blocks: ParsedBlock[] = []
  const headingStack: Array<{ level: number; title: string }> = []
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    const joined = paragraphLines.join('\n').trim()
    paragraphLines = []
    if (!joined) return
    blocks.push({
      heading: buildHeadingBreadcrumb(headingStack, documentTitle),
      text: joined,
      isTable: false,
      isCodeFence: false,
      isQaPair: QA_START_PATTERN.test(joined)
    })
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Fenced code or JSON block (keep intact)
    const fenceMatch = line.match(CODE_FENCE_PATTERN)
    if (fenceMatch) {
      flushParagraph()
      const fenceMarker = fenceMatch[1][0]
      const fenceLength = fenceMatch[1].length
      const fenceLines = [line]
      i++
      while (i < lines.length) {
        fenceLines.push(lines[i])
        const closeMatch = lines[i].match(CODE_FENCE_PATTERN)
        if (
          closeMatch &&
          closeMatch[1][0] === fenceMarker &&
          closeMatch[1].length >= fenceLength
        ) {
          i++
          break
        }
        i++
      }
      blocks.push({
        heading: buildHeadingBreadcrumb(headingStack, documentTitle),
        text: fenceLines.join('\n').trim(),
        isTable: false,
        isCodeFence: true,
        isQaPair: false
      })
      continue
    }

    // Markdown heading
    const headingMatch = line.match(HEADING_PATTERN)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()
      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].level >= level
      ) {
        headingStack.pop()
      }
      headingStack.push({ level, title })
      i++
      continue
    }

    // Markdown table block (keep caption/header + separator + all rows intact)
    if (isTableStart(lines, i)) {
      let caption = ''
      if (paragraphLines.length > 0) {
        const lastNonEmpty = paragraphLines[paragraphLines.length - 1].trim()
        if (paragraphLines.length === 1 && lastNonEmpty.length <= 160) {
          caption = lastNonEmpty
          paragraphLines = []
        } else {
          flushParagraph()
        }
      }

      const tableLines: string[] = caption ? [caption] : []
      while (i < lines.length && isTableRowLine(lines[i])) {
        tableLines.push(lines[i])
        i++
      }

      blocks.push({
        heading: buildHeadingBreadcrumb(headingStack, documentTitle),
        text: tableLines.join('\n').trim(),
        isTable: true,
        isCodeFence: false,
        isQaPair: false
      })
      continue
    }

    // Q&A pair (keep Question + Answer together)
    if (QA_START_PATTERN.test(trimmed)) {
      flushParagraph()
      const qaLines = [line]
      i++
      let seenAnswer = false
      while (i < lines.length) {
        const nextLine = lines[i]
        const nextTrimmed = nextLine.trim()
        if (HEADING_PATTERN.test(nextLine) || isTableStart(lines, i)) {
          break
        }
        if (QA_START_PATTERN.test(nextTrimmed)) {
          break
        }
        if (QA_ANSWER_PATTERN.test(nextTrimmed)) {
          seenAnswer = true
        }
        if (!nextTrimmed && seenAnswer) {
          i++
          break
        }
        qaLines.push(nextLine)
        i++
      }
      blocks.push({
        heading: buildHeadingBreadcrumb(headingStack, documentTitle),
        text: qaLines.join('\n').trim(),
        isTable: false,
        isCodeFence: false,
        isQaPair: true
      })
      continue
    }

    // Blank line ends current paragraph
    if (!trimmed) {
      flushParagraph()
      i++
      continue
    }

    paragraphLines.push(line)
    i++
  }

  flushParagraph()
  return blocks
}

function getTrailingOverlap(text: string, overlapTokens: number): string {
  if (overlapTokens <= 0) return ''
  const maxOverlapChars = overlapTokens * 4
  if (text.length <= maxOverlapChars) return text
  const start = text.length - maxOverlapChars
  const spaceBoundary = text.indexOf(' ', start)
  const sliceStart = spaceBoundary !== -1 ? spaceBoundary + 1 : start
  return text.slice(sliceStart).trim()
}

function formatChunkText(heading: string | null, body: string): string {
  const cleanBody = body.trim()
  if (!heading) return cleanBody
  const prefix = `[Section: ${heading}]`
  if (cleanBody.startsWith(prefix)) return cleanBody
  return `${prefix}\n${cleanBody}`
}

/**
 * Chunk a Markdown document into retrieval-ready units while preserving
 * Markdown tables, fenced JSON/code blocks, and Q&A pairs intact.
 */
export function chunkKnowledgeDocument(
  markdown: string,
  options: ChunkOptions = {}
): DocumentChunk[] {
  const maxTokens = Math.max(120, options.maxTokens ?? DEFAULT_MAX_TOKENS)
  const overlapTokens = Math.max(
    0,
    Math.min(
      Math.floor(maxTokens / 3),
      options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS
    )
  )
  const blocks = parseMarkdownBlocks(markdown, options.documentTitle)
  if (blocks.length === 0) return []

  const chunks: DocumentChunk[] = []
  let activeHeading: string | null = blocks[0].heading
  let activeParts: string[] = []
  let activeHasTable = false
  let activeTokens = 0

  const flushChunk = () => {
    if (activeParts.length === 0) return
    const body = activeParts.join('\n\n').trim()
    if (!body) {
      activeParts = []
      activeHasTable = false
      activeTokens = 0
      return
    }
    const content = formatChunkText(activeHeading, body)
    chunks.push({
      chunkIndex: chunks.length,
      heading: activeHeading,
      content,
      containsTable: activeHasTable ? 1 : 0,
      tokenCount: estimateTokenCount(content)
    })
    activeParts = []
    activeHasTable = false
    activeTokens = 0
  }

  for (const block of blocks) {
    const blockTokens = estimateTokenCount(block.text)
    const headingChanged = block.heading !== activeHeading

    if (headingChanged) {
      flushChunk()
      activeHeading = block.heading
    }

    // Oversized non-table, non-code, non-QA prose gets split at line/word boundaries
    if (
      !block.isTable &&
      !block.isCodeFence &&
      !block.isQaPair &&
      blockTokens > maxTokens
    ) {
      flushChunk()
      const segments = splitLongText(block.text, maxTokens * 4)
      for (const segment of segments) {
        const content = formatChunkText(block.heading, segment)
        chunks.push({
          chunkIndex: chunks.length,
          heading: block.heading,
          content,
          containsTable: 0,
          tokenCount: estimateTokenCount(content)
        })
      }
      continue
    }

    // Keep tables, code fences, and Q&A pairs intact even if larger than maxTokens
    if (activeParts.length > 0 && activeTokens + blockTokens > maxTokens) {
      const previousWasTable = activeHasTable
      const previousBody = activeParts.join('\n\n')
      flushChunk()

      if (!previousWasTable && !block.isTable && overlapTokens > 0) {
        const overlap = getTrailingOverlap(previousBody, overlapTokens)
        if (overlap) {
          activeParts.push(overlap)
          activeTokens += estimateTokenCount(overlap)
        }
      }
    }

    activeParts.push(block.text)
    if (block.isTable) {
      activeHasTable = true
    }
    activeTokens += blockTokens
  }

  flushChunk()
  return chunks
}
