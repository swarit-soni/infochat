import { generateText, Output } from 'ai'
import { createHash } from 'crypto'
import { z } from 'zod'

import { getCollegeIdentityFromEmail } from '@/lib/auth/domain'
import {
  COLLEGE_SLUGS,
  COLLEGES,
  type CollegeSlug,
  getVisibleColleges
} from '@/lib/colleges/registry'
import {
  KNOWLEDGE_AUTHORITIES,
  KNOWLEDGE_DOMAINS,
  type KnowledgeAuthority,
  type KnowledgeChannel,
  type KnowledgeDomain,
  type KnowledgePriority,
  type KnowledgeSenderRole,
  type KnowledgeSourceSystem,
  type KnowledgeStatus
} from '@/lib/db/schema'
import { getModel } from '@/lib/utils/registry'

export const URGENT_INTENTS = [
  'urgent_notice',
  'timetable_change',
  'exam_update',
  'fee_deadline',
  'event',
  'noise'
] as const

export type UrgentIntent = (typeof URGENT_INTENTS)[number]

export interface UrgentAttachmentInput {
  mediaType: string
  data: string | Uint8Array
  filename?: string
}

export interface NormalizeUrgentUpdateInput {
  /**
   * College the update is posted to. Scopes the sender trust gate (only that
   * college's mentors auto-publish) and authority inference.
   */
  college?: CollegeSlug
  rawText: string
  channel: Extract<KnowledgeChannel, 'gchat' | 'whatsapp_forward'>
  senderRole: KnowledgeSenderRole
  senderEmail?: string
  senderName?: string
  threadContext?: string
  sourceUrl?: string
  capturedAt?: Date
  attachments?: UrgentAttachmentInput[]
  /** Override to force deterministic heuristic extraction (e.g. in unit tests). */
  skipLlm?: boolean
}

export interface SenderTrustGateDecision {
  autoPublish: boolean
  status: KnowledgeStatus
  priority: KnowledgePriority
}

export interface NormalizedUrgentUpdateResult {
  discarded: boolean
  discardReason?: string
  intent: UrgentIntent
  containsPersonalStudentData: boolean
  contentHash: string
  channel: Extract<KnowledgeChannel, 'gchat' | 'whatsapp_forward'>
  sourceSystem: Extract<
    KnowledgeSourceSystem,
    'gchat_space' | 'whatsapp_forward'
  >
  senderRole: KnowledgeSenderRole
  capturedAt: Date
  status: KnowledgeStatus
  priority: KnowledgePriority
  title: string
  normalizedMarkdown: string
  domain: KnowledgeDomain
  authority: KnowledgeAuthority
  program: string | null
  semester: string | null
  squad: string | null
  residency: string | null
  effectiveDate: Date
  expiresAt: Date | null
  actionRequired: string | null
  supersedesTopic: string | null
}

export const urgentExtractionSchema = z.object({
  intent: z.enum(URGENT_INTENTS),
  containsPersonalStudentData: z.boolean(),
  title: z.string().min(1),
  normalizedMarkdown: z.string().min(1),
  domain: z.enum(KNOWLEDGE_DOMAINS),
  authority: z.enum(KNOWLEDGE_AUTHORITIES),
  program: z.string().nullable(),
  semester: z.string().nullable(),
  squad: z.string().nullable(),
  residency: z.string().nullable(),
  effectiveDateIso: z.string().nullable(),
  expiresAtIso: z.string().nullable(),
  actionRequired: z.string().nullable(),
  supersedesTopic: z.string().nullable()
})

export type UrgentExtractionOutput = z.infer<typeof urgentExtractionSchema>

const NOISE_ONLY_PATTERN =
  /^(?:hi+|hello+|hey+|ok(?:ay)?|thanks?(?:\s+you)?|ty|noted|sure|yes|no|cool|good\s+(?:morning|afternoon|evening|night)|gm|gn|👍|🙏|\+1)[.!?\s]*$/i

