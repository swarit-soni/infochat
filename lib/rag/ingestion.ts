import { and, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { parse as parseHtml } from 'node-html-parser'

import {
  COLLEGE_SLUGS,
  COLLEGES,
  type CollegeSlug,
  getOfficialWebDomains
} from '@/lib/colleges/registry'
import { db } from '@/lib/db'
import {
  type CampusEvent,
  campusEvents,
  type CampusEventStatus,
  generateId,
  type KnowledgeAuthority,
  type KnowledgeChannel,
  knowledgeChunks,
  type KnowledgeDocument,
  knowledgeDocuments,
  type KnowledgeDomain,
  type KnowledgePriority,
  type KnowledgeSenderRole,
  type KnowledgeSourceSystem,
  type KnowledgeStatus,
  type OfficialPortal,
  officialPortals,
  unansweredQueries,
  type UnansweredQuery,
  type UnansweredQueryKind,
  type UnansweredQueryStatus
} from '@/lib/db/schema'
import type { TxInstance } from '@/lib/db/with-rls'
import { safeFetch } from '@/lib/utils/safe-fetch'

import { chunkKnowledgeDocument } from './chunker'
import { generateDocumentEmbeddings } from './embeddings'
import {
  computeContentHash,
  type NormalizedUrgentUpdateResult,
  type NormalizeUrgentUpdateInput,
  normalizeUrgentUpdateInput
} from './normalizer'
import { DEFAULT_OFFICIAL_PORTALS } from './portals-seed'

/** Official domains any college may crawl (each college: its own + partners). */
export const ALLOWED_OFFICIAL_CRAWL_DOMAINS: readonly string[] = [
  ...new Set(COLLEGE_SLUGS.flatMap(slug => getOfficialWebDomains(slug)))
]

export interface IngestKnowledgeDocumentInput {
  /** Owning college (tenant). */
  college: CollegeSlug
  title: string
  content: string
  domain: KnowledgeDomain
  sourceSystem: KnowledgeSourceSystem
  authority: KnowledgeAuthority
  program?: string | null
  semester?: string | null
  squad?: string | null
  residency?: string | null
  priority?: KnowledgePriority
  status?: KnowledgeStatus
  effectiveDate?: Date | null
  expiresAt?: Date | null
  supersedesId?: string | null
  supersedesTopic?: string | null
  actionRequired?: string | null
  sourceUrl?: string | null
  channel?: KnowledgeChannel
  senderRole?: KnowledgeSenderRole
  capturedAt?: Date
  contentHash?: string
  skipDuplicateCheck?: boolean
}

export interface IngestKnowledgeDocumentResult {
  deduplicated: boolean
  document: KnowledgeDocument
  chunkCount: number
  supersededDocumentIds: string[]
}

export interface IngestUrgentUpdateResult {
  status: 'published' | 'pending_review' | 'deduplicated' | 'discarded'
  discardReason?: string
  normalized: NormalizedUrgentUpdateResult
  document?: KnowledgeDocument
  chunkCount?: number
  supersededDocumentIds?: string[]
}

export interface UpsertCampusEventInput {
  college: CollegeSlug
  id?: string
  title: string
  organizer: string
  authority?: KnowledgeAuthority
  category?: string | null
  startAt: Date
  endAt?: Date | null
  venue?: string | null
  campusLocation?: string | null
  onlineUrl?: string | null
  registrationUrl?: string | null
  registrationDeadline?: Date | null
  eligibility?: string | null
  guidelines?: string | null
  resultsSummary?: string | null
  resultsUrl?: string | null
  sourceUrl?: string | null
  status?: CampusEventStatus
}

export interface UpsertOfficialPortalInput {
  college: CollegeSlug
  portalKey: string
  name: string
  authority: KnowledgeAuthority
  url: string
  requiresLogin?: number
  capabilities: string
  navigationSteps: string
  supportContact?: string | null
}

export interface RecordUnansweredQueryInput {
  college: CollegeSlug
  userId?: string | null
  chatId?: string | null
  query: string
  domain?: KnowledgeDomain
  cohort?: string | null
  reason: string
  flaggedDocumentId?: string | null
  kind?: UnansweredQueryKind
}

async function withRagWrite<T>(
  userId: string | null | undefined,
  callback: (tx: TxInstance) => Promise<T>
): Promise<T> {
  return db.transaction(async tx => {
    await tx.execute(
      sql`SELECT set_config('app.rag_system_write', 'true', true)`
    )
    if (userId) {
      await tx.execute(
        sql`SELECT set_config('app.current_user_id', ${userId}, true)`
      )
    }
    return callback(tx)
  })
}

async function supersedeMatchingDocuments(
  tx: TxInstance,
  target: {
    id: string
    college: CollegeSlug
    domain: KnowledgeDomain
    authority: KnowledgeAuthority
    supersedesId?: string | null
    supersedesTopic?: string | null
  }
): Promise<string[]> {
  const supersededIds: string[] = []

  if (target.supersedesId) {
    const updatedById = await tx
      .update(knowledgeDocuments)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(
        and(
          eq(knowledgeDocuments.id, target.supersedesId),
          ne(knowledgeDocuments.id, target.id),
          eq(knowledgeDocuments.college, target.college),
          eq(knowledgeDocuments.status, 'active')
        )
      )
      .returning({ id: knowledgeDocuments.id })
    supersededIds.push(...updatedById.map(r => r.id))
  }

  const topic = target.supersedesTopic?.trim()
  if (topic && topic.length >= 4) {
    const updatedByTopic = await tx
      .update(knowledgeDocuments)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(
        and(
          ne(knowledgeDocuments.id, target.id),
          eq(knowledgeDocuments.college, target.college),
          eq(knowledgeDocuments.status, 'active'),
          eq(knowledgeDocuments.domain, target.domain),
          eq(knowledgeDocuments.authority, target.authority),
          or(
            ilike(knowledgeDocuments.title, `%${topic}%`),
            ilike(knowledgeDocuments.supersedesTopic, `%${topic}%`)
          )
        )
      )
      .returning({ id: knowledgeDocuments.id })
    for (const row of updatedByTopic) {
      if (!supersededIds.includes(row.id)) {
        supersededIds.push(row.id)
      }
    }
  }

  return supersededIds
}

async function buildChunkRowsForDocument(
  documentId: string,
  title: string,
  content: string
) {
  const parsedChunks = chunkKnowledgeDocument(content, {
    documentTitle: title
  })
  const effectiveChunks =
    parsedChunks.length > 0
      ? parsedChunks
      : [
          {
            chunkIndex: 0,
            heading: title,
            content: content.trim(),
            containsTable: content.includes('|') ? 1 : 0,
            tokenCount: Math.ceil(content.trim().length / 4)
          }
        ]

  const embeddings = await generateDocumentEmbeddings(
    effectiveChunks.map(chunk => chunk.content)
  )

  return effectiveChunks.map((chunk, index) => ({
    id: generateId(),
    documentId,
    chunkIndex: chunk.chunkIndex,
    heading: chunk.heading,
    content: chunk.content,
    containsTable: chunk.containsTable,
    tokenCount: chunk.tokenCount,
    embedding: embeddings[index] ?? null
  }))
}

/**
 * Ingest a structured Markdown/text campus document into Postgres KB with
 * content-hash deduplication, table-preserving chunking, Gemini embeddings,
 * and automatic superseding of replaced notices.
 */
export async function ingestKnowledgeDocument(
  input: IngestKnowledgeDocumentInput,
  userId?: string | null
): Promise<IngestKnowledgeDocumentResult> {
  const trimmedContent = input.content.trim()
  const trimmedTitle = input.title.trim()
  if (!trimmedTitle || !trimmedContent) {
    throw new Error('Document title and content are required.')
  }

  const contentHash = input.contentHash || computeContentHash(trimmedContent)

  if (!input.skipDuplicateCheck) {
    const existing = await db
      .select()
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.college, input.college),
          eq(knowledgeDocuments.contentHash, contentHash),
          inArray(knowledgeDocuments.status, ['active', 'pending_review'])
        )
      )
      .orderBy(desc(knowledgeDocuments.createdAt))
      .limit(1)

    if (existing.length > 0) {
      return {
        deduplicated: true,
        document: existing[0],
        chunkCount: 0,
        supersededDocumentIds: []
      }
    }
  }

  const documentId = generateId()
  const chunkRows = await buildChunkRowsForDocument(
    documentId,
    trimmedTitle,
    trimmedContent
  )

  const status = input.status ?? 'active'

  const { document, supersededDocumentIds } = await withRagWrite(
    userId,
    async tx => {
      const [inserted] = await tx
        .insert(knowledgeDocuments)
        .values({
          id: documentId,
          college: input.college,
          title: trimmedTitle,
          domain: input.domain,
          sourceSystem: input.sourceSystem,
          authority: input.authority,
          program: input.program?.trim() || null,
          semester: input.semester?.trim() || null,
          squad: input.squad?.trim() || null,
          residency: input.residency?.trim() || null,
          priority: input.priority ?? 'standard',
          status,
          effectiveDate: input.effectiveDate ?? new Date(),
          expiresAt: input.expiresAt ?? null,
          supersedesId: input.supersedesId ?? null,
          supersedesTopic: input.supersedesTopic?.trim() || null,
          actionRequired: input.actionRequired?.trim() || null,
          sourceUrl: input.sourceUrl?.trim() || null,
          content: trimmedContent,
          contentHash,
          channel: input.channel ?? 'mentor_upload',
          senderRole: input.senderRole ?? 'mentor',
          uploadedBy: userId ?? null,
          capturedAt: input.capturedAt ?? new Date()
        })
        .returning()

      if (chunkRows.length > 0) {
        await tx.insert(knowledgeChunks).values(chunkRows)
      }

      const supersededIds =
        status === 'active'
          ? await supersedeMatchingDocuments(tx, {
              id: inserted.id,
              college: inserted.college,
              domain: inserted.domain,
              authority: inserted.authority,
              supersedesId: inserted.supersedesId,
              supersedesTopic: inserted.supersedesTopic
            })
          : []

      return { document: inserted, supersededDocumentIds: supersededIds }
    }
  )

  return {
    deduplicated: false,
    document,
    chunkCount: chunkRows.length,
    supersededDocumentIds
  }
}

