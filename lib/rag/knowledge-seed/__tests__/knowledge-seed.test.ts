import { describe, expect, it } from 'vitest'

import { DEFAULT_COLLEGE_DIRECTORY as DIR } from '@/lib/colleges/defaults'
import { getVisibleCollegesFor, isCollegeSlug } from '@/lib/colleges/registry'
import { KNOWLEDGE_DOMAINS, KNOWLEDGE_SOURCE_SYSTEMS } from '@/lib/db/schema'

import { KNOWLEDGE_SEED } from '..'

describe('knowledge base seed', () => {
  it('covers every college', () => {
    for (const { slug: college } of DIR.list) {
      expect(KNOWLEDGE_SEED.some(doc => doc.college === college)).toBe(true)
    }
  })

  it('has unique titles per college', () => {
    const keys = KNOWLEDGE_SEED.map(doc => `${doc.college}:${doc.title}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(KNOWLEDGE_SEED.map(doc => [doc.title, doc] as const))(
    '%s is well formed',
    (_title, doc) => {
      expect(isCollegeSlug(DIR, doc.college)).toBe(true)
      expect(KNOWLEDGE_DOMAINS).toContain(doc.domain)
      expect(KNOWLEDGE_SOURCE_SYSTEMS).toContain(doc.sourceSystem)
      expect(new URL(doc.sourceUrl).protocol).toBe('https:')
      expect(Number.isNaN(Date.parse(doc.effectiveDate))).toBe(false)
      if (doc.expiresAt) {
        expect(Date.parse(doc.expiresAt)).toBeGreaterThan(
          Date.parse(doc.effectiveDate)
        )
      }
      expect(doc.content.trim().length).toBeGreaterThan(200)
      // Authorities other than the owning college are only partner or joint.
      if (doc.authority !== 'joint') {
        expect(getVisibleCollegesFor(DIR, doc.college)).toContain(doc.authority)
      }
    }
  )
})
