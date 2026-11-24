'use server'

import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import type { AppUser } from '@/lib/auth/types'
import type { CollegeSlug } from '@/lib/colleges/registry'
import { db } from '@/lib/db'
import {
  CAMPUS_EVENT_STATUSES,
  type CampusEvent,
  campusEvents,
  type CampusEventStatus,
  KNOWLEDGE_AUTHORITIES,
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_PRIORITIES,
  KNOWLEDGE_SOURCE_SYSTEMS,
  type KnowledgeDocument,
  knowledgeDocuments,
  type KnowledgeStatus,
  type OfficialPortal,
  officialPortals,
  UNANSWERED_QUERY_STATUSES,
  unansweredQueries,
  type UnansweredQuery,
  type UnansweredQueryStatus
} from '@/lib/db/schema'
import {
  approvePendingDocument,
  crawlAndIngestOfficialUrl,
  ingestKnowledgeDocument,
  ingestUrgentUpdate,
  recordUnansweredQuery,
  resolveUnansweredQuery,
  seedDefaultOfficialPortals,
  updateCampusEventStatus,
  updateDocumentStatus,
  upsertCampusEvent,
  upsertOfficialPortal
} from '@/lib/rag/ingestion'
import { DEFAULT_OFFICIAL_PORTALS } from '@/lib/rag/portals-seed'

export interface MentorPortalOverview {
  dbReady: boolean
  dbError?: string
  documents: KnowledgeDocument[]
  pendingDocuments: KnowledgeDocument[]
  events: CampusEvent[]
  portals: OfficialPortal[]
  unansweredQueries: UnansweredQuery[]
}

type MentorUser = AppUser & { college: CollegeSlug }

/**
 * The signed-in mentor, with the college they manage. Every mentor action
 * reads and writes only that college's rows (tenant isolation).
 */
async function requireMentorUser(): Promise<MentorUser | null> {
  const user = await getCurrentUser()
  if (!user || user.userType !== 'mentor' || !user.college) {
    return null
  }
  return { ...user, college: user.college }
}

function parseOptionalDate(value?: string | null): Date | null {
  if (!value?.trim()) return null
  const parsed = new Date(value.trim())
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const uploadDocumentSchema = z.object({
  title: z.string().trim().min(2, 'Title is required'),
  content: z.string().trim().min(10, 'Document content is required'),
  domain: z.enum(KNOWLEDGE_DOMAINS),
  sourceSystem: z.enum(KNOWLEDGE_SOURCE_SYSTEMS),
  authority: z.enum(KNOWLEDGE_AUTHORITIES),
  priority: z.enum(KNOWLEDGE_PRIORITIES).default('standard'),
  program: z.string().optional().nullable(),
  semester: z.string().optional().nullable(),
  squad: z.string().optional().nullable(),
  residency: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  supersedesTopic: z.string().optional().nullable(),
  actionRequired: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable()
})

const urgentUpdateSchema = z.object({
  rawText: z.string().trim().min(2, 'Message text is required'),
  channel: z.enum(['whatsapp_forward', 'gchat']).default('whatsapp_forward'),
  senderRole: z
    .enum(['mentor', 'student_cr', 'official_space'])
    .default('mentor'),
  threadContext: z.string().optional(),
  sourceUrl: z.string().optional()
})

const campusEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, 'Event title is required'),
  organizer: z.string().trim().min(2, 'Organizer is required'),
  authority: z.enum(KNOWLEDGE_AUTHORITIES).default('joint'),
  category: z.string().optional().nullable(),
  startAt: z.string().trim().min(1, 'Start date/time is required'),
  endAt: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  campusLocation: z.string().optional().nullable(),
  onlineUrl: z.string().optional().nullable(),
  registrationUrl: z.string().optional().nullable(),
  registrationDeadline: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  guidelines: z.string().optional().nullable(),
  resultsSummary: z.string().optional().nullable(),
  resultsUrl: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  status: z.enum(CAMPUS_EVENT_STATUSES).default('upcoming')
})

const officialPortalSchema = z.object({
  portalKey: z.string().trim().min(2, 'Portal key is required'),
  name: z.string().trim().min(2, 'Portal name is required'),
  authority: z.enum(KNOWLEDGE_AUTHORITIES),
  url: z.string().url('Valid portal URL is required'),
  requiresLogin: z.boolean().default(true),
  capabilities: z.string().trim().min(4, 'Capabilities summary is required'),
  navigationSteps: z.string().trim().min(4, 'Navigation steps are required'),
  supportContact: z.string().optional().nullable()
})

