import { type JSONValue, tool } from 'ai'
import { z } from 'zod'

import {
  CAMPUS_EVENT_STATUSES,
  KNOWLEDGE_AUTHORITIES,
  KNOWLEDGE_DOMAINS
} from '@/lib/db/schema'
import { recordUnansweredQuery } from '@/lib/rag/ingestion'
import {
  formatAuthorityLabel,
  retrieveCampusEvents,
  retrieveCampusKnowledge,
  retrieveOfficialPortals
} from '@/lib/rag/retrieval'
import { sliceWithoutSplittingSurrogatePair } from '@/lib/streaming/helpers/slice-without-splitting-surrogate-pair'
import type { SearchResultItem } from '@/lib/types'
import {
  assignCitationLabels,
  type CitationLabelAllocator,
  createCitationLabelAllocator
} from '@/lib/utils/citation'

import { createSearchTool } from './search'

export const OFFICIAL_WEB_DOMAINS = [
  'jecrcuniversity.edu.in',
  'kalvium.com'
] as const

export const RAG_MODEL_CONTENT_MAX_CHARACTERS = 1800

const MODEL_FACING_RESULT_FIELDS = ['url', 'title', 'content', 'label'] as const

function trimModelOutput({ output }: { output: unknown }) {
  if (!output || typeof output !== 'object') {
    return { type: 'json' as const, value: (output ?? null) as JSONValue }
  }
  const modelView: Record<string, unknown> = {
    ...(output as Record<string, unknown>)
  }
  delete modelView.state
  delete modelView.toolCallId

  if (Array.isArray(modelView.results)) {
    modelView.results = modelView.results.map(result => {
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return result
      }
      const sourceResult = result as Record<string, unknown>
      const projected: Record<string, unknown> = {}
      for (const field of MODEL_FACING_RESULT_FIELDS) {
        if (Object.hasOwn(sourceResult, field)) {
          projected[field] = sourceResult[field]
        }
      }
      if (
        typeof projected.content === 'string' &&
        projected.content.length > RAG_MODEL_CONTENT_MAX_CHARACTERS
      ) {
        projected.content = `${sliceWithoutSplittingSurrogatePair(
          projected.content,
          RAG_MODEL_CONTENT_MAX_CHARACTERS - 1
        )}…`
      }
      return projected
    })
  }

  return { type: 'json' as const, value: toJsonValue(modelView) }
}

// Tool outputs carry raw DB rows (official_portals, campus_events) whose Date
// fields are not JSON values. The AI SDK validates tool results against its
// JSON schema before the next model step, so a Date fails the whole request
// with AI_InvalidPromptError. A JSON round trip turns Dates into ISO strings
// and drops undefined fields.
function toJsonValue(value: unknown): JSONValue {
  return JSON.parse(JSON.stringify(value)) as JSONValue
}

export function filterOfficialDomains(
  requestedDomains?: string[] | null
): string[] {
  if (!requestedDomains || requestedDomains.length === 0) {
    return [...OFFICIAL_WEB_DOMAINS]
  }

  const allowed = requestedDomains
    .map(domain =>
      domain
        .trim()
        .toLowerCase()
        .replace(/^www\./, '')
    )
    .filter(domain =>
      OFFICIAL_WEB_DOMAINS.some(
        official => domain === official || domain.endsWith(`.${official}`)
      )
    )

  return allowed.length > 0 ? allowed : [...OFFICIAL_WEB_DOMAINS]
}

