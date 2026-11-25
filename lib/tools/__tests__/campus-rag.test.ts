import { modelMessageSchema } from 'ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCitationLabelAllocator } from '@/lib/utils/citation'

const mocks = vi.hoisted(() => ({
  retrieveCampusKnowledge: vi.fn(),
  retrieveCampusEvents: vi.fn(),
  retrieveOfficialPortals: vi.fn(),
  recordUnansweredQuery: vi.fn(),
  officialSearchExecute: vi.fn()
}))

vi.mock('@/lib/rag/retrieval', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/rag/retrieval')>()
  return {
    ...actual,
    retrieveCampusKnowledge: mocks.retrieveCampusKnowledge,
    retrieveCampusEvents: mocks.retrieveCampusEvents,
    retrieveOfficialPortals: mocks.retrieveOfficialPortals
  }
})

vi.mock('@/lib/rag/ingestion', () => ({
  recordUnansweredQuery: mocks.recordUnansweredQuery
}))

vi.mock('../search', () => ({
  createSearchTool: vi.fn(() => ({
    execute: mocks.officialSearchExecute
  }))
}))

import {
  DEFAULT_COLLEGE_DIRECTORY,
  defaultCampusScope
} from '@/lib/colleges/defaults'
import { getOfficialWebDomains } from '@/lib/colleges/registry'

import { createCampusRagTools, filterOfficialDomains } from '../campus-rag'

const OFFICIAL = getOfficialWebDomains(DEFAULT_COLLEGE_DIRECTORY, 'kalvium')

async function collectGeneratorResult<T = any>(
  value: AsyncIterable<T> | Promise<T>
): Promise<T> {
  if (value && typeof value === 'object' && Symbol.asyncIterator in value) {
    let last: T | undefined
    for await (const chunk of value) {
      last = chunk
    }
    return last as T
  }
  return value
}

describe('filterOfficialDomains', () => {
  it('strips non-official domains and falls back to official allowlist', () => {
    expect(
      filterOfficialDomains(['collegedunia.com', 'shiksha.com'], OFFICIAL)
    ).toEqual(['kalvium.com', 'jecrcuniversity.edu.in'])

    expect(
      filterOfficialDomains(
        ['admissions.jecrcuniversity.edu.in', 'reddit.com'],
        OFFICIAL
      )
    ).toEqual(['admissions.jecrcuniversity.edu.in'])
  })
})

