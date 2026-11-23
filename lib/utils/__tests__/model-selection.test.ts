import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/utils/registry')

import {
  DEFAULT_MODEL,
  FIXED_MODEL,
  selectModel
} from '@/lib/utils/model-selection'
import { isProviderEnabled } from '@/lib/utils/registry'

const mockIsProviderEnabled = vi.mocked(isProviderEnabled)

function createCookieStore(value?: string) {
  return {
    get: (name: string) => {
      if (name === 'selectedModel' && value) {
        return { name, value } as { name: string; value: string }
      }

      return undefined
    }
  } as any
}

describe('selectModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsProviderEnabled.mockImplementation(
      providerId => providerId === FIXED_MODEL.providerId
    )
  })

  it('always returns the fixed Gemini 3.1 Flash-Lite model', async () => {
    const result = await selectModel({
      searchMode: 'quick',
      cookieStore: createCookieStore()
    })

    expect(result).toEqual(FIXED_MODEL)
    expect(result).toEqual(DEFAULT_MODEL)
    expect(result).toEqual({
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash-Lite',
      provider: 'Google',
      providerId: 'google'
    })
  })

  it('ignores any model selection cookie and enforces the fixed model', async () => {
    const result = await selectModel({
      searchMode: 'adaptive',
      cookieStore: createCookieStore('openai:gpt-5.4-mini')
    })

    expect(result).toEqual(FIXED_MODEL)
  })

  it('returns null when the Google provider is not enabled', async () => {
    mockIsProviderEnabled.mockReturnValue(false)

    const result = await selectModel({
      searchMode: 'quick',
      cookieStore: createCookieStore('openai:gpt-5.4-mini')
    })

    expect(result).toBeNull()
  })
})