/**
 * Ingest an unstructured WhatsApp forward or Google Chat announcement through
 * the 5-stage normalization, PII filter, trust gate, and TTL pipeline.
 */
export async function ingestUrgentUpdate(
  input: NormalizeUrgentUpdateInput & { college: CollegeSlug },
  userId?: string | null
): Promise<IngestUrgentUpdateResult> {
  const normalized = await normalizeUrgentUpdateInput(input)

  if (normalized.discarded) {
    return {
      status: 'discarded',
      discardReason: normalized.discardReason,
      normalized
    }
  }

  const ingested = await ingestKnowledgeDocument(
    {
      college: input.college,
      title: normalized.title,
      content: normalized.normalizedMarkdown,
      domain: normalized.domain,
      sourceSystem: normalized.sourceSystem,
      authority: normalized.authority,
      program: normalized.program,
      semester: normalized.semester,
      squad: normalized.squad,
      residency: normalized.residency,
      priority: normalized.priority,
      status: normalized.status,
      effectiveDate: normalized.effectiveDate,
      expiresAt: normalized.expiresAt,
      supersedesTopic: normalized.supersedesTopic,
      actionRequired: normalized.actionRequired,
      sourceUrl: input.sourceUrl ?? null,
      channel: normalized.channel,
      senderRole: normalized.senderRole,
      capturedAt: normalized.capturedAt,
      contentHash: normalized.contentHash
    },
    userId
  )

  if (ingested.deduplicated) {
    return {
      status: 'deduplicated',
      normalized,
      document: ingested.document,
      chunkCount: 0,
      supersededDocumentIds: []
    }
  }

  return {
    status:
      ingested.document.status === 'pending_review'
        ? 'pending_review'
        : 'published',
    normalized,
    document: ingested.document,
    chunkCount: ingested.chunkCount,
    supersededDocumentIds: ingested.supersededDocumentIds
  }
}

