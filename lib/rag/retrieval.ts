import {
  and,
  asc,
  cosineDistance,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  or,
  sql
} from 'drizzle-orm'

import { DEFAULT_COLLEGE_DIRECTORY } from '@/lib/colleges/defaults'
import {
  type CollegeDirectory,
  type CollegeSlug,
  getCollege,
  JOINT_AUTHORITY_LABEL
} from '@/lib/colleges/registry'
import { db } from '@/lib/db'
import {
  campusEvents,
  type CampusEventStatus,
  KNOWLEDGE_SOURCE_LABELS,
  type KnowledgeAuthority,
  type KnowledgeChannel,
  knowledgeChunks,
  knowledgeDocuments,
  type KnowledgeDomain,
  type KnowledgePriority,
  type KnowledgeSourceSystem,
  type KnowledgeStatus,
  officialPortals,
  toSourceSystem
} from '@/lib/db/schema'

import { generateQueryEmbedding } from './embeddings'
import {
  DEFAULT_OFFICIAL_PORTALS,
  matchPortalsFromList,
  type OfficialPortalRecord
} from './portals-seed'

export interface CohortFilter {
  program?: string
  semester?: string
  squad?: string
  residency?: string
}

export interface RetrievalCandidate {
  chunkId: string
  documentId: string
  chunkIndex: number
  heading: string | null
  content: string
  containsTable: number
  title: string
  domain: KnowledgeDomain
  sourceSystem: KnowledgeSourceSystem
  authority: KnowledgeAuthority
  program: string | null
  semester: string | null
  squad: string | null
  residency: string | null
  priority: KnowledgePriority
  status: KnowledgeStatus
  channel: KnowledgeChannel
  effectiveDate: Date | null
  expiresAt: Date | null
  capturedAt: Date
  actionRequired: string | null
  sourceUrl: string | null
  vectorRank?: number
  lexicalRank?: number
  vectorScore?: number
  lexicalScore?: number
}

export interface RankedKnowledgeHit extends RetrievalCandidate {
  score: number
  provenanceBadge: string
  authorityLabel: string
  citationUrl: string
  formattedTitle: string
  formattedContent: string
}

export interface RetrieveCampusKnowledgeParams {
  query: string
  /**
   * Colleges whose documents are visible to the asker (their college plus
   * its partners). Omit only in tests; production callers always scope.
   */
  colleges?: CollegeSlug[]
  /** Resolves college names and websites in results. */
  directory?: CollegeDirectory
  domain?: KnowledgeDomain
  authority?: KnowledgeAuthority
  cohort?: CohortFilter
  limit?: number
  now?: Date
}

export interface RetrieveCampusEventsParams {
  query?: string
  colleges?: CollegeSlug[]
  status?: CampusEventStatus | 'all'
  includeCompleted?: boolean
  limit?: number
  now?: Date
}

export interface CampusEventHit {
  id: string
  title: string
  organizer: string
  authority: KnowledgeAuthority
  category: string | null
  startAt: Date
  endAt: Date | null
  venue: string | null
  campusLocation: string | null
  onlineUrl: string | null
  registrationUrl: string | null
  isRegistrationOpen: boolean
  registrationDeadline: Date | null
  eligibility: string | null
  guidelines: string | null
  resultsSummary: string | null
  resultsUrl: string | null
  sourceUrl: string | null
  status: CampusEventStatus
  citationUrl: string
}

export const SOURCE_PRECEDENCE_WEIGHTS: Record<KnowledgeSourceSystem, number> =
  {
    gchat_space: 0.35,
    whatsapp_forward: 0.35,
    official_notice: 0.25,
    portal_guide: 0.25,
    official_document: 0.2,
    official_guide: 0.18,
    campus_events: 0.1,
    official_website: 0.05
  }

const RRF_K = 60

function isValidHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function buildCanonicalKnowledgeUrl(
  documentId: string,
  authority: KnowledgeAuthority,
  sourceUrl?: string | null,
  college: CollegeSlug | null = null,
  directory: CollegeDirectory = DEFAULT_COLLEGE_DIRECTORY
): string {
  if (isValidHttpUrl(sourceUrl)) {
    return sourceUrl
  }
  const website =
    getCollege(directory, authority)?.website ??
    getCollege(directory, college)?.website ??
    'https://sera.invalid'
  return `${website.replace(/\/+$/, '')}/#sera-kb-${encodeURIComponent(documentId)}`
}