const crawlOfficialSchema = z.object({
  url: z.string().url('Valid official URL is required'),
  domain: z.enum(KNOWLEDGE_DOMAINS),
  title: z.string().optional()
})

/**
 * Load all 5 Mentor Data Portal collections for the authenticated mentor.
 */
export async function getMentorPortalOverview(): Promise<MentorPortalOverview> {
  const mentor = await requireMentorUser()
  if (!mentor) {
    throw new Error('Mentor access required.')
  }

  try {
    const [allDocs, allEvents, allPortals, allQueries] = await Promise.all([
      db
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.college, mentor.college))
        .orderBy(desc(knowledgeDocuments.createdAt))
        .limit(100),
      db
        .select()
        .from(campusEvents)
        .where(eq(campusEvents.college, mentor.college))
        .orderBy(desc(campusEvents.startAt))
        .limit(50),
      db
        .select()
        .from(officialPortals)
        .where(eq(officialPortals.college, mentor.college))
        .orderBy(asc(officialPortals.portalKey)),
      db
        .select()
        .from(unansweredQueries)
        .where(eq(unansweredQueries.college, mentor.college))
        .orderBy(desc(unansweredQueries.createdAt))
        .limit(100)
    ])

    return {
      dbReady: true,
      documents: allDocs.filter(doc => doc.status !== 'pending_review'),
      pendingDocuments: allDocs.filter(doc => doc.status === 'pending_review'),
      events: allEvents,
      portals: allPortals,
      unansweredQueries: allQueries
    }
  } catch (error) {
    console.warn('[MentorPortal] Failed to query RAG tables:', error)
    return {
      dbReady: false,
      dbError:
        error instanceof Error
          ? error.message
          : 'Database unavailable or migration 0023_add_rag_pipelines.sql has not been applied yet.',
      documents: [],
      pendingDocuments: [],
      events: [],
      portals: DEFAULT_OFFICIAL_PORTALS.filter(
        p => p.college === mentor.college
      ).map(p => ({
        ...p,
        updatedBy: null,
        createdAt: p.lastVerifiedAt,
        updatedAt: p.lastVerifiedAt
      })),
      unansweredQueries: []
    }
  }
}

export async function uploadKnowledgeDocumentAction(
  input: z.infer<typeof uploadDocumentSchema>
) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  const parsed = uploadDocumentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid document fields.'
    }
  }

  try {
    const data = parsed.data
    const result = await ingestKnowledgeDocument(
      {
        college: mentor.college,
        title: data.title,
        content: data.content,
        domain: data.domain,
        sourceSystem: data.sourceSystem,
        authority: data.authority,
        priority: data.priority,
        program: data.program || null,
        semester: data.semester || null,
        squad: data.squad || null,
        residency: data.residency || null,
        effectiveDate: parseOptionalDate(data.effectiveDate) ?? new Date(),
        expiresAt: parseOptionalDate(data.expiresAt),
        supersedesTopic: data.supersedesTopic || null,
        actionRequired: data.actionRequired || null,
        sourceUrl: data.sourceUrl || null,
        channel: 'mentor_upload',
        senderRole: 'mentor',
        status: 'active'
      },
      mentor.id
    )

    return {
      success: true,
      deduplicated: result.deduplicated,
      document: result.document,
      chunkCount: result.chunkCount,
      supersededCount: result.supersededDocumentIds.length
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to ingest knowledge document.'
    }
  }
}

export async function submitUrgentUpdateAction(
  input: z.infer<typeof urgentUpdateSchema>
) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  const parsed = urgentUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid urgent update payload.'
    }
  }

  try {
    const data = parsed.data
    const result = await ingestUrgentUpdate(
      {
        college: mentor.college,
        rawText: data.rawText,
        channel: data.channel,
        senderRole: data.senderRole,
        senderEmail:
          data.senderRole === 'mentor'
            ? (mentor.email ?? undefined)
            : undefined,
        senderName: mentor.name ?? undefined,
        threadContext: data.threadContext,
        sourceUrl: data.sourceUrl
      },
      mentor.id
    )

    return {
      success: true,
      status: result.status,
      discardReason: result.discardReason,
      document: result.document ?? null,
      chunkCount: result.chunkCount ?? 0,
      supersededCount: result.supersededDocumentIds?.length ?? 0
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to normalize and ingest urgent update.'
    }
  }
}