/**
 * Approve a `pending_review` document in 1 tap, ensuring chunks exist and
 * superseding any prior notice on the same topic.
 */
export async function approvePendingDocument(
  documentId: string,
  mentorUserId: string,
  college: CollegeSlug
): Promise<{
  document: KnowledgeDocument | null
  supersededDocumentIds: string[]
}> {
  return withRagWrite(mentorUserId, async tx => {
    const [updated] = await tx
      .update(knowledgeDocuments)
      .set({
        status: 'active',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(knowledgeDocuments.id, documentId),
          eq(knowledgeDocuments.college, college)
        )
      )
      .returning()

    if (!updated) {
      return { document: null, supersededDocumentIds: [] }
    }

    const existingChunks = await tx
      .select({ id: knowledgeChunks.id })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.documentId, updated.id))
      .limit(1)

    if (existingChunks.length === 0) {
      const chunkRows = await buildChunkRowsForDocument(
        updated.id,
        updated.title,
        updated.content
      )
      if (chunkRows.length > 0) {
        await tx.insert(knowledgeChunks).values(chunkRows)
      }
    }

    const supersededDocumentIds = await supersedeMatchingDocuments(tx, {
      id: updated.id,
      college: updated.college,
      domain: updated.domain,
      authority: updated.authority,
      supersedesId: updated.supersedesId,
      supersedesTopic: updated.supersedesTopic
    })

    return { document: updated, supersededDocumentIds }
  })
}

