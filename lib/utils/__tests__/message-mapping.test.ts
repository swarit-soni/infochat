import { describe, expect, it } from 'vitest'

import { DeterministicPreparationError } from '@/lib/errors/deterministic-preparation-error'
import type { DBMessagePartSelect } from '@/lib/types/message-persistence'

import {
  mapDBPartToUIMessagePart,
  mapUIMessagePartsToDBParts
} from '../message-mapping'

function persistedPart(
  values: Partial<DBMessagePartSelect>
): DBMessagePartSelect {
  return values as DBMessagePartSelect
}

describe('mapDBPartToUIMessagePart', () => {
  it('identifies an unmappable persisted part as deterministic', () => {
    expect(() =>
      mapDBPartToUIMessagePart(persistedPart({ type: 'private-user-content' }))
    ).toThrow(DeterministicPreparationError)
  })

  it('identifies a missing persisted tool state as deterministic', () => {
    expect(() =>
      mapDBPartToUIMessagePart(
        persistedPart({ type: 'tool-search', tool_state: null })
      )
    ).toThrow(DeterministicPreparationError)
  })
})

describe('editDraft tool parts', () => {
  it('round-trips through the dynamic tool columns', () => {
    const uiPart = {
      type: 'tool-editDraft',
      toolCallId: 'call-1',
      state: 'output-available',
      input: { edits: [{ find: 'a', replace: 'b' }] },
      output: { applied: 1, failed: [] }
    }
    const [dbPart] = mapUIMessagePartsToDBParts([uiPart] as never, 'msg-1')

    expect(dbPart.type).toBe('tool-dynamic')
    expect(dbPart.tool_dynamic_type).toBe('draft')

    const restored = mapDBPartToUIMessagePart(
      persistedPart(dbPart as Partial<DBMessagePartSelect>)
    )
    expect(restored).toMatchObject(uiPart)
  })
})

describe('campus RAG tool parts', () => {
  it.each([
    'tool-searchCampusKnowledge',
    'tool-queryEvents',
    'tool-getOfficialPortalLinks',
    'tool-searchOfficialWeb',
    'tool-logUnansweredQuery'
  ])('round-trips %s through the dynamic tool columns', partType => {
    const uiPart = {
      type: partType,
      toolCallId: 'call-rag-1',
      state: 'output-available',
      input: { query: 'JECRC fee schedule' },
      output: {
        state: 'complete',
        results: [
          {
            title: 'Fee Circular',
            url: 'https://jecrcuniversity.edu.in/#sera-kb-1',
            content: 'Annual tuition INR 2,50,000',
            label: 'S1'
          }
        ]
      }
    }
    const [dbPart] = mapUIMessagePartsToDBParts([uiPart] as never, 'msg-1')

    expect(dbPart.type).toBe('tool-dynamic')
    expect(dbPart.tool_dynamic_type).toBe('rag')
    expect(dbPart.tool_dynamic_name).toBe(partType.slice(5))

    const restored = mapDBPartToUIMessagePart(
      persistedPart(dbPart as Partial<DBMessagePartSelect>)
    )
    expect(restored).toMatchObject(uiPart)
  })
})