describe('createCampusRagTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('assigns shared citation labels sequentially across campus RAG tools', async () => {
    mocks.retrieveCampusKnowledge.mockResolvedValue([
      {
        chunkId: 'c1',
        documentId: 'doc-1',
        formattedTitle: 'Exam Circular (JECRC University)',
        citationUrl: 'https://jecrcuniversity.edu.in/#sera-kb-doc-1',
        formattedContent: 'Exam form due Nov 30.'
      }
    ])
    mocks.retrieveOfficialPortals.mockResolvedValue([
      {
        id: 'portal_jecrc_erp',
        portalKey: 'jecrc_erp',
        name: 'JECRC ERP Portal',
        authority: 'jecrc',
        url: 'https://jecrcuniversity.edu.in/erp',
        requiresLogin: 1,
        capabilities: 'Attendance and fee receipts',
        navigationSteps: 'Sign in with enrollment ID',
        supportContact: 'Registrar',
        lastVerifiedAt: new Date()
      }
    ])

    const allocator = createCitationLabelAllocator(1)
    const tools = createCampusRagTools({ labelAllocator: allocator })

    const kbOut = await collectGeneratorResult<any>(
      tools.searchCampusKnowledge.execute!(
        { query: 'exam form deadline', max_results: 6 },
        { toolCallId: 'tc-1', messages: [], context: {} }
      ) as any
    )
    expect(kbOut.results[0].label).toBe('S1')

    const portalOut = await collectGeneratorResult<any>(
      tools.getOfficialPortalLinks.execute!(
        { query: 'attendance' },
        { toolCallId: 'tc-2', messages: [], context: {} }
      ) as any
    )
    expect(portalOut.results[0].label).toBe('S2')
  })

  it('gives the model JSON-safe output when portal rows carry Date fields', async () => {
    const lastVerifiedAt = new Date('2026-11-20T10:00:00.000Z')
    mocks.retrieveOfficialPortals.mockResolvedValue([
      {
        id: 'portal_jecrc_erp',
        portalKey: 'jecrc_erp',
        name: 'JECRC ERP Portal',
        authority: 'jecrc',
        url: 'https://jecrcuniversity.edu.in/erp',
        requiresLogin: 1,
        capabilities: 'Attendance and fee receipts',
        navigationSteps: 'Sign in with enrollment ID',
        supportContact: null,
        lastVerifiedAt,
        createdAt: lastVerifiedAt,
        updatedAt: lastVerifiedAt
      }
    ])

    const tools = createCampusRagTools({
      labelAllocator: createCitationLabelAllocator(1)
    })
    const output = await collectGeneratorResult<any>(
      tools.getOfficialPortalLinks.execute!(
        { query: 'contact placement cell' },
        { toolCallId: 'tc-portal', messages: [], context: {} }
      ) as any
    )
    const modelOutput = await tools.getOfficialPortalLinks.toModelOutput!({
      toolCallId: 'tc-portal',
      input: { query: 'contact placement cell' },
      output
    } as any)

    expect((modelOutput as any).value.portals[0].lastVerifiedAt).toBe(
      '2026-11-20T10:00:00.000Z'
    )
    // The next model step validates tool results against this schema; a Date
    // here fails the whole turn with AI_InvalidPromptError.
    const parsed = modelMessageSchema.safeParse({
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'tc-portal',
          toolName: 'getOfficialPortalLinks',
          output: modelOutput
        }
      ]
    })
    expect(parsed.success).toBe(true)
  })

  it('enforces official domain allowlist in searchOfficialWeb fallback', async () => {
    mocks.officialSearchExecute.mockImplementation(async function* (params) {
      yield {
        state: 'complete',
        query: params.query,
        results: [
          {
            title: 'JECRC Admissions',
            url: 'https://jecrcuniversity.edu.in/admissions',
            content: 'Eligibility details',
            label: 'S1'
          }
        ],
        images: [],
        number_of_results: 1
      }
    })

    const tools = createCampusRagTools()
    const webOut = await collectGeneratorResult<any>(
      tools.searchOfficialWeb.execute!(
        {
          query: 'JECRC B.Tech eligibility',
          max_results: 5,
          include_domains: ['quora.com', 'kalvium.com']
        },
        { toolCallId: 'tc-web', messages: [], context: {} }
      ) as any
    )

    expect(mocks.officialSearchExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        include_domains: ['kalvium.com']
      }),
      expect.anything()
    )
    expect(webOut.results[0].title).toBe(
      '[Official Web Fallback] JECRC Admissions'
    )
  })

  it('logs abstention gaps via logUnansweredQuery', async () => {
    mocks.recordUnansweredQuery.mockResolvedValue({ id: 'uq-1' })
    const tools = createCampusRagTools({
      campusScope: defaultCampusScope('kalvium'),
      userId: 'u-1'
    })
    const result = await tools.logUnansweredQuery.execute!(
      {
        query: 'When is Squad 99 industrial visit?',
        domain: 'activities',
        reason: 'No circular found in KB'
      },
      { toolCallId: 'tc-log', messages: [], context: {} }
    )

    expect(result).toMatchObject({ logged: true, id: 'uq-1' })
    expect(mocks.recordUnansweredQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        college: 'kalvium',
        userId: 'u-1',
        query: 'When is Squad 99 industrial visit?',
        domain: 'activities',
        kind: 'abstention'
      })
    )
  })

  it('logs a gap for students without a college only when the model names one', async () => {
    mocks.recordUnansweredQuery.mockResolvedValue({ id: 'uq-2' })
    const tools = createCampusRagTools()

    const unattributed = await tools.logUnansweredQuery.execute!(
      { query: 'Hostel fees?', domain: 'fees', reason: 'Not in KB' },
      { toolCallId: 'tc-a', messages: [], context: {} }
    )
    expect(unattributed).toMatchObject({ logged: false })
    expect(mocks.recordUnansweredQuery).not.toHaveBeenCalled()

    const attributed = await tools.logUnansweredQuery.execute!(
      {
        college: 'bkbirla',
        query: 'Hostel fees?',
        domain: 'fees',
        reason: 'Not in KB'
      },
      { toolCallId: 'tc-b', messages: [], context: {} }
    )
    expect(attributed).toMatchObject({ logged: true, id: 'uq-2' })
    expect(mocks.recordUnansweredQuery).toHaveBeenCalledWith(
      expect.objectContaining({ college: 'bkbirla' })
    )
  })

  it('scopes retrieval to the college and its partners, or every college', async () => {
    mocks.retrieveCampusKnowledge.mockResolvedValue([])
    const context = { toolCallId: 'tc', messages: [], context: {} }

    await collectGeneratorResult(
      createCampusRagTools({ campusScope: defaultCampusScope('kalvium') })
        .searchCampusKnowledge.execute!(
        { query: 'fees', max_results: 3 },
        context
      ) as never
    )
    expect(mocks.retrieveCampusKnowledge).toHaveBeenLastCalledWith(
      expect.objectContaining({ colleges: ['kalvium', 'jecrc'] })
    )

    await collectGeneratorResult(
      createCampusRagTools({ campusScope: defaultCampusScope('jecrc') })
        .searchCampusKnowledge.execute!(
        { query: 'fees', max_results: 3 },
        context
      ) as never
    )
    expect(mocks.retrieveCampusKnowledge).toHaveBeenLastCalledWith(
      expect.objectContaining({ colleges: ['jecrc'] })
    )

    await collectGeneratorResult(
      createCampusRagTools().searchCampusKnowledge.execute!(
        { query: 'fees', max_results: 3 },
        context
      ) as never
    )
    expect(mocks.retrieveCampusKnowledge).toHaveBeenLastCalledWith(
      expect.objectContaining({
        colleges: DEFAULT_COLLEGE_DIRECTORY.list.map(c => c.slug)
      })
    )
  })

  it('returns labelled JSON-safe student portal records only for integrated colleges', async () => {
    const seraDemoTools = createCampusRagTools({
      campusScope: defaultCampusScope('sera-demo'),
      labelAllocator: createCitationLabelAllocator(1)
    })
    const output = await collectGeneratorResult<any>(
      seraDemoTools.getStudentRecords.execute!(
        { view: 'overview', timeframe: 'this_week' },
        { toolCallId: 'tc-student', messages: [], context: {} }
      ) as any
    )

    expect(output.integrated).toBe(true)
    expect(output.results.map((r: { label: string }) => r.label)).toEqual([
      'S1',
      'S2',
      'S3'
    ])
    expect(output.attendance.overallPercentage).toBe(82.3)

    const modelOutput = await seraDemoTools.getStudentRecords.toModelOutput!({
      toolCallId: 'tc-student',
      input: { view: 'overview', timeframe: 'this_week' },
      output
    } as any)
    const parsed = modelMessageSchema.safeParse({
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'tc-student',
          toolName: 'getStudentRecords',
          output: modelOutput
        }
      ]
    })
    expect(parsed.success).toBe(true)

    const kalviumTools = createCampusRagTools({
      campusScope: defaultCampusScope('kalvium')
    })
    const nonIntegrated = await collectGeneratorResult<any>(
      kalviumTools.getStudentRecords.execute!(
        { view: 'attendance', timeframe: 'this_week' },
        { toolCallId: 'tc-non', messages: [], context: {} }
      ) as any
    )
    expect(nonIntegrated.integrated).toBe(false)
    expect(nonIntegrated.results).toEqual([])
  })
})
