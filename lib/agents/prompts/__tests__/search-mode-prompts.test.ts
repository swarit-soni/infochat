import { describe, expect, it } from 'vitest'

import {
  getAdaptiveModePrompt,
  getQuickModePrompt,
  LANGUAGE_RULE
} from '../search-mode-prompts'

const builders = [
  ['quick', getQuickModePrompt],
  ['adaptive', getAdaptiveModePrompt]
] as const

describe('Sera system prompt', () => {
  it.each(builders)(
    '%s mode routes campus questions to campus tools, not web search first',
    (_mode, build) => {
      const prompt = build('kalvium')
      expect(prompt).toContain('## Choosing tools')
      expect(prompt).toContain(
        'Campus questions go to campus tools first; the general `search` tool is for questions that are not about a college.'
      )
      // The old prompt also demanded `search` as the first action for every
      // question, contradicting the campus-first rule.
      expect(prompt).not.toMatch(/FIRST action[^\n]*MUST be the `search`/)
      expect(prompt).not.toContain('ask_question')
    }
  )

  it.each(builders)(
    '%s mode keeps identity, principles, citations and language rules',
    (_mode, build) => {
      const prompt = build('jecrc')
      expect(prompt).toContain('# You are Sera')
      expect(prompt).toContain('## Principles (in priority order)')
      expect(prompt).toContain('**Verified over helpful.**')
      expect(prompt).toContain('[number](#label)')
      expect(prompt).toContain(LANGUAGE_RULE)
      expect(prompt).toContain('1800-180-5522')
    }
  )

  it('describes the partner campus for Kalvium and limits JECRC to itself', () => {
    const kalvium = getQuickModePrompt('kalvium')
    expect(kalvium).toContain('They belong to **Kalvium**')
    expect(kalvium).toContain(
      'Campus tools return only Kalvium and JECRC University records.'
    )
    expect(kalvium).toContain('present each authority separately')

    const jecrc = getQuickModePrompt('jecrc')
    expect(jecrc).toContain('They belong to **JECRC University**')
    expect(jecrc).toContain(
      "Never apply another college's rules, fees or dates to JECRC students."
    )
    expect(jecrc).toContain('`jecrcuniversity.edu.in`')
    expect(jecrc).not.toContain('`kalvium.com`')
  })

  it('covers every college for students without one and for guests', () => {
    const notEnrolled = getAdaptiveModePrompt(null, 'student')
    expect(notEnrolled).toContain('not enrolled at a college on Sera')
    expect(notEnrolled).toContain('Always say which college each fee')

    const guest = getAdaptiveModePrompt(null, 'guest')
    expect(guest).toContain('not signed in')
    expect(guest).toContain('prospective student or parent')
  })

  it('adds mentor guidance only for mentors', () => {
    expect(getQuickModePrompt('kalvium', 'mentor')).toContain(
      'They are a **mentor**'
    )
    expect(getQuickModePrompt('kalvium', 'student')).not.toContain(
      'They are a **mentor**'
    )
  })
})
