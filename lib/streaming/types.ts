import { UIMessage } from '@ai-sdk/react'

import type { SeraAudienceRole } from '../agents/prompts/search-mode-prompts'
import type { CollegeSlug } from '../colleges/registry'
import { Model } from '../types/models'
import { SearchMode } from '../types/search'

export interface BaseStreamConfig {
  message: UIMessage | null
  model: Model
  chatId: string
  userId: string
  trigger?: 'submit-user-message' | 'regenerate-assistant-message'
  messageId?: string
  abortSignal?: AbortSignal
  isNewChat?: boolean
  searchMode?: SearchMode
  spaceColor?: string
  /**
   * The asking user's college; scopes campus knowledge and tools. Null:
   * not enrolled anywhere, so every college's records are visible.
   */
  college?: CollegeSlug | null
  /** Who is asking (mentor, student or guest); tailors the system prompt. */
  audienceRole?: SeraAudienceRole
  onZeroPartError?: () => Promise<void>
}