export async function updateDocumentStatus(
  documentId: string,
  status: KnowledgeStatus,
  mentorUserId: string,
  college: CollegeSlug
): Promise<KnowledgeDocument | null> {
  if (status === 'active') {
    const result = await approvePendingDocument(
      documentId,
      mentorUserId,
      college
    )
    return result.document
  }

  return withRagWrite(mentorUserId, async tx => {
    const [updated] = await tx
      .update(knowledgeDocuments)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(knowledgeDocuments.id, documentId),
          eq(knowledgeDocuments.college, college)
        )
      )
      .returning()

    return updated ?? null
  })
}

export async function upsertCampusEvent(
  input: UpsertCampusEventInput,
  mentorUserId?: string | null
): Promise<CampusEvent> {
  return withRagWrite(mentorUserId, async tx => {
    if (input.id) {
      const [updated] = await tx
        .update(campusEvents)
        .set({
          title: input.title.trim(),
          organizer: input.organizer.trim(),
          authority: input.authority ?? 'joint',
          category: input.category?.trim() || null,
          startAt: input.startAt,
          endAt: input.endAt ?? null,
          venue: input.venue?.trim() || null,
          campusLocation: input.campusLocation?.trim() || null,
          onlineUrl: input.onlineUrl?.trim() || null,
          registrationUrl: input.registrationUrl?.trim() || null,
          registrationDeadline: input.registrationDeadline ?? null,
          eligibility: input.eligibility?.trim() || null,
          guidelines: input.guidelines?.trim() || null,
          resultsSummary: input.resultsSummary?.trim() || null,
          resultsUrl: input.resultsUrl?.trim() || null,
          sourceUrl: input.sourceUrl?.trim() || null,
          status: input.status ?? 'upcoming',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(campusEvents.id, input.id),
            eq(campusEvents.college, input.college)
          )
        )
        .returning()

      if (updated) return updated
    }

    const [created] = await tx
      .insert(campusEvents)
      .values({
        // Never reuse a client-supplied id: it may belong to another
        // college's event that the scoped update above did not match.
        id: generateId(),
        college: input.college,
        title: input.title.trim(),
        organizer: input.organizer.trim(),
        authority: input.authority ?? 'joint',
        category: input.category?.trim() || null,
        startAt: input.startAt,
        endAt: input.endAt ?? null,
        venue: input.venue?.trim() || null,
        campusLocation: input.campusLocation?.trim() || null,
        onlineUrl: input.onlineUrl?.trim() || null,
        registrationUrl: input.registrationUrl?.trim() || null,
        registrationDeadline: input.registrationDeadline ?? null,
        eligibility: input.eligibility?.trim() || null,
        guidelines: input.guidelines?.trim() || null,
        resultsSummary: input.resultsSummary?.trim() || null,
        resultsUrl: input.resultsUrl?.trim() || null,
        sourceUrl: input.sourceUrl?.trim() || null,
        status: input.status ?? 'upcoming',
        uploadedBy: mentorUserId ?? null
      })
      .returning()

    return created
  })
}

export async function updateCampusEventStatus(
  eventId: string,
  status: CampusEventStatus,
  mentorUserId: string,
  college: CollegeSlug
): Promise<CampusEvent | null> {
  return withRagWrite(mentorUserId, async tx => {
    const [updated] = await tx
      .update(campusEvents)
      .set({ status, updatedAt: new Date() })
      .where(
        and(eq(campusEvents.id, eventId), eq(campusEvents.college, college))
      )
      .returning()

    return updated ?? null
  })
}

