import { describe, expect, it } from 'vitest'

import {
  computeContentHash,
  inferAuthority,
  normalizeUrgentUpdateInput,
  resolveSenderTrustGate
} from '../normalizer'

describe('computeContentHash', () => {
  it('normalizes whitespace and casing for cross-channel deduplication', () => {
    const whatsappHash = computeContentHash(
      '  Today 2 PM   Squad 42 DSA class moved to Lab 3! ',
      '2026-11-23'
    )
    const gchatHash = computeContentHash(
      'today 2 pm squad 42 dsa class moved to\nlab 3!',
      '2026-11-23'
    )
    expect(whatsappHash).toBe(gchatHash)
  })
})

describe('resolveSenderTrustGate', () => {
  it('auto-publishes mentor and official broadcast space messages', () => {
    expect(resolveSenderTrustGate('mentor', 'ananya@kalvium.com')).toEqual({
      autoPublish: true,
      status: 'active',
      priority: 'urgent'
    })
    expect(resolveSenderTrustGate('official_space')).toEqual({
      autoPublish: true,
      status: 'active',
      priority: 'urgent'
    })
  })

  it('routes student CR forwards to pending_review queue', () => {
    expect(
      resolveSenderTrustGate('student_cr', 'cr@kalvium.community')
    ).toEqual({
      autoPublish: false,
      status: 'pending_review',
      priority: 'urgent'
    })
  })
})

describe('normalizeUrgentUpdateInput', () => {
  it('discards casual noise chatter', async () => {
    const result = await normalizeUrgentUpdateInput({
      rawText: 'ok thanks',
      channel: 'gchat',
      senderRole: 'student_cr',
      skipLlm: true
    })

    expect(result.discarded).toBe(true)
    expect(result.intent).toBe('noise')
  })

  it('rejects messages containing personal per-student PII', async () => {
    const result = await normalizeUrgentUpdateInput({
      rawText:
        'Enrollment No 24BTECH0012 has attendance 62% and fee due INR 45000',
      channel: 'whatsapp_forward',
      senderRole: 'mentor',
      skipLlm: true
    })

    expect(result.discarded).toBe(true)
    expect(result.containsPersonalStudentData).toBe(true)
  })

  it('auto-publishes mentor timetable update with cohort tags and ephemeral TTL', async () => {
    const capturedAt = new Date('2026-11-23T09:00:00.000Z')
    const result = await normalizeUrgentUpdateInput({
      college: 'kalvium',
      rawText:
        'Squad 42 Sem 3 B.Tech CSE: Today 2 PM DSA session shifted from Room B-104 to Lab 3.',
      channel: 'whatsapp_forward',
      senderRole: 'mentor',
      senderEmail: 'mentor@kalvium.com',
      capturedAt,
      skipLlm: true
    })

    expect(result.discarded).toBe(false)
    expect(result.status).toBe('active')
    expect(result.priority).toBe('urgent')
    expect(result.domain).toBe('timetables')
    expect(result.authority).toBe('kalvium')
    expect(result.squad).toBe('42')
    expect(result.semester).toBe('3')
    expect(result.supersedesTopic).toContain('Room B-104')
    expect(result.expiresAt).not.toBeNull()
    expect(result.expiresAt!.getTime()).toBeGreaterThan(capturedAt.getTime())
  })

  it('queues student CR forward as pending_review', async () => {
    const result = await normalizeUrgentUpdateInput({
      rawText:
        'JECRC End-Sem Exam Form deadline extended to Nov 30 on E-Notice portal.',
      channel: 'whatsapp_forward',
      senderRole: 'student_cr',
      senderEmail: 'student.cr@kalvium.community',
      skipLlm: true
    })

    expect(result.discarded).toBe(false)
    expect(result.status).toBe('pending_review')
    expect(result.domain).toBe('examinations')
    expect(result.authority).toBe('jecrc')
  })

  it('attributes updates to the college named by its aliases', () => {
    expect(inferAuthority('JECRC exam form deadline extended', 'kalvium')).toBe(
      'jecrc'
    )
    expect(
      inferAuthority('Kalvium and JECRC University joint holiday', 'kalvium')
    ).toBe('joint')
    // Colleges outside the posting college's view are never chosen.
    expect(inferAuthority('IIT Bombay hackathon', 'kalvium')).toBe('kalvium')
    expect(inferAuthority('Notice from IIT KGP hall council', undefined)).toBe(
      'iitkgp'
    )
    expect(inferAuthority('B. K. Birla convocation', undefined)).toBe('bkbirla')
    expect(inferAuthority('library timings changed', 'jnu')).toBe('jnu')
  })
})
