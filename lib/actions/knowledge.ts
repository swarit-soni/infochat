'use server'

import { and, desc, eq, gt, isNull, lt, or } from 'drizzle-orm'

import { db } from '@/lib/db'
import { type KnowledgeDocument, knowledgeDocuments } from '@/lib/db/schema'

const DEFAULT_KNOWLEDGE_PAGE_SIZE = 25
const MAX_KNOWLEDGE_PAGE_SIZE = 50

export type KnowledgeListCursor = {
  updatedAt: string
  id: string
}

export type KnowledgeLibraryItem = Pick<
  KnowledgeDocument,
  | 'id'
  | 'title'
  | 'domain'
  | 'sourceSystem'
  | 'authority'
  | 'priority'
  | 'program'
  | 'semester'
  | 'effectiveDate'
  | 'expiresAt'
  | 'actionRequired'
  | 'sourceUrl'
  | 'content'
  | 'updatedAt'
>

/**
 * List the documents Sera currently answers from: active and not expired,
 * newest first. The knowledge base is readable by everyone (its RLS select
 * policy is public), so no sign-in is required.
 */
export async function listKnowledgeDocuments({
  limit = DEFAULT_KNOWLEDGE_PAGE_SIZE,
  cursor
}: {
  limit?: number
  cursor?: KnowledgeListCursor | null
} = {}): Promise<{
  success: boolean
  documents?: KnowledgeLibraryItem[]
  nextCursor?: KnowledgeListCursor | null
  hasMore?: boolean
  error?: string
}> {
  const pageLimit = Math.max(
    1,
    Math.min(Math.floor(limit) || 1, MAX_KNOWLEDGE_PAGE_SIZE)
  )
  const cursorDate = cursor ? new Date(cursor.updatedAt) : null
  const hasValidCursor =
    cursor && cursorDate && !Number.isNaN(cursorDate.getTime())

  try {
    const rows = await db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        domain: knowledgeDocuments.domain,
        sourceSystem: knowledgeDocuments.sourceSystem,
        authority: knowledgeDocuments.authority,
        priority: knowledgeDocuments.priority,
        program: knowledgeDocuments.program,
        semester: knowledgeDocuments.semester,
        effectiveDate: knowledgeDocuments.effectiveDate,
        expiresAt: knowledgeDocuments.expiresAt,
        actionRequired: knowledgeDocuments.actionRequired,
        sourceUrl: knowledgeDocuments.sourceUrl,
        content: knowledgeDocuments.content,
        updatedAt: knowledgeDocuments.updatedAt
      })
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.status, 'active'),
          or(
            isNull(knowledgeDocuments.expiresAt),
            gt(knowledgeDocuments.expiresAt, new Date())
          ),
          hasValidCursor
            ? or(
                lt(knowledgeDocuments.updatedAt, cursorDate),
                and(
                  eq(knowledgeDocuments.updatedAt, cursorDate),
                  lt(knowledgeDocuments.id, cursor.id)
                )
              )
            : undefined
        )
      )
      .orderBy(desc(knowledgeDocuments.updatedAt), desc(knowledgeDocuments.id))
      .limit(pageLimit + 1)

    const documents = rows.slice(0, pageLimit)
    const last = documents[documents.length - 1]
    const hasMore = rows.length > pageLimit

    return {
      success: true,
      documents,
      nextCursor:
        hasMore && last
          ? { updatedAt: last.updatedAt.toISOString(), id: last.id }
          : null,
      hasMore
    }
  } catch (error) {
    console.error('Error listing knowledge documents:', error)
    return {
      success: false,
      documents: [],
      nextCursor: null,
      hasMore: false,
      error: 'Failed to load the knowledge base.'
    }
  }
}
