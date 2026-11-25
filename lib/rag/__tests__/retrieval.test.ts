import { describe, expect, it } from 'vitest'

import { matchDefaultPortals } from '../portals-seed'
import {
  fuseAndRankChunks,
  normalizeCampusEventHit,
  type RetrievalCandidate
} from '../retrieval'

function makeCandidate(
  overrides: Partial<RetrievalCandidate>
): RetrievalCandidate {
  return {
    chunkId: 'chunk-1',
    documentId: 'doc-1',
    chunkIndex: 0,
    heading: 'General',
    content: 'Default content',
    containsTable: 0,
    title: 'Default Title',
    domain: 'examinations',
    sourceSystem: 'official_website',
    authority: 'jecrc',
    program: null,
    semester: null,
    squad: null,
    residency: null,
    priority: 'standard',
    status: 'active',
    channel: 'web_crawl',
    effectiveDate: new Date('2026-11-20T00:00:00.000Z'),
    expiresAt: null,
    capturedAt: new Date('2026-11-20T00:00:00.000Z'),
    actionRequired: null,
    sourceUrl: null,
    vectorRank: 1,
    lexicalRank: 1,
    ...overrides
  }
}

describe('fuseAndRankChunks', () => {
  it('ranks active urgent updates above E-Notices, Kalvium guides, and public web', () => {
    const now = new Date('2026-11-23T12:00:00.000Z')
    const webDoc = makeCandidate({
      chunkId: 'c-web',
      documentId: 'd-web',
      title: 'Old Website Page',
      sourceSystem: 'official_website',
      priority: 'standard'
    })
    const enoticeDoc = makeCandidate({
      chunkId: 'c-notice',
      documentId: 'd-notice',
      title: 'Official Exam Circular',
      sourceSystem: 'official_notice',
      priority: 'standard'
    })
    const urgentDoc = makeCandidate({
      chunkId: 'c-urgent',
      documentId: 'd-urgent',
      title: 'Urgent Room Shift',
      sourceSystem: 'gchat_space',
      channel: 'gchat',
      priority: 'urgent',
      expiresAt: new Date('2026-11-24T12:00:00.000Z')
    })

    const ranked = fuseAndRankChunks([webDoc, enoticeDoc, urgentDoc], {
      now,
      limit: 5
    })

    expect(ranked.map(r => r.chunkId)).toEqual([
      'c-urgent',
      'c-notice',
      'c-web'
    ])
    expect(ranked[0].provenanceBadge).toContain('Urgent Update')
    expect(ranked[0].citationUrl).toMatch(/^https:\/\//)
  })

  it('filters out expired and non-active documents', () => {
    const now = new Date('2026-11-23T12:00:00.000Z')
    const expired = makeCandidate({
      chunkId: 'c-expired',
      expiresAt: new Date('2026-11-23T10:00:00.000Z')
    })
    const superseded = makeCandidate({
      chunkId: 'c-superseded',
      status: 'superseded'
    })
    const pending = makeCandidate({
      chunkId: 'c-pending',
      status: 'pending_review'
    })
    const active = makeCandidate({
      chunkId: 'c-active',
      status: 'active',
      expiresAt: new Date('2026-11-25T12:00:00.000Z')
    })

    const ranked = fuseAndRankChunks([expired, superseded, pending, active], {
      now
    })
    expect(ranked.map(r => r.chunkId)).toEqual(['c-active'])
  })

  it('boosts cohort-specific documents matching the requested student cohort', () => {
    const generic = makeCandidate({
      chunkId: 'c-generic',
      documentId: 'd-generic',
      sourceSystem: 'official_guide',
      authority: 'kalvium',
      squad: null
    })
    const squadSpecific = makeCandidate({
      chunkId: 'c-squad42',
      documentId: 'd-squad42',
      sourceSystem: 'official_guide',
      authority: 'kalvium',
      squad: 'Squad 42'
    })

    const ranked = fuseAndRankChunks([generic, squadSpecific], {
      cohort: { squad: 'Squad 42' }
    })
    expect(ranked[0].chunkId).toBe('c-squad42')
  })
})

describe('normalizeCampusEventHit', () => {
  it('suppresses expired registration links once registrationDeadline passes', () => {
    const now = new Date('2026-11-23T12:00:00.000Z')
    const event = normalizeCampusEventHit(
      {
        id: 'evt-1',
        title: 'AI Buildathon',
        organizer: 'Kalvium',
        authority: 'kalvium',
        category: 'Hackathon',
        startAt: new Date('2026-11-25T09:00:00.000Z'),
        endAt: null,
        venue: 'Auditorium',
        campusLocation: 'JECRC',
        onlineUrl: null,
        registrationUrl: 'https://kalvium.com/events/buildathon/register',
        registrationDeadline: new Date('2026-11-22T23:59:00.000Z'),
        eligibility: 'All students',
        guidelines: 'Teams of 3',
        resultsSummary: null,
        resultsUrl: null,
        sourceUrl: 'https://kalvium.com/events/buildathon',
        status: 'upcoming'
      },
      now
    )

    expect(event.isRegistrationOpen).toBe(false)
    expect(event.registrationUrl).toBeNull()
    expect(event.citationUrl).toBe('https://kalvium.com/events/buildathon')
  })
})

describe('matchDefaultPortals', () => {
  it('deterministically resolves ERP and Kalvium dashboard portals', () => {
    const erp = matchDefaultPortals('check my personal attendance percentage')
    expect(erp[0].portalKey).toBe('jecrc_erp')

    const kalvium = matchDefaultPortals(
      'book 1:1 mentor and view learning units'
    )
    expect(kalvium[0].portalKey).toBe('kalvium_dashboard')
  })
})
