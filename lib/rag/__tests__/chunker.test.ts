import { describe, expect, it } from 'vitest'

import { chunkKnowledgeDocument, estimateTokenCount } from '../chunker'

describe('chunkKnowledgeDocument', () => {
  it('preserves Markdown fee tables intact inside a single chunk with heading context', () => {
    const markdown = [
      '# JECRC University Fee Structure',
      '',
      'All B.Tech CSE Kalvium students follow the annual schedule below.',
      '',
      '## Tuition and Hostel Fees',
      '',
      'Annual Fee Breakdown:',
      '| Category | Annual Fee | Due Date |',
      '| --- | --- | --- |',
      '| Tuition Fee | INR 2,50,000 | July 15 |',
      '| Hostel AC (Double) | INR 1,35,000 | July 15 |',
      '| Hostel Non-AC | INR 1,05,000 | July 15 |',
      '| Caution Deposit | INR 10,000 | One-time |',
      '',
      'Late fee penalty is INR 500 per week after the due date.'
    ].join('\n')

    const chunks = chunkKnowledgeDocument(markdown, {
      maxTokens: 120,
      documentTitle: 'Fee Circular'
    })

    const tableChunk = chunks.find(c => c.containsTable === 1)
    expect(tableChunk).toBeDefined()
    expect(tableChunk?.heading).toBe(
      'JECRC University Fee Structure > Tuition and Hostel Fees'
    )
    expect(tableChunk?.content).toContain(
      '| Tuition Fee | INR 2,50,000 | July 15 |'
    )
    expect(tableChunk?.content).toContain(
      '| Caution Deposit | INR 10,000 | One-time |'
    )
    expect(tableChunk?.content).toContain('Annual Fee Breakdown:')
  })

  it('keeps Q&A pairs together in self-contained chunks', () => {
    const markdown = [
      '# Kalvium Admissions FAQ',
      '',
      '**Q:** What is the eligibility for Kalvium B.Tech CSE?',
      '**A:** Students must pass Class 12 with Mathematics and clear the KQ entrance assessment.',
      '',
      '**Q:** Is hostel mandatory for first-year students?',
      '**A:** Day scholars from Jaipur may opt out, while outstation students use campus hostels.'
    ].join('\n')

    const chunks = chunkKnowledgeDocument(markdown, { maxTokens: 120 })

    expect(chunks.length).toBeGreaterThanOrEqual(1)
    const firstQa = chunks[0]
    expect(firstQa.content).toContain('eligibility for Kalvium B.Tech CSE')
    expect(firstQa.content).toContain('KQ entrance assessment')
  })

  it('returns empty array for blank content and estimates token counts', () => {
    expect(chunkKnowledgeDocument('   \n\t  ')).toEqual([])
    expect(estimateTokenCount('hello world!')).toBe(3)
  })
})
