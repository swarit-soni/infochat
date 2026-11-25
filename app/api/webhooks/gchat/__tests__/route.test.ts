import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ingestUrgentUpdate: vi.fn()
}))

vi.mock('@/lib/colleges/store', async () =>
  (await import('@/lib/colleges/testing')).collegeStoreMock()
)
vi.mock('@/lib/rag/ingestion', () => ({
  ingestUrgentUpdate: mocks.ingestUrgentUpdate
}))

import { POST } from '../route'

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/webhooks/gchat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  })
}

describe('POST /api/webhooks/gchat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    delete process.env.GCHAT_WEBHOOK_SECRET
    // This deployment's spaces feed Kalvium's knowledge base.
    vi.stubEnv('SERA_GCHAT_COLLEGE', 'kalvium')
  })

  it('ignores spaces that are not linked to any college', async () => {
    vi.stubEnv('SERA_GCHAT_COLLEGE', '')
    const res = await POST(
      buildRequest({
        type: 'MESSAGE',
        space: {
          name: 'spaces/unknown',
          displayName: 'Official Announcements'
        },
        message: {
          text: 'Exam postponed to Monday.',
          sender: { email: 'mentor@kalvium.com' }
        }
      })
    )
    const json = await res.json()
    expect(json.status).toBe('ignored')
    expect(json.reason).toContain('not linked to a college')
    expect(mocks.ingestUrgentUpdate).not.toHaveBeenCalled()
  })

  it('rejects requests with invalid secret when GCHAT_WEBHOOK_SECRET is configured', async () => {
    process.env.GCHAT_WEBHOOK_SECRET = 'top-secret'
    const res = await POST(
      buildRequest({ type: 'MESSAGE', message: { text: 'test' } })
    )
    expect(res.status).toBe(401)
  })

  it('ignores casual messages in non-announcement spaces without @SERA trigger', async () => {
    const res = await POST(
      buildRequest({
        type: 'MESSAGE',
        space: { displayName: 'Casual Squad Chat' },
        message: {
          text: 'anyone going to canteen?',
          sender: { email: 'student@kalvium.community' }
        }
      })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.status).toBe('ignored')
    expect(mocks.ingestUrgentUpdate).not.toHaveBeenCalled()
  })

  it('auto-publishes announcements from @kalvium.com mentors inside announcement spaces', async () => {
    mocks.ingestUrgentUpdate.mockResolvedValue({
      status: 'published',
      document: { id: 'doc-123', title: 'Lab 3 Room Shift' },
      supersededDocumentIds: []
    })

    const res = await POST(
      buildRequest({
        type: 'MESSAGE',
        space: { displayName: 'Kalvium JECRC Official Announcements' },
        message: {
          text: 'Today 2 PM DSA class shifted to Lab 3.',
          sender: {
            email: 'mentor@kalvium.com',
            displayName: 'Ananya'
          }
        }
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('published')
    expect(mocks.ingestUrgentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'gchat',
        senderRole: 'mentor',
        senderEmail: 'mentor@kalvium.com'
      })
    )
  })

  it('captures @SERA mentions from students and passes student_cr role when not in broadcast space', async () => {
    mocks.ingestUrgentUpdate.mockResolvedValue({
      status: 'pending_review',
      document: { id: 'doc-456', title: 'Exam Form Extended' }
    })

    const res = await POST(
      buildRequest({
        type: 'MESSAGE',
        space: { displayName: 'Squad 42 Mixed Space' },
        message: {
          text: '@SERA capture Exam form deadline extended to Nov 30',
          sender: { email: 'cr@kalvium.community' }
        }
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('pending_review')
    expect(mocks.ingestUrgentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'gchat',
        senderRole: 'student_cr',
        rawText: 'Exam form deadline extended to Nov 30'
      })
    )
  })
})