/** A document's issuing authority for display: a college's name, or joint. */
export function formatAuthorityLabel(
  authority: KnowledgeAuthority,
  directory: CollegeDirectory = DEFAULT_COLLEGE_DIRECTORY
): string {
  if (authority === 'joint') return JOINT_AUTHORITY_LABEL
  return getCollege(directory, authority)?.shortName ?? authority
}

export function formatProvenanceBadge(candidate: {
  priority: KnowledgePriority
  channel: KnowledgeChannel
  sourceSystem: KnowledgeSourceSystem
  effectiveDate: Date | null
  capturedAt: Date
}): string {
  const dateRef = candidate.effectiveDate ?? candidate.capturedAt
  const dateText = dateRef.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  if (candidate.priority === 'urgent') {
    const channelLabel =
      candidate.channel === 'gchat'
        ? 'GChat Announcement'
        : candidate.channel === 'whatsapp_forward'
          ? 'WhatsApp Forward (Mentor Verified)'
          : 'Urgent Campus Update'
    return `Urgent Update · ${channelLabel} · ${dateText}`
  }

  const sourceLabel =
    candidate.sourceSystem === 'gchat_space'
      ? 'GChat Announcement'
      : KNOWLEDGE_SOURCE_LABELS[candidate.sourceSystem]

  return `${sourceLabel} · ${dateText}`
}

function computeCohortBoost(
  candidate: RetrievalCandidate,
  cohort?: CohortFilter
): number {
  if (!cohort) return 0
  let boost = 0
  const pairs: Array<[string | null, string | undefined]> = [
    [candidate.program, cohort.program],
    [candidate.semester, cohort.semester],
    [candidate.squad, cohort.squad],
    [candidate.residency, cohort.residency]
  ]

  for (const [docVal, reqVal] of pairs) {
    if (!reqVal?.trim()) continue
    if (docVal && docVal.trim().toLowerCase() === reqVal.trim().toLowerCase()) {
      boost += 0.06
    }
  }
  return boost
}

function formatSnippetContent(
  candidate: RetrievalCandidate,
  directory: CollegeDirectory
): string {
  const authorityLabel = formatAuthorityLabel(candidate.authority, directory)
  const provenanceBadge = formatProvenanceBadge(candidate)
  const metaParts = [
    `Authority: ${authorityLabel}`,
    `Source: ${provenanceBadge}`,
    candidate.effectiveDate
      ? `Effective: ${candidate.effectiveDate.toISOString().slice(0, 10)}`
      : null,
    candidate.expiresAt
      ? `Expires: ${candidate.expiresAt.toISOString().slice(0, 10)}`
      : null,
    candidate.actionRequired
      ? `Action Required: ${candidate.actionRequired}`
      : null
  ].filter(Boolean)

  return `${metaParts.join(' | ')}\n\n${candidate.content}`
}

/**
 * Pure hybrid ranking combining Reciprocal Rank Fusion (vector + full-text),
 * source precedence tier weights, urgent update boost, and cohort specificity.
 */
export function fuseAndRankChunks(
  candidates: RetrievalCandidate[],
  options: {
    cohort?: CohortFilter
    limit?: number
    now?: Date
    /** Resolves college names and websites; defaults to built-in colleges. */
    directory?: CollegeDirectory
  } = {}
): RankedKnowledgeHit[] {
  const now = options.now ?? new Date()
  const directory = options.directory ?? DEFAULT_COLLEGE_DIRECTORY
  const limit = Math.max(1, options.limit ?? 6)

  const valid = candidates.filter(candidate => {
    if (candidate.status !== 'active') return false
    if (candidate.expiresAt && candidate.expiresAt.getTime() <= now.getTime()) {
      return false
    }
    return true
  })

  const scored: RankedKnowledgeHit[] = valid.map(candidate => {
    const vectorRrf =
      candidate.vectorRank !== undefined
        ? 1 / (RRF_K + candidate.vectorRank)
        : 0
    const lexicalRrf =
      candidate.lexicalRank !== undefined
        ? 1 / (RRF_K + candidate.lexicalRank)
        : 0

    // Scale RRF contributions up into the same range as precedence weights
    const relevanceScore = (vectorRrf + lexicalRrf) * 20
    const precedenceBoost =
      SOURCE_PRECEDENCE_WEIGHTS[candidate.sourceSystem] ?? 0
    const urgentBoost = candidate.priority === 'urgent' ? 0.2 : 0
    const cohortBoost = computeCohortBoost(candidate, options.cohort)

    const score = Number(
      (relevanceScore + precedenceBoost + urgentBoost + cohortBoost).toFixed(6)
    )
    const authorityLabel = formatAuthorityLabel(candidate.authority, directory)
    const provenanceBadge = formatProvenanceBadge(candidate)
    const citationUrl = buildCanonicalKnowledgeUrl(
      candidate.documentId,
      candidate.authority,
      candidate.sourceUrl,
      null,
      directory
    )

    return {
      ...candidate,
      score,
      provenanceBadge,
      authorityLabel,
      citationUrl,
      formattedTitle: `${candidate.title} (${authorityLabel} · ${provenanceBadge})`,
      formattedContent: formatSnippetContent(candidate, directory)
    }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const aTime = (a.effectiveDate ?? a.capturedAt).getTime()
    const bTime = (b.effectiveDate ?? b.capturedAt).getTime()
    return bTime - aTime
  })

  // Keep highest-scoring chunk per chunkId, capped to limit
  const seenChunks = new Set<string>()
  const deduped: RankedKnowledgeHit[] = []
  for (const item of scored) {
    if (seenChunks.has(item.chunkId)) continue
    seenChunks.add(item.chunkId)
    deduped.push(item)
    if (deduped.length >= limit) break
  }

  return deduped
}

