import type { UIMessage } from '@/lib/types/ai'

export interface ChatSection {
  id: string // User message ID
  userMessage: UIMessage
  assistantMessages: UIMessage[]
}

/**
 * Group messages into sections of one user message and the assistant
 * messages that answer it.
 *
 * useChat can briefly hold two entries with the same id while a stream is
 * finalized. Only the last one is live: the AI SDK writes every streamed
 * update to the last message with the response's id (findLastIndex), so an
 * earlier copy is a stale snapshot. Keeping the first copy froze the answer
 * mid-sentence on screen until a refresh loaded it from the database.
 */
export function buildChatSections(messages: UIMessage[]): ChatSection[] {
  const lastIndexById = new Map<string, number>()
  messages.forEach((message, index) => lastIndexById.set(message.id, index))

  const result: ChatSection[] = []
  let currentSection: ChatSection | null = null

  messages.forEach((message, index) => {
    if (lastIndexById.get(message.id) !== index) return

    if (message.role === 'user') {
      if (currentSection) result.push(currentSection)
      currentSection = {
        id: message.id,
        userMessage: message,
        assistantMessages: []
      }
    } else if (currentSection && message.role === 'assistant') {
      currentSection.assistantMessages.push(message)
    }
  })

  if (currentSection) result.push(currentSection)

  return result
}