export async function upsertOfficialPortal(
  input: UpsertOfficialPortalInput,
  mentorUserId?: string | null
): Promise<OfficialPortal> {
  const now = new Date()
  return withRagWrite(mentorUserId, async tx => {
    const [portal] = await tx
      .insert(officialPortals)
      .values({
        id: `portal_${input.college}_${input.portalKey.trim()}`,
        college: input.college,
        portalKey: input.portalKey.trim(),
        name: input.name.trim(),
        authority: input.authority,
        url: input.url.trim(),
        requiresLogin: input.requiresLogin ?? 1,
        capabilities: input.capabilities.trim(),
        navigationSteps: input.navigationSteps.trim(),
        supportContact: input.supportContact?.trim() || null,
        lastVerifiedAt: now,
        updatedBy: mentorUserId ?? null,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [officialPortals.college, officialPortals.portalKey],
        set: {
          name: input.name.trim(),
          authority: input.authority,
          url: input.url.trim(),
          requiresLogin: input.requiresLogin ?? 1,
          capabilities: input.capabilities.trim(),
          navigationSteps: input.navigationSteps.trim(),
          supportContact: input.supportContact?.trim() || null,
          lastVerifiedAt: now,
          updatedBy: mentorUserId ?? null,
          updatedAt: now
        }
      })
      .returning()

    return portal
  })
}

export async function seedDefaultOfficialPortals(
  college: CollegeSlug,
  mentorUserId?: string | null
): Promise<OfficialPortal[]> {
  const results: OfficialPortal[] = []
  for (const portal of DEFAULT_OFFICIAL_PORTALS) {
    if (portal.college !== college) continue
    const saved = await upsertOfficialPortal(
      {
        college,
        portalKey: portal.portalKey,
        name: portal.name,
        authority: portal.authority,
        url: portal.url,
        requiresLogin: portal.requiresLogin,
        capabilities: portal.capabilities,
        navigationSteps: portal.navigationSteps,
        supportContact: portal.supportContact
      },
      mentorUserId
    )
    results.push(saved)
  }
  return results
}

export async function recordUnansweredQuery(
  input: RecordUnansweredQueryInput
): Promise<UnansweredQuery | null> {
  const trimmedQuery = input.query.trim()
  const trimmedReason = input.reason.trim()
  if (!trimmedQuery || !trimmedReason) return null

  try {
    const [inserted] = await db
      .insert(unansweredQueries)
      .values({
        id: generateId(),
        college: input.college,
        userId: input.userId ?? null,
        chatId: input.chatId ?? null,
        query: trimmedQuery,
        domain: input.domain ?? 'general',
        cohort: input.cohort?.trim() || null,
        reason: trimmedReason,
        flaggedDocumentId: input.flaggedDocumentId ?? null,
        kind: input.kind ?? 'abstention',
        status: 'open'
      })
      .returning()

    return inserted ?? null
  } catch (error) {
    console.warn(
      '[RAG] Failed to log unanswered query:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

export async function resolveUnansweredQuery(
  id: string,
  status: UnansweredQueryStatus,
  mentorUserId: string,
  college: CollegeSlug
): Promise<UnansweredQuery | null> {
  return withRagWrite(mentorUserId, async tx => {
    const [updated] = await tx
      .update(unansweredQueries)
      .set({
        status,
        resolvedBy: mentorUserId,
        resolvedAt: status === 'open' ? null : new Date()
      })
      .where(
        and(
          eq(unansweredQueries.id, id),
          eq(unansweredQueries.college, college)
        )
      )
      .returning()

    return updated ?? null
  })
}

const WEB_SOURCE_SYSTEM_BY_COLLEGE: Record<CollegeSlug, KnowledgeSourceSystem> =
  {
    kalvium: 'kalvium_web',
    jecrc: 'jecrc_web',
    bkbirla: 'bkbirla_web'
  }

function hostMatchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

/**
 * Whether `rawUrl` is on an official domain. With `college`, only that
 * college's and its partners' domains are accepted.
 */
export function isAllowedOfficialUrl(
  rawUrl: string,
  college?: CollegeSlug
): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }
    const hostname = parsed.hostname.toLowerCase()
    const domains = college
      ? getOfficialWebDomains(college)
      : ALLOWED_OFFICIAL_CRAWL_DOMAINS
    return domains.some(domain => hostMatchesDomain(hostname, domain))
  } catch {
    return false
  }
}