const PERSONAL_PII_PATTERNS: RegExp[] = [
  /\b(?:enrollment|roll)\s*(?:no|number|id)?\s*[:#-]?\s*[a-z0-9]{6,}\b.*\b(?:marks|cgpa|sgpa|gpa|grade|attendance\s*[:=]?\s*\d{1,3}%|fee\s*(?:due|balance|paid)|phone|mobile)\b/i,
  /\b(?:aadhaar|pan\s*card|bank\s*account|password|otp)\b/i,
  /\bmy\s+(?:attendance|marks|cgpa|sgpa|fee\s+balance)\s+is\b/i
]

const URGENT_SIGNAL_PATTERN =
  /\b(?:exam|test|quiz|fee|tuition|hostel|bus|timetable|schedule|class|session|cancel(?:led)?|rescheduled|postponed|room|lab|hall\s*ticket|admit\s*card|deadline|notice|circular|event|hackathon|workshop|registration|submit|submission|result|kalvium|jecrc|squad|semester)\b/i

/**
 * Compute a stable SHA-256 content hash for deduplicating announcements
 * across WhatsApp forwards and Google Chat spaces.
 */
export function computeContentHash(
  content: string,
  timeWindowBucket?: string
): string {
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim()
  const payload = timeWindowBucket
    ? `${timeWindowBucket}::${normalized}`
    : normalized
  return createHash('sha256').update(payload).digest('hex')
}

/**
 * Resolve whether an incoming message auto-publishes (`active`) or requires
 * mentor review (`pending_review`).
 */
export function resolveSenderTrustGate(
  senderRole: KnowledgeSenderRole,
  senderEmail?: string,
  college?: CollegeSlug
): SenderTrustGateDecision {
  const identity = getCollegeIdentityFromEmail(senderEmail)
  const isMentorEmail =
    identity?.userType === 'mentor' &&
    (college === undefined || identity.college === college)

  if (
    senderRole === 'mentor' ||
    senderRole === 'official_space' ||
    isMentorEmail
  ) {
    return {
      autoPublish: true,
      status: 'active',
      priority: 'urgent'
    }
  }

  return {
    autoPublish: false,
    status: 'pending_review',
    priority: 'urgent'
  }
}

function parseOptionalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function computeDefaultExpiry(
  intent: UrgentIntent,
  baseDate: Date
): Date | null {
  const baseMs = baseDate.getTime()
  switch (intent) {
    case 'timetable_change':
      return new Date(baseMs + 48 * 60 * 60 * 1000)
    case 'urgent_notice':
      return new Date(baseMs + 72 * 60 * 60 * 1000)
    case 'fee_deadline':
    case 'exam_update':
    case 'event':
      return new Date(baseMs + 14 * 24 * 60 * 60 * 1000)
    default:
      return null
  }
}

function inferDomainAndIntent(text: string): {
  domain: KnowledgeDomain
  intent: UrgentIntent
} {
  const lower = text.toLowerCase()
  if (
    /\b(?:fee|tuition|hostel\s*fee|installment|challan|payment|late\s*fee)\b/.test(
      lower
    )
  ) {
    return { domain: 'fees', intent: 'fee_deadline' }
  }
  if (
    /\b(?:exam|backlog|supplementary|hall\s*ticket|admit\s*card|re-?eval|end\s*sem|mid\s*sem|assessment)\b/.test(
      lower
    )
  ) {
    return { domain: 'examinations', intent: 'exam_update' }
  }
  if (
    /\b(?:timetable|room|lab\s*\d+|slot|class\s*cancel|rescheduled|postponed|shifted\s+to|venue\s*change)\b/.test(
      lower
    )
  ) {
    return { domain: 'timetables', intent: 'timetable_change' }
  }
  if (
    /\b(?:event|hackathon|fest|workshop|club|seminar|eventum|registration\s*open)\b/.test(
      lower
    )
  ) {
    return { domain: 'activities', intent: 'event' }
  }
  if (/\b(?:admission|counseling|eligibility|cutoff)\b/.test(lower)) {
    return { domain: 'admissions', intent: 'urgent_notice' }
  }
  if (
    /\b(?:curriculum|learning\s*unit|assignment|project|mentor|squad)\b/.test(
      lower
    )
  ) {
    return { domain: 'academics', intent: 'urgent_notice' }
  }
  return { domain: 'general', intent: 'urgent_notice' }
}

const AUTHORITY_KEYWORDS: Record<CollegeSlug, RegExp> = {
  kalvium: /\b(?:kalvium|squad|mentor|learning\s*unit|dashboard)\b/,
  jecrc: /\b(?:jecrc|university|erp|e-?notice|registrar|exam\s*cell|hostel)\b/,
  bkbirla: /\b(?:b\.?\s*k\.?\s*birla|bkbc|birla\s*college|kalyan)\b/
}

/**
 * Which college issued a message, judged from the colleges visible to the
 * posting college: exactly one mentioned → that college; several →
 * `joint`; none → the posting college (or `joint` when it is unknown).
 */
function inferAuthority(
  text: string,
  college?: CollegeSlug
): KnowledgeAuthority {
  const lower = text.toLowerCase()
  const candidates = college ? getVisibleColleges(college) : [...COLLEGE_SLUGS]
  const mentioned = candidates.filter(slug =>
    AUTHORITY_KEYWORDS[slug].test(lower)
  )
  if (mentioned.length === 1) return mentioned[0]
  if (mentioned.length > 1) return 'joint'
  return college ?? 'joint'
}

function extractCohortHints(text: string): {
  program: string | null
  semester: string | null
  squad: string | null
  residency: string | null
} {
  const squadMatch = text.match(
    /\b(?:squad|batch)\s*[-:#]?\s*([A-Za-z0-9_-]{1,24})\b/i
  )
  const semMatch = text.match(
    /\b(?:sem(?:ester)?)\s*[-:#]?\s*(\d{1,2}|I{1,3}V?|VI{0,3})\b/i
  )
  const programMatch = text.match(/\b(B\.?\s*Tech(?:\s*CSE)?|BCA|MCA)\b/i)
  const residency = /\bhostel(?:ler|lers)?\b/i.test(text)
    ? 'hosteller'
    : /\bday\s*scholar\b/i.test(text)
      ? 'day_scholar'
      : null

  return {
    program: programMatch ? programMatch[1].replace(/\s+/g, ' ').trim() : null,
    semester: semMatch ? semMatch[1].trim() : null,
    squad: squadMatch ? squadMatch[1].trim() : null,
    residency
  }
}

function deriveTitle(text: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.length > 0)
  if (!firstLine) return 'Campus Urgent Update'
  const cleaned = firstLine
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length <= 96 ? cleaned : `${cleaned.slice(0, 93).trimEnd()}...`
}

/**
 * Deterministic fallback normalizer used when Gemini API keys are unconfigured
 * or in offline tests.
 */
export function heuristicNormalizeUrgentUpdate(
  input: NormalizeUrgentUpdateInput
): UrgentExtractionOutput {
  const combined = [input.threadContext, input.rawText]
    .filter(Boolean)
    .join('\n')
    .trim()

  const hasAttachments = Boolean(
    input.attachments && input.attachments.length > 0
  )
  const containsPersonalStudentData = PERSONAL_PII_PATTERNS.some(pattern =>
    pattern.test(combined)
  )

  const looksLikeNoise =
    !hasAttachments &&
    (NOISE_ONLY_PATTERN.test(combined) ||
      (combined.length < 20 && !URGENT_SIGNAL_PATTERN.test(combined)))

  if (looksLikeNoise) {
    return {
      intent: 'noise',
      containsPersonalStudentData,
      title: 'Ignored casual message',
      normalizedMarkdown: combined || '(empty)',
      domain: 'general',
      authority: input.college ?? 'joint',
      program: null,
      semester: null,
      squad: null,
      residency: null,
      effectiveDateIso: null,
      expiresAtIso: null,
      actionRequired: null,
      supersedesTopic: null
    }
  }

  const { domain, intent } = inferDomainAndIntent(combined)
  const authority = inferAuthority(combined, input.college)
  const cohort = extractCohortHints(combined)
  const supersedesMatch = combined.match(
    /(?:updated|revised|replaces|instead\s+of|moved\s+from|shifted\s+from)\s+([^.\n]{4,80})/i
  )

  return {
    intent,
    containsPersonalStudentData,
    title: deriveTitle(input.rawText || input.threadContext || 'Campus Notice'),
    normalizedMarkdown: combined,
    domain,
    authority,
    program: cohort.program,
    semester: cohort.semester,
    squad: cohort.squad,
    residency: cohort.residency,
    effectiveDateIso: null,
    expiresAtIso: null,
    actionRequired:
      /\b(?:submit|pay|register|report|attend|fill|bring)\b/i.test(combined)
        ? deriveTitle(combined)
        : null,
    supersedesTopic: supersedesMatch ? supersedesMatch[1].trim() : null
  }
}

async function runLlmExtraction(
  input: NormalizeUrgentUpdateInput,
  capturedAt: Date
): Promise<UrgentExtractionOutput | null> {
  if (input.skipLlm || !process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return null
  }

  try {
    const contentParts: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string | Uint8Array; mediaType?: string }
      | {
          type: 'file'
          data: string | Uint8Array
          mediaType: string
          filename?: string
        }
    > = [
      {
        type: 'text',
        text: [
          `You are SERA’s campus notice triage and multimodal extraction pipeline for ${
            input.college
              ? getVisibleColleges(input.college)
                  .map(slug => COLLEGES[slug].name)
                  .join(' and ')
              : 'the colleges on Sera'
          }.`,
          `Captured timestamp (ISO): ${capturedAt.toISOString()}`,
          `Channel: ${input.channel}`,
          input.threadContext
            ? `Thread / Parent Context:\n${input.threadContext}`
            : null,
          `Incoming Message Text:\n${input.rawText || '(no text, inspect attached image/PDF)'}`,
          '',
          'Tasks:',
          '1. Classify intent into: urgent_notice | timetable_change | exam_update | fee_deadline | event | noise.',
          '   - Use "noise" for casual banter, greetings, thanks, or off-topic student chatter.',
          '2. Set containsPersonalStudentData=true if the message contains private per-student PII (individual marks, personal fee balance, personal attendance %, phone/OTP/Aadhaar).',
          '3. Transcribe any attached notice posters, screenshots, or PDFs into clean, table-preserving Markdown inside normalizedMarkdown.',
          `4. Extract structured metadata (domain, authority: ${[
            ...(input.college
              ? getVisibleColleges(input.college)
              : COLLEGE_SLUGS),
            'joint'
          ].join(
            ' | '
          )}, cohort fields if specified, ISO effectiveDateIso/expiresAtIso when mentioned, actionRequired, and supersedesTopic if this notice updates/replaces an earlier notice).`
        ]
          .filter(Boolean)
          .join('\n')
      }
    ]

    for (const attachment of input.attachments ?? []) {
      if (attachment.mediaType.startsWith('image/')) {
        contentParts.push({
          type: 'image',
          image: attachment.data,
          mediaType: attachment.mediaType
        })
      } else {
        contentParts.push({
          type: 'file',
          data: attachment.data,
          mediaType: attachment.mediaType,
          ...(attachment.filename ? { filename: attachment.filename } : {})
        })
      }
    }

    const result = await generateText({
      model: getModel('google:gemini-3.5-flash-lite'),
      output: Output.object({
        schema: urgentExtractionSchema,
        name: 'CampusUrgentUpdateExtraction',
        description:
          'Structured triage, OCR transcription, and metadata extraction for campus updates.'
      }),
      messages: [
        {
          role: 'user',
          content: contentParts as any
        }
      ]
    })

    return result.output
  } catch (error) {
    console.warn(
      '[RAG] Gemini 3.5 Flash-Lite normalization failed, using heuristic fallback:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

/**
 * Five-stage Urgent Update & Multimodal Normalization Pipeline:
 * 1. Content-hash deduplication & provenance tagging
 * 2. Gemini 3.5 Flash-Lite triage, multimodal OCR, PII/noise filtering
 * 3. Sender trust gate (Mentor / Broadcast Space -> active, CR forward -> pending_review)
 * 4. Effective date & ephemeral TTL calculation
 */
export async function normalizeUrgentUpdateInput(
  input: NormalizeUrgentUpdateInput
): Promise<NormalizedUrgentUpdateResult> {
  const capturedAt = input.capturedAt ?? new Date()
  const dayBucket = capturedAt.toISOString().slice(0, 10)
  const hashBasis = [input.threadContext, input.rawText]
    .filter(Boolean)
    .join(' ')
    .trim()
  const contentHash = computeContentHash(hashBasis || 'attachment', dayBucket)

  const sourceSystem: NormalizedUrgentUpdateResult['sourceSystem'] =
    input.channel === 'gchat' ? 'gchat_space' : 'whatsapp_forward'

  const extracted =
    (await runLlmExtraction(input, capturedAt)) ??
    heuristicNormalizeUrgentUpdate(input)

  const trustGate = resolveSenderTrustGate(
    input.senderRole,
    input.senderEmail,
    input.college
  )
  const effectiveDate =
    parseOptionalDate(extracted.effectiveDateIso) ?? capturedAt
  const expiresAt =
    parseOptionalDate(extracted.expiresAtIso) ??
    computeDefaultExpiry(extracted.intent, effectiveDate)

  if (extracted.intent === 'noise' || extracted.containsPersonalStudentData) {
    return {
      discarded: true,
      discardReason: extracted.containsPersonalStudentData
        ? 'Contains personal per-student data (PII boundary enforced)'
        : 'Classified as casual chatter / noise',
      intent: extracted.intent,
      containsPersonalStudentData: extracted.containsPersonalStudentData,
      contentHash,
      channel: input.channel,
      sourceSystem,
      senderRole: input.senderRole,
      capturedAt,
      status: 'archived',
      priority: 'standard',
      title: extracted.title,
      normalizedMarkdown: extracted.normalizedMarkdown,
      domain: extracted.domain,
      authority: extracted.authority,
      program: extracted.program,
      semester: extracted.semester,
      squad: extracted.squad,
      residency: extracted.residency,
      effectiveDate,
      expiresAt,
      actionRequired: extracted.actionRequired,
      supersedesTopic: extracted.supersedesTopic
    }
  }

  return {
    discarded: false,
    intent: extracted.intent,
    containsPersonalStudentData: false,
    contentHash,
    channel: input.channel,
    sourceSystem,
    senderRole: input.senderRole,
    capturedAt,
    status: trustGate.status,
    priority: trustGate.priority,
    title: extracted.title,
    normalizedMarkdown: extracted.normalizedMarkdown,
    domain: extracted.domain,
    authority: extracted.authority,
    program: extracted.program,
    semester: extracted.semester,
    squad: extracted.squad,
    residency: extracted.residency,
    effectiveDate,
    expiresAt,
    actionRequired: extracted.actionRequired,
    supersedesTopic: extracted.supersedesTopic
  }
}