export async function reviewUrgentUpdateAction(input: {
  documentId: string
  decision: 'approve' | 'archive' | 'supersede'
}) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  try {
    if (input.decision === 'approve') {
      const result = await approvePendingDocument(
        input.documentId,
        mentor.id,
        mentor.college
      )
      if (!result.document) {
        return { success: false, error: 'Document not found.' }
      }
      return {
        success: true,
        document: result.document,
        supersededCount: result.supersededDocumentIds.length
      }
    }

    const nextStatus: KnowledgeStatus =
      input.decision === 'supersede' ? 'superseded' : 'archived'
    const updated = await updateDocumentStatus(
      input.documentId,
      nextStatus,
      mentor.id,
      mentor.college
    )
    if (!updated) {
      return { success: false, error: 'Document not found.' }
    }
    return { success: true, document: updated, supersededCount: 0 }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update document status.'
    }
  }
}

export async function saveCampusEventAction(
  input: z.infer<typeof campusEventSchema>
) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  const parsed = campusEventSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid campus event fields.'
    }
  }

  const startAt = parseOptionalDate(parsed.data.startAt)
  if (!startAt) {
    return { success: false, error: 'Invalid event start date/time.' }
  }

  try {
    const event = await upsertCampusEvent(
      {
        ...parsed.data,
        college: mentor.college,
        startAt,
        endAt: parseOptionalDate(parsed.data.endAt),
        registrationDeadline: parseOptionalDate(
          parsed.data.registrationDeadline
        )
      },
      mentor.id
    )
    return { success: true, event }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to save campus event.'
    }
  }
}

export async function updateCampusEventStatusAction(input: {
  eventId: string
  status: CampusEventStatus
}) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  if (!CAMPUS_EVENT_STATUSES.includes(input.status)) {
    return { success: false, error: 'Invalid event status.' }
  }

  try {
    const event = await updateCampusEventStatus(
      input.eventId,
      input.status,
      mentor.id,
      mentor.college
    )
    if (!event) {
      return { success: false, error: 'Event not found.' }
    }
    return { success: true, event }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update event status.'
    }
  }
}

export async function saveOfficialPortalAction(
  input: z.infer<typeof officialPortalSchema>
) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  const parsed = officialPortalSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid portal fields.'
    }
  }

  try {
    const portal = await upsertOfficialPortal(
      {
        college: mentor.college,
        portalKey: parsed.data.portalKey,
        name: parsed.data.name,
        authority: parsed.data.authority,
        url: parsed.data.url,
        requiresLogin: parsed.data.requiresLogin ? 1 : 0,
        capabilities: parsed.data.capabilities,
        navigationSteps: parsed.data.navigationSteps,
        supportContact: parsed.data.supportContact || null
      },
      mentor.id
    )
    return { success: true, portal }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to save official portal.'
    }
  }
}

export async function seedOfficialPortalsAction() {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  try {
    const portals = await seedDefaultOfficialPortals(mentor.college, mentor.id)
    return { success: true, portals }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to seed default portals.'
    }
  }
}

export async function crawlOfficialUrlAction(
  input: z.infer<typeof crawlOfficialSchema>
) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  const parsed = crawlOfficialSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid official URL.'
    }
  }

  try {
    const result = await crawlAndIngestOfficialUrl(
      { ...parsed.data, college: mentor.college },
      mentor.id
    )
    return {
      success: true,
      deduplicated: result.deduplicated,
      document: result.document,
      chunkCount: result.chunkCount
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to crawl official URL.'
    }
  }
}

export async function flagDocumentCitationAction(input: {
  documentId: string
  reason: string
  query?: string
}) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  try {
    const [doc] = await db
      .select()
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.id, input.documentId),
          eq(knowledgeDocuments.college, mentor.college)
        )
      )
      .limit(1)
    if (!doc) {
      return { success: false, error: 'Document not found.' }
    }

    const flagged = await recordUnansweredQuery({
      college: mentor.college,
      userId: mentor.id,
      query:
        input.query?.trim() || doc?.title || `Document ${input.documentId}`,
      domain: doc?.domain ?? 'general',
      reason: input.reason.trim() || 'Flagged as outdated / inaccurate',
      flaggedDocumentId: doc.id,
      kind: 'citation_flag'
    })

    return { success: true, flagged }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to flag cited document.'
    }
  }
}

export async function resolveUnansweredQueryAction(input: {
  id: string
  status: UnansweredQueryStatus
}) {
  const mentor = await requireMentorUser()
  if (!mentor) {
    return { success: false, error: 'Mentor access required.' }
  }

  if (!UNANSWERED_QUERY_STATUSES.includes(input.status)) {
    return { success: false, error: 'Invalid query status.' }
  }

  try {
    const updated = await resolveUnansweredQuery(
      input.id,
      input.status,
      mentor.id,
      mentor.college
    )
    if (!updated) {
      return { success: false, error: 'Query log entry not found.' }
    }
    return { success: true, queryLog: updated }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update unanswered query status.'
    }
  }
}