function htmlTableToMarkdown(
  tableElement: ReturnType<typeof parseHtml>
): string {
  const rows = tableElement.querySelectorAll('tr')
  if (rows.length === 0) return ''

  const matrix: string[][] = []
  for (const row of rows) {
    const cells = row
      .querySelectorAll('th, td')
      .map(cell => cell.text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim())
    if (cells.length > 0) {
      matrix.push(cells)
    }
  }
  if (matrix.length === 0) return ''

  const colCount = Math.max(...matrix.map(r => r.length))
  const padRow = (r: string[]) => {
    const padded = [...r]
    while (padded.length < colCount) padded.push('')
    return `| ${padded.join(' | ')} |`
  }

  const lines = [
    padRow(matrix[0]),
    `| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`,
    ...matrix.slice(1).map(padRow)
  ]
  return lines.join('\n')
}

export function extractMarkdownFromHtml(
  html: string,
  fallbackTitle: string
): { title: string; markdown: string } {
  const root = parseHtml(html)
  root
    .querySelectorAll('script, style, noscript, nav, footer, svg')
    .forEach(node => node.remove())

  const pageTitle =
    root.querySelector('title')?.text.replace(/\s+/g, ' ').trim() ||
    root.querySelector('h1')?.text.replace(/\s+/g, ' ').trim() ||
    fallbackTitle

  const main = root.querySelector('main, article, [role="main"]') ?? root
  const sections: string[] = []

  for (const node of main.querySelectorAll('h1, h2, h3, h4, p, li, table')) {
    const tag = node.tagName?.toLowerCase()
    if (tag === 'table') {
      const tableMd = htmlTableToMarkdown(node)
      if (tableMd) sections.push(tableMd)
      continue
    }

    const text = node.text.replace(/\s+/g, ' ').trim()
    if (!text) continue

    if (tag === 'h1') sections.push(`# ${text}`)
    else if (tag === 'h2') sections.push(`## ${text}`)
    else if (tag === 'h3') sections.push(`### ${text}`)
    else if (tag === 'h4') sections.push(`#### ${text}`)
    else if (tag === 'li') sections.push(`- ${text}`)
    else sections.push(text)
  }

  const markdown =
    sections.join('\n\n').trim() || main.text.replace(/\s+/g, ' ').trim()

  return { title: pageTitle, markdown }
}

/**
 * Crawl an allowlisted official university or Kalvium URL and ingest its
 * structured Markdown & tables into the Postgres KB.
 */
export async function crawlAndIngestOfficialUrl(
  params: {
    college: CollegeSlug
    url: string
    domain: KnowledgeDomain
    authority?: KnowledgeAuthority
    sourceSystem?: KnowledgeSourceSystem
    title?: string
  },
  userId?: string | null
): Promise<IngestKnowledgeDocumentResult> {
  if (!isAllowedOfficialUrl(params.url, params.college)) {
    throw new Error(
      `URL must belong to an official allowlisted domain (${getOfficialWebDomains(params.college).join(', ')}).`
    )
  }

  const hostname = new URL(params.url).hostname.toLowerCase()
  const hostCollege =
    COLLEGE_SLUGS.find(slug =>
      COLLEGES[slug].officialWebDomains.some(domain =>
        hostMatchesDomain(hostname, domain)
      )
    ) ?? params.college
  const inferredAuthority: KnowledgeAuthority = params.authority ?? hostCollege
  const inferredSourceSystem: KnowledgeSourceSystem =
    params.sourceSystem ?? WEB_SOURCE_SYSTEM_BY_COLLEGE[hostCollege]

  const response = await safeFetch(params.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SeraOfficialCrawler/1.0)',
      Accept: 'text/html,text/plain,application/xhtml+xml'
    }
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch official URL (${response.status} ${response.statusText})`
    )
  }

  const body = await response.text()
  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  const isHtml =
    contentType.includes('text/html') ||
    contentType.includes('xhtml') ||
    /<html/i.test(body)

  const extracted = isHtml
    ? extractMarkdownFromHtml(body, params.title || hostname)
    : { title: params.title || hostname, markdown: body.trim() }

  return ingestKnowledgeDocument(
    {
      college: params.college,
      title: params.title?.trim() || extracted.title,
      content: extracted.markdown,
      domain: params.domain,
      sourceSystem: inferredSourceSystem,
      authority: inferredAuthority,
      sourceUrl: params.url,
      channel: 'web_crawl',
      senderRole: 'system',
      priority: 'standard',
      status: 'active'
    },
    userId
  )
}