function buildDocumentFilters(
  params: RetrieveCampusKnowledgeParams,
  now: Date
) {
  const conditions = [
    eq(knowledgeDocuments.status, 'active'),
    or(
      isNull(knowledgeDocuments.expiresAt),
      gt(knowledgeDocuments.expiresAt, now)
    )
  ]

  if (params.colleges) {
    conditions.push(
      params.colleges.length > 0
        ? inArray(knowledgeDocuments.college, params.colleges)
        : sql`false`
    )
  }

  if (params.domain) {
    conditions.push(eq(knowledgeDocuments.domain, params.domain))
  }
  if (params.authority) {
    conditions.push(
      or(
        eq(knowledgeDocuments.authority, params.authority),
        eq(knowledgeDocuments.authority, 'joint')
      )
    )
  }

  const cohort = params.cohort
  if (cohort?.program?.trim()) {
    conditions.push(
      or(
        isNull(knowledgeDocuments.program),
        ilike(knowledgeDocuments.program, cohort.program.trim())
      )
    )
  }
  if (cohort?.semester?.trim()) {
    conditions.push(
      or(
        isNull(knowledgeDocuments.semester),
        ilike(knowledgeDocuments.semester, cohort.semester.trim())
      )
    )
  }
  if (cohort?.squad?.trim()) {
    conditions.push(
      or(
        isNull(knowledgeDocuments.squad),
        ilike(knowledgeDocuments.squad, cohort.squad.trim())
      )
    )
  }
  if (cohort?.residency?.trim()) {
    conditions.push(
      or(
        isNull(knowledgeDocuments.residency),
        ilike(knowledgeDocuments.residency, cohort.residency.trim())
      )
    )
  }

  return and(...conditions)
}

function mapJoinedRow(
  row: {
    chunkId: string
    documentId: string
    chunkIndex: number
    heading: string | null
    content: string
    containsTable: number
    title: string
    domain: KnowledgeDomain
    sourceSystem: KnowledgeSourceSystem
    authority: KnowledgeAuthority
    program: string | null
    semester: string | null
    squad: string | null
    residency: string | null
    priority: KnowledgePriority
    status: KnowledgeStatus
    channel: KnowledgeChannel
    effectiveDate: Date | null
    expiresAt: Date | null
    capturedAt: Date
    actionRequired: string | null
    sourceUrl: string | null
  },
  ranks: {
    vectorRank?: number
    lexicalRank?: number
    vectorScore?: number
    lexicalScore?: number
  }
): RetrievalCandidate {
  return {
    ...row,
    // Rows written before source systems became generic may hold legacy values.
    sourceSystem: toSourceSystem(row.sourceSystem),
    ...ranks
  }
}

/**
 * Retrieve active, non-expired campus knowledge using hybrid pgvector + tsvector
 * retrieval and source-precedence ranking.
 */