export function createCampusRagTools(options?: {
  labelAllocator?: CitationLabelAllocator
  labelSeed?: number
  model?: string
}) {
  const labelAllocator =
    options?.labelAllocator ??
    createCitationLabelAllocator(options?.labelSeed ?? 1)
  const officialSearchTool = createSearchTool(
    options?.model ?? 'google:gemini-3.5-flash-lite',
    { labelAllocator }
  )

  const searchCampusKnowledge = tool({
    description:
      'ALWAYS call this FIRST for Kalvium X JECRC campus questions (admissions, fees, examinations, timetables, curriculum, assessments, mentorship guides, E-Notices, and urgent WhatsApp/GChat updates). Uses hybrid semantic + full-text Postgres retrieval with source precedence and expiry filtering.',
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Focused search query about campus rules, fees, exams, timetables, or circulars'
        ),
      domain: z
        .enum(KNOWLEDGE_DOMAINS)
        .optional()
        .describe('Optional domain filter'),
      authority: z
        .enum(KNOWLEDGE_AUTHORITIES)
        .optional()
        .describe('Optional entity filter: kalvium, jecrc, or joint'),
      program: z
        .string()
        .optional()
        .describe('Optional student program filter (e.g. B.Tech CSE)'),
      semester: z
        .string()
        .optional()
        .describe('Optional semester filter (e.g. 3)'),
      squad: z.string().optional().describe('Optional Kalvium squad filter'),
      residency: z
        .string()
        .optional()
        .describe('Optional residency filter (hosteller or day_scholar)'),
      max_results: z
        .number()
        .int()
        .min(1)
        .max(15)
        .optional()
        .default(6)
        .describe(
          'Maximum number of ranked knowledge chunks to return (default 6)'
        )
    }),
    async *execute(
      {
        query,
        domain,
        authority,
        program,
        semester,
        squad,
        residency,
        max_results = 6
      },
      context
    ) {
      yield {
        state: 'searching' as const,
        query
      }

      const hits = await retrieveCampusKnowledge({
        query,
        domain,
        authority,
        cohort: { program, semester, squad, residency },
        limit: max_results
      })

      const rawResults: SearchResultItem[] = hits.map(hit => ({
        title: hit.formattedTitle,
        url: hit.citationUrl,
        content: hit.formattedContent
      }))

      const labelStart = labelAllocator.reserve(rawResults.length)
      const results = assignCitationLabels(rawResults, labelStart)

      yield {
        state: 'complete' as const,
        query,
        results,
        images: [] as string[],
        number_of_results: results.length,
        ...(context?.toolCallId ? { toolCallId: context.toolCallId } : {})
      }
    },
    toModelOutput: trimModelOutput
  })

  const queryEvents = tool({
    description:
      'Query structured Eventum campus events (upcoming hackathons, cultural/tech activities, schedules, venues, eligibility, guidelines, registration deadlines, and published results). Automatically hides expired registration links.',
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Optional event title, organizer, category, or venue keyword'
        ),
      status: z
        .enum([...CAMPUS_EVENT_STATUSES, 'all'])
        .optional()
        .default('upcoming')
        .describe('Event status filter (default: upcoming)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .default(10)
        .describe('Maximum number of events to return')
    }),
    async *execute({ query = '', status = 'upcoming', limit = 10 }, context) {
      const displayQuery = query.trim() || `campus events (${status})`
      yield {
        state: 'searching' as const,
        query: displayQuery
      }

      const events = await retrieveCampusEvents({
        query: query.trim() || undefined,
        status,
        includeCompleted: status === 'all' || status === 'completed',
        limit
      })

      const rawResults: SearchResultItem[] = events.map(event => {
        const lines = [
          `Organizer: ${event.organizer} (${formatAuthorityLabel(event.authority)})`,
          `Status: ${event.status}`,
          `Starts: ${event.startAt.toISOString()}`
        ]
        if (event.endAt) lines.push(`Ends: ${event.endAt.toISOString()}`)
        if (event.venue || event.campusLocation) {
          lines.push(
            `Venue: ${[event.venue, event.campusLocation].filter(Boolean).join(' — ')}`
          )
        }
        if (event.onlineUrl) lines.push(`Online Link: ${event.onlineUrl}`)
        if (event.registrationDeadline) {
          lines.push(
            `Registration Deadline: ${event.registrationDeadline.toISOString()} (${event.isRegistrationOpen ? 'Open' : 'Closed / Expired'})`
          )
        }
        if (event.registrationUrl) {
          lines.push(`Registration URL: ${event.registrationUrl}`)
        }
        if (event.eligibility) lines.push(`Eligibility: ${event.eligibility}`)
        if (event.guidelines) lines.push(`Guidelines: ${event.guidelines}`)
        if (event.resultsSummary) lines.push(`Results: ${event.resultsSummary}`)
        if (event.resultsUrl) lines.push(`Results URL: ${event.resultsUrl}`)

        return {
          title: `${event.title} (Eventum · ${event.status})`,
          url: event.citationUrl,
          content: lines.join('\n')
        }
      })

      const labelStart = labelAllocator.reserve(rawResults.length)
      const results = assignCitationLabels(rawResults, labelStart)

      yield {
        state: 'complete' as const,
        query: displayQuery,
        results,
        events,
        images: [] as string[],
        number_of_results: results.length,
        ...(context?.toolCallId ? { toolCallId: context.toolCallId } : {})
      }
    },
    toModelOutput: trimModelOutput
  })

  const getOfficialPortalLinks = tool({
    description:
      'Deterministic lookup from the verified official_portals registry for JECRC ERP, E-Notice, Result, Student Support, Parent Portal, and Kalvium Student Dashboard. Use whenever a student asks for personal records (attendance, grades, fee balance, dashboard progress) or official portal navigation steps.',
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Student task or portal topic (e.g. "personal attendance", "exam results", "kalvium dashboard")'
        ),
      portalKey: z
        .string()
        .optional()
        .describe(
          'Optional exact portal key (jecrc_erp, jecrc_enotice, jecrc_result, jecrc_support, jecrc_parent, kalvium_dashboard)'
        ),
      authority: z
        .enum(KNOWLEDGE_AUTHORITIES)
        .optional()
        .describe('Optional authority filter (kalvium, jecrc, or joint)')
    }),
    async *execute({ query = '', portalKey, authority }, context) {
      const displayQuery =
        query.trim() || portalKey || authority || 'official student portals'
      yield {
        state: 'searching' as const,
        query: displayQuery
      }

      const portals = await retrieveOfficialPortals({
        query: query.trim() || undefined,
        portalKey,
        authority
      })

      const rawResults: SearchResultItem[] = portals.map(portal => ({
        title: `${portal.name} (${formatAuthorityLabel(portal.authority)})`,
        url: portal.url,
        content: [
          `Portal Key: ${portal.portalKey}`,
          `Authority: ${formatAuthorityLabel(portal.authority)}`,
          `Verified URL: ${portal.url}`,
          `Login Required: ${portal.requiresLogin ? 'Yes (sign in directly on the official portal; never share credentials in chat)' : 'No'}`,
          `Capabilities: ${portal.capabilities}`,
          `Navigation Steps: ${portal.navigationSteps}`,
          portal.supportContact
            ? `Support Contact: ${portal.supportContact}`
            : null
        ]
          .filter(Boolean)
          .join('\n')
      }))

      const labelStart = labelAllocator.reserve(rawResults.length)
      const results = assignCitationLabels(rawResults, labelStart)

      yield {
        state: 'complete' as const,
        query: displayQuery,
        results,
        portals,
        images: [] as string[],
        number_of_results: results.length,
        ...(context?.toolCallId ? { toolCallId: context.toolCallId } : {})
      }
    },
    toModelOutput: trimModelOutput
  })

  const searchOfficialWeb = tool({
    description:
      'Controlled live web fallback restricted strictly to official domains (jecrcuniversity.edu.in and kalvium.com). Only call AFTER searchCampusKnowledge if no verified campus document covered the query.',
    inputSchema: z.object({
      query: z.string().describe('Official web fallback query'),
      max_results: z.number().int().min(1).max(15).optional().default(8),
      include_domains: z
        .array(z.string())
        .optional()
        .describe(
          'Optional subset of official domains (non-official domains are stripped)'
        )
    }),
    async *execute({ query, max_results = 8, include_domains }, context) {
      const allowlistedDomains = filterOfficialDomains(include_domains)
      const executeFn = officialSearchTool.execute
      if (!executeFn) {
        yield {
          state: 'complete' as const,
          query,
          results: [] as SearchResultItem[],
          images: [] as string[],
          number_of_results: 0
        }
        return
      }

      const streamOrResult = executeFn(
        {
          query,
          type: 'optimized',
          content_types: ['web'],
          max_results,
          search_depth: 'basic',
          include_domains: allowlistedDomains,
          exclude_domains: []
        },
        context
      )

      if (
        streamOrResult &&
        typeof streamOrResult === 'object' &&
        Symbol.asyncIterator in streamOrResult
      ) {
        for await (const chunk of streamOrResult) {
          if (chunk && typeof chunk === 'object' && 'state' in chunk) {
            if (chunk.state === 'complete' && Array.isArray(chunk.results)) {
              const prefixedResults = chunk.results.map(item => ({
                ...item,
                title: item.title.startsWith('[Official Web Fallback]')
                  ? item.title
                  : `[Official Web Fallback] ${item.title}`
              }))
              yield {
                ...chunk,
                results: prefixedResults,
                number_of_results: prefixedResults.length
              }
            } else {
              yield chunk
            }
          }
        }
        return
      }

      const resolved = await streamOrResult
      const isComplete =
        resolved &&
        typeof resolved === 'object' &&
        'state' in resolved &&
        resolved.state === 'complete'
      const results =
        isComplete && Array.isArray(resolved.results)
          ? resolved.results.map(item => ({
              ...item,
              title: item.title.startsWith('[Official Web Fallback]')
                ? item.title
                : `[Official Web Fallback] ${item.title}`
            }))
          : []

      yield {
        state: 'complete' as const,
        query,
        results,
        images:
          isComplete && Array.isArray(resolved.images) ? resolved.images : [],
        number_of_results: results.length,
        ...(context?.toolCallId ? { toolCallId: context.toolCallId } : {})
      }
    },
    toModelOutput: trimModelOutput
  })

  const logUnansweredQuery = tool({
    description:
      'Log a campus query gap when verified campus knowledge is missing, expired, or contradictory so Kalvium mentors can curate an authoritative answer. Always call before abstaining.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('The unanswered or ambiguous student question'),
      domain: z
        .enum(KNOWLEDGE_DOMAINS)
        .default('general')
        .describe('Domain of the unanswered query'),
      cohort: z
        .string()
        .optional()
        .describe('Optional cohort string (e.g. B.Tech CSE Sem 3 Squad 42)'),
      reason: z
        .string()
        .describe(
          'Why SERA abstained (e.g. missing circular, expired notice, conflicting source)'
        )
    }),
    async execute({ query, domain = 'general', cohort, reason }) {
      const inserted = await recordUnansweredQuery({
        query,
        domain,
        cohort: cohort ?? null,
        reason,
        kind: 'abstention'
      })

      return {
        logged: true,
        id: inserted?.id ?? null,
        query,
        domain,
        reason
      }
    }
  })

  return {
    searchCampusKnowledge,
    queryEvents,
    getOfficialPortalLinks,
    searchOfficialWeb,
    logUnansweredQuery
  }
}

const defaultCampusRagTools = createCampusRagTools()
export const searchCampusKnowledgeTool =
  defaultCampusRagTools.searchCampusKnowledge
export const queryEventsTool = defaultCampusRagTools.queryEvents
export const getOfficialPortalLinksTool =
  defaultCampusRagTools.getOfficialPortalLinks
export const searchOfficialWebTool = defaultCampusRagTools.searchOfficialWeb
export const logUnansweredQueryTool = defaultCampusRagTools.logUnansweredQuery
