import { NextRequest, NextResponse } from 'next/server'

import { getCollegeIdentityFromEmail, normalizeEmail } from '@/lib/auth/domain'
import {
  type CollegeDirectory,
  type CollegeSlug,
  isCollegeSlug
} from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'
import type { KnowledgeSenderRole } from '@/lib/db/schema'
import { ingestUrgentUpdate } from '@/lib/rag/ingestion'
import type { UrgentAttachmentInput } from '@/lib/rag/normalizer'

interface GChatAttachment {
  contentType?: string
  name?: string
  contentName?: string
  attachmentDataRef?: { resourceName?: string }
  downloadUri?: string
}

interface GChatWebhookPayload {
  type?: string
  token?: string
  isAnnouncementSpace?: boolean
  threadContext?: string
  text?: string
  space?: {
    name?: string
    displayName?: string
    type?: string
    spaceType?: string
    spaceThreadingState?: string
    singleUserBotDm?: boolean
  }
  user?: {
    name?: string
    displayName?: string
    email?: string
  }
  message?: {
    name?: string
    text?: string
    argumentText?: string
    createTime?: string
    sender?: {
      name?: string
      displayName?: string
      email?: string
    }
    thread?: {
      name?: string
      threadKey?: string
    }
    attachment?: GChatAttachment[]
    annotations?: Array<{ type?: string }>
  }
}

const CAPTURE_TRIGGER_PATTERN = /(?:@sera\b|\/capture\b)/i
const CAPTURE_TRIGGER_STRIP_PATTERN = /(?:@sera(?:\s+capture)?\b|\/capture\b)/gi
const ANNOUNCEMENT_SPACE_NAME_PATTERN =
  /\b(?:announcement|announcements|notice|notices|updates?|official)\b/i

function verifyWebhookSecret(
  request: NextRequest,
  bodyToken?: string
): boolean {
  const expected = process.env.GCHAT_WEBHOOK_SECRET?.trim()
  if (!expected) return true

  const authHeader = request.headers.get('authorization')?.trim()
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : undefined
  const headerSecret = request.headers.get('x-gchat-webhook-secret')?.trim()

  return (
    bearerToken === expected ||
    headerSecret === expected ||
    bodyToken?.trim() === expected
  )
}

function isBroadcastSpace(payload: GChatWebhookPayload): boolean {
  if (payload.isAnnouncementSpace === true) return true
  const space = payload.space
  if (!space) return false
  if (space.singleUserBotDm) return true
  if (
    space.displayName &&
    ANNOUNCEMENT_SPACE_NAME_PATTERN.test(space.displayName)
  ) {
    return true
  }
  return false
}

/**
 * The college whose knowledge base a Google Chat space feeds: the college
 * that lists the space (`spaces/...`) in its `gchatSpaces`, else the
 * deployment-wide `SERA_GCHAT_COLLEGE`. Null when neither applies.
 */
function getGchatCollege(
  directory: CollegeDirectory,
  spaceName: string | undefined
): CollegeSlug | null {
  if (spaceName) {
    const owner = directory.list.find(college =>
      college.gchatSpaces.includes(spaceName)
    )
    if (owner) return owner.slug
  }
  const configured = process.env.SERA_GCHAT_COLLEGE?.trim().toLowerCase()
  return isCollegeSlug(directory, configured) ? configured : null
}