export async function retrieveCampusKnowledge(
  params: RetrieveCampusKnowledgeParams
): Promise<RankedKnowledgeHit[]> {
  const trimmedQuery = params.query.trim()
  if (!trimmedQuery) return []

  const now = params.now ?? new Date()
  const limit = Math.max(1, Math.min(20, params.limit ?? 6))
  const candidateLimit = Math.max(20, limit * 4)

  try {
    const queryEmbedding = await generateQueryEmbedding(trimmedQuery)
    const whereClause = buildDocumentFilters(params, now)

    const baseSelect = {
      chunkId: knowledgeChunks.id,
      documentId: knowledgeChunks.documentId,
      chunkIndex: knowledgeChunks.chunkIndex,
      heading: knowledgeChunks.heading,
      content: knowledgeChunks.content,
      containsTable: knowledgeChunks.containsTable,
      title: knowledgeDocuments.title,
      domain: knowledgeDocuments.domain,
      sourceSystem: knowledgeDocuments.sourceSystem,
      authority: knowledgeDocuments.authority,
      program: knowledgeDocuments.program,
      semester: knowledgeDocuments.semester,
      squad: knowledgeDocuments.squad,
      residency: knowledgeDocuments.residency,
      priority: knowledgeDocuments.priority,
      status: knowledgeDocuments.status,
      channel: knowledgeDocuments.channel,
      effectiveDate: knowledgeDocuments.effectiveDate,
      expiresAt: knowledgeDocuments.expiresAt,
      capturedAt: knowledgeDocuments.capturedAt,
      actionRequired: knowledgeDocuments.actionRequired,
      sourceUrl: knowledgeDocuments.sourceUrl
    }

    const vectorPromise = queryEmbedding
      ? db
          .select({
            ...baseSelect,
            distance: cosineDistance(knowledgeChunks.embedding, queryEmbedding)
          })
          .from(knowledgeChunks)
          .innerJoin(
            knowledgeDocuments,
            eq(knowledgeChunks.documentId, knowledgeDocuments.id)
          )
          .where(
            and(whereClause, sql`${knowledgeChunks.embedding} IS NOT NULL`)
          )
          .orderBy(cosineDistance(knowledgeChunks.embedding, queryEmbedding))
          .limit(candidateLimit)
          .catch(error => {
            console.warn(
              '[RAG] Vector query failed, continuing with FTS:',
              error
            )
            return []
          })
      : Promise.resolve([])

    const tsQueryExpr = sql`websearch_to_tsquery('english', ${trimmedQuery})`
    const lexicalPromise = db
      .select({
        ...baseSelect,
        rank: sql<number>`ts_rank_cd(${knowledgeChunks.searchVector}, ${tsQueryExpr})`
      })
      .from(knowledgeChunks)
      .innerJoin(
        knowledgeDocuments,
        eq(knowledgeChunks.documentId, knowledgeDocuments.id)
      )
      .where(
        and(
          whereClause,
          or(
            sql`${knowledgeChunks.searchVector} @@ ${tsQueryExpr}`,
            ilike(knowledgeChunks.content, `%${trimmedQuery}%`),
            ilike(knowledgeDocuments.title, `%${trimmedQuery}%`)
          )
        )
      )
      .orderBy(
        desc(sql`ts_rank_cd(${knowledgeChunks.searchVector}, ${tsQueryExpr})`),
        desc(knowledgeDocuments.priority),
        desc(knowledgeDocuments.effectiveDate)
      )
      .limit(candidateLimit)
      .catch(error => {
        console.warn('[RAG] Lexical query failed:', error)
        return []
      })

    const [vectorRows, lexicalRows] = await Promise.all([
      vectorPromise,
      lexicalPromise
    ])

    const candidateMap = new Map<string, RetrievalCandidate>()

    vectorRows.forEach((row, index) => {
      const distance = Number(row.distance ?? 1)
      candidateMap.set(
        row.chunkId,
        mapJoinedRow(row, {
          vectorRank: index + 1,
          vectorScore: Math.max(0, 1 - distance)
        })
      )
    })

    lexicalRows.forEach((row, index) => {
      const existing = candidateMap.get(row.chunkId)
      const lexicalScore = Number(row.rank ?? 0)
      if (existing) {
        existing.lexicalRank = index + 1
        existing.lexicalScore = lexicalScore
      } else {
        candidateMap.set(
          row.chunkId,
          mapJoinedRow(row, {
            lexicalRank: index + 1,
            lexicalScore
          })
        )
      }
    })

    return fuseAndRankChunks(Array.from(candidateMap.values()), {
      cohort: params.cohort,
      limit,
      now,
      directory: params.directory
    })
  } catch (error) {
    console.warn(
      '[RAG] Campus knowledge retrieval unavailable:',
      error instanceof Error ? error.message : String(error)
    )
    return []
  }
}

