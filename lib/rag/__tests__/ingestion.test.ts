import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}))

vi.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser
}))

import {
  submitUrgentUpdateAction,
  uploadKnowledgeDocumentAction
} from '@/lib/actions/mentor'

import { extractMarkdownFromHtml, isAllowedOfficialUrl } from '../ingestion'

describe('isAllowedOfficialUrl', () => {
  it('allows only jecrcuniversity.edu.in and kalvium.com domains', () => {
    expect(
      isAllowedOfficialUrl('https://jecrcuniversity.edu.in/admissions')
    ).toBe(true)
    expect(isAllowedOfficialUrl('https://app.kalvium.com/curriculum')).toBe(
      true
    )
    expect(isAllowedOfficialUrl('https://kalvium.com/')).toBe(true)
    expect(isAllowedOfficialUrl('https://collegedunia.com/jecrc')).toBe(false)
    expect(isAllowedOfficialUrl('ftp://jecrcuniversity.edu.in/file')).toBe(
      false
    )
    expect(isAllowedOfficialUrl('not-a-url')).toBe(false)
  })
})

describe('extractMarkdownFromHtml', () => {
  it('converts official HTML tables and headings into clean Markdown', () => {
    const html = `
      <html>
        <head><title>JECRC Hostel Fees</title></head>
        <body>
          <nav>Home | About</nav>
          <main>
            <h1>Hostel Fee Structure</h1>
            <p>Updated for 2026-27 academic session.</p>
            <table>
              <tr><th>Room Type</th><th>Annual Fee</th></tr>
              <tr><td>AC Double</td><td>INR 1,35,000</td></tr>
            </table>
          </main>
        </body>
      </html>
    `

    const result = extractMarkdownFromHtml(html, 'Fallback')
    expect(result.title).toBe('JECRC Hostel Fees')
    expect(result.markdown).toContain('# Hostel Fee Structure')
    expect(result.markdown).toContain('| Room Type | Annual Fee |')
    expect(result.markdown).toContain('| AC Double | INR 1,35,000 |')
    expect(result.markdown).not.toContain('Home | About')
  })
})

describe('mentor action role gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects students and unauthenticated users from mentor upload actions', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'student-1',
      email: 'student@kalvium.community',
      userType: 'student',
      role: 'student',
      name: 'Student',
      image: null,
      createdAt: null
    })

    const uploadRes = await uploadKnowledgeDocumentAction({
      title: 'Test Notice',
      content: 'Some valid circular text content here.',
      domain: 'examinations',
      sourceSystem: 'jecrc_enotice',
      authority: 'jecrc',
      priority: 'standard'
    })
    expect(uploadRes).toEqual({
      success: false,
      error: 'Mentor access required.'
    })

    mocks.getCurrentUser.mockResolvedValue(null)
    const urgentRes = await submitUrgentUpdateAction({
      rawText: 'Room shifted to Lab 3',
      channel: 'whatsapp_forward',
      senderRole: 'mentor'
    })
    expect(urgentRes).toEqual({
      success: false,
      error: 'Mentor access required.'
    })
  })
})