export async function POST(request: NextRequest) {
  let payload: GChatWebhookPayload
  try {
    payload = (await request.json()) as GChatWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!verifyWebhookSecret(request, payload.token)) {
    return NextResponse.json(
      { error: 'Unauthorized Google Chat webhook request' },
      { status: 401 }
    )
  }

  if (payload.type === 'ADDED_TO_SPACE') {
    return NextResponse.json({
      text: 'SERA Urgent Updates capture is active. Post announcements here or tag @SERA capture in mixed spaces.'
    })
  }

  if (payload.type && payload.type !== 'MESSAGE') {
    return NextResponse.json({
      ok: true,
      status: 'ignored',
      reason: `Ignored event type: ${payload.type}`
    })
  }

  const rawText =
    payload.message?.argumentText ?? payload.message?.text ?? payload.text ?? ''
  const announcementSpace = isBroadcastSpace(payload)
  const hasExplicitTrigger =
    CAPTURE_TRIGGER_PATTERN.test(payload.message?.text ?? '') ||
    CAPTURE_TRIGGER_PATTERN.test(rawText) ||
    Boolean(payload.message?.annotations?.some(a => a.type === 'USER_MENTION'))

  if (!announcementSpace && !hasExplicitTrigger) {
    return NextResponse.json({
      ok: true,
      status: 'ignored',
      reason: 'Casual message in non-announcement space without @SERA capture'
    })
  }

  const cleanedText = rawText.replace(CAPTURE_TRIGGER_STRIP_PATTERN, '').trim()
  const attachments: UrgentAttachmentInput[] = (
    payload.message?.attachment ?? []
  )
    .filter(att => Boolean(att.downloadUri && att.contentType))
    .map(att => ({
      mediaType: att.contentType || 'application/octet-stream',
      data: att.downloadUri!,
      filename: att.contentName || att.name
    }))

  if (!cleanedText && attachments.length === 0) {
    return NextResponse.json({
      ok: true,
      status: 'ignored',
      reason: 'Empty message payload'
    })
  }

  const senderEmail =
    normalizeEmail(payload.message?.sender?.email ?? payload.user?.email) ??
    undefined
  const senderName =
    payload.message?.sender?.displayName ??
    payload.user?.displayName ??
    undefined

  // Each space feeds exactly one college's knowledge base.
  const directory = await getCollegeDirectory()
  const college = getGchatCollege(directory, payload.space?.name)
  if (!college) {
    return NextResponse.json({
      ok: true,
      status: 'ignored',
      reason: 'This Google Chat space is not linked to a college'
    })
  }
  const senderIdentity = getCollegeIdentityFromEmail(senderEmail, directory)

  let senderRole: KnowledgeSenderRole = 'student_cr'
  if (
    senderIdentity?.userType === 'mentor' &&
    senderIdentity.college === college
  ) {
    senderRole = 'mentor'
  } else if (announcementSpace) {
    senderRole = 'official_space'
  }

  const capturedAt = payload.message?.createTime
    ? new Date(payload.message.createTime)
    : new Date()

  const result = await ingestUrgentUpdate({
    college,
    rawText: cleanedText,
    channel: 'gchat',
    senderRole,
    senderEmail,
    senderName,
    threadContext:
      payload.threadContext ??
      (payload.space?.displayName
        ? `Space: ${payload.space.displayName}`
        : undefined),
    capturedAt: Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt,
    attachments
  })

  if (result.status === 'discarded') {
    return NextResponse.json({
      ok: true,
      status: 'discarded',
      reason: result.discardReason,
      text: `Ignored (${result.discardReason ?? 'noise or PII filtered'}).`
    })
  }

  if (result.status === 'deduplicated') {
    return NextResponse.json({
      ok: true,
      status: 'deduplicated',
      documentId: result.document?.id ?? null,
      text: 'This announcement was already captured in SERA.'
    })
  }

  if (result.status === 'pending_review') {
    return NextResponse.json({
      ok: true,
      status: 'pending_review',
      documentId: result.document?.id ?? null,
      text: `Queued for 1-tap Mentor approval in /mentor: "${result.document?.title ?? result.normalized.title}".`
    })
  }

  return NextResponse.json({
    ok: true,
    status: 'published',
    documentId: result.document?.id ?? null,
    supersededCount: result.supersededDocumentIds?.length ?? 0,
    text: `Urgent update live in SERA: "${result.document?.title ?? result.normalized.title}".`
  })
}