export function normalizeCampusEventHit(
  row: {
    id: string
    title: string
    organizer: string
    authority: KnowledgeAuthority
    category: string | null
    startAt: Date
    endAt: Date | null
    venue: string | null
    campusLocation: string | null
    onlineUrl: string | null
    registrationUrl: string | null
    registrationDeadline: Date | null
    eligibility: string | null
    guidelines: string | null
    resultsSummary: string | null
    resultsUrl: string | null
    sourceUrl: string | null
    status: CampusEventStatus
  },
  now: Date = new Date()
): CampusEventHit {
  const deadlinePassed =
    row.registrationDeadline !== null &&
    row.registrationDeadline.getTime() <= now.getTime()
  const isCompletedOrCancelled =
    row.status === 'completed' || row.status === 'cancelled'
  const isRegistrationOpen = !deadlinePassed && !isCompletedOrCancelled

  const registrationUrl =
    isRegistrationOpen && isValidHttpUrl(row.registrationUrl)
      ? row.registrationUrl
      : null

  const citationUrl = isValidHttpUrl(row.sourceUrl)
    ? row.sourceUrl
    : isValidHttpUrl(row.resultsUrl)
      ? row.resultsUrl
      : isValidHttpUrl(registrationUrl)
        ? registrationUrl
        : isValidHttpUrl(row.onlineUrl)
          ? row.onlineUrl
          : buildCanonicalKnowledgeUrl(row.id, row.authority, null)

  return {
    ...row,
    isRegistrationOpen,
    registrationUrl,
    citationUrl
  }
}

/**
 * Date-aware structured query over `campus_events`.
 * Automatically suppresses expired registration links once `registrationDeadline` passes.
 */
export async function retrieveCampusEvents(
  params: RetrieveCampusEventsParams = {}
): Promise<CampusEventHit[]> {
  const now = params.now ?? new Date()
  const limit = Math.max(1, Math.min(25, params.limit ?? 10))

  try {
    const conditions = []
    if (params.colleges) {
      conditions.push(
        params.colleges.length > 0
          ? inArray(campusEvents.college, params.colleges)
          : sql`false`
      )
    }
    if (params.status && params.status !== 'all') {
      conditions.push(eq(campusEvents.status, params.status))
    } else if (!params.includeCompleted) {
      conditions.push(
        or(
          eq(campusEvents.status, 'upcoming'),
          eq(campusEvents.status, 'ongoing')
        )
      )
    }

    const q = params.query?.trim()
    if (q) {
      conditions.push(
        or(
          ilike(campusEvents.title, `%${q}%`),
          ilike(campusEvents.organizer, `%${q}%`),
          ilike(campusEvents.category, `%${q}%`),
          ilike(campusEvents.venue, `%${q}%`),
          ilike(campusEvents.guidelines, `%${q}%`)
        )
      )
    }

    const rows = await db
      .select()
      .from(campusEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(campusEvents.startAt))
      .limit(limit)

    return rows.map(row => normalizeCampusEventHit(row, now))
  } catch (error) {
    console.warn(
      '[RAG] Campus events retrieval unavailable:',
      error instanceof Error ? error.message : String(error)
    )
    return []
  }
}

/**
 * Deterministic lookup from `official_portals`, falling back to
 * `DEFAULT_OFFICIAL_PORTALS` if the DB is empty or unreachable.
 */
export async function retrieveOfficialPortals(
  options: {
    query?: string
    authority?: KnowledgeAuthority
    portalKey?: string
    colleges?: CollegeSlug[]
  } = {}
): Promise<OfficialPortalRecord[]> {
  const colleges = options.colleges
  try {
    const rows = await db
      .select({
        id: officialPortals.id,
        college: officialPortals.college,
        portalKey: officialPortals.portalKey,
        name: officialPortals.name,
        authority: officialPortals.authority,
        url: officialPortals.url,
        requiresLogin: officialPortals.requiresLogin,
        capabilities: officialPortals.capabilities,
        navigationSteps: officialPortals.navigationSteps,
        supportContact: officialPortals.supportContact,
        lastVerifiedAt: officialPortals.lastVerifiedAt
      })
      .from(officialPortals)
      .where(
        colleges
          ? colleges.length > 0
            ? inArray(officialPortals.college, colleges)
            : sql`false`
          : undefined
      )
      .orderBy(asc(officialPortals.portalKey))

    if (rows.length > 0) {
      return matchPortalsFromList(rows, options)
    }
  } catch (error) {
    console.warn(
      '[RAG] Official portals DB query failed, using verified static registry:',
      error instanceof Error ? error.message : String(error)
    )
  }

  return matchPortalsFromList(
    colleges
      ? DEFAULT_OFFICIAL_PORTALS.filter(p => colleges.includes(p.college))
      : DEFAULT_OFFICIAL_PORTALS,
    options
  )
}
