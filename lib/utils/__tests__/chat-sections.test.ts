import { describe, expect, it } from 'vitest'

import type { UIMessage } from '@/lib/types/ai'

import { buildChatSections } from '../chat-sections'

const text = (id: string, role: 'user' | 'assistant', value: string) =>
  ({ id, role, parts: [{ type: 'text', text: value }] }) as UIMessage

describe('buildChatSections', () => {
  it('groups assistant messages under the user message they answer', () => {
    const sections = buildChatSections([
      text('u1', 'user', 'q1'),
      text('a1', 'assistant', 'r1'),
      text('u2', 'user', 'q2'),
      text('a2', 'assistant', 'r2')
    ])

    expect(sections.map(s => s.id)).toEqual(['u1', 'u2'])
    expect(sections[1].assistantMessages.map(m => m.id)).toEqual(['a2'])
  })

  it('keeps the latest copy of a duplicated message id, which is the live one', () => {
    const stale = text('a1', 'assistant', 'The library opens at')
    const live = text('a1', 'assistant', 'The library opens at 9am daily.')

    const sections = buildChatSections([text('u1', 'user', 'q'), stale, live])

    expect(sections).toHaveLength(1)
    expect(sections[0].assistantMessages).toEqual([live])
  })
})
