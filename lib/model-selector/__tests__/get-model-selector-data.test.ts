import { cookies } from 'next/headers'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MODEL_SELECTION_COOKIE,
  serializeModelSelectionCookie
} from '@/lib/config/model-selection-cookie'
import { getModelSelectorData } from '@/lib/model-selector/get-model-selector-data'
import { fetchAvailableModels } from '@/lib/models/fetch-models'
import { isProviderEnabled } from '@/lib/utils/registry'

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))
vi.mock('@/lib/models/fetch-models', () => ({
  fetchAvailableModels: vi.fn()
}))
vi.mock('@/lib/utils/registry', () => ({
  isProviderEnabled: vi.fn()
}))

const mockCookies = vi.mocked(cookies)
const mockFetchAvailableModels = vi.mocked(fetchAvailableModels)
const mockIsProviderEnabled = vi.mocked(isProviderEnabled)

function createCookieStore(value?: string) {
  return {
    get: (name: string) =>
      name === MODEL_SELECTION_COOKIE && value ? { name, value } : undefined
  } as any
}

describe('getModelSelectorData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MORPHIC_CLOUD_DEPLOYMENT
    mockIsProviderEnabled.mockReturnValue(true)
  })

  it('defaults selectedModelKey to google:gemini-4-hydrogen when available and cookie is unset', async () => {
    mockCookies.mockResolvedValue(createCookieStore())
    mockFetchAvailableModels.mockResolvedValue({
      Google: [
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          provider: 'Google',
          providerId: 'google'
        },
        {
          id: 'gemini-4-hydrogen',
          name: 'Gemini 4 Hydrogen',
          provider: 'Google',
          providerId: 'google'
        }
      ]
    })

    const data = await getModelSelectorData()

    expect(data.enabled).toBe(true)
    expect(data.hasAvailableModels).toBe(true)
    expect(data.selectedModelKey).toBe('google:gemini-4-hydrogen')
  })

  it('honors a valid selectedModel cookie when set', async () => {
    mockCookies.mockResolvedValue(
      createCookieStore(
        serializeModelSelectionCookie({
          providerId: 'google',
          modelId: 'gemini-2.5-flash'
        })
      )
    )
    mockFetchAvailableModels.mockResolvedValue({
      Google: [
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          provider: 'Google',
          providerId: 'google'
        },
        {
          id: 'gemini-4-hydrogen',
          name: 'Gemini 4 Hydrogen',
          provider: 'Google',
          providerId: 'google'
        }
      ]
    })

    const data = await getModelSelectorData()

    expect(data.selectedModelKey).toBe('google:gemini-2.5-flash')
  })

  it('falls back to the first available model when DEFAULT_MODEL is not fetched', async () => {
    mockCookies.mockResolvedValue(createCookieStore())
    mockFetchAvailableModels.mockResolvedValue({
      OpenAI: [
        {
          id: 'gpt-5.4-mini',
          name: 'GPT-5.4 mini',
          provider: 'OpenAI',
          providerId: 'openai'
        }
      ]
    })

    const data = await getModelSelectorData()

    expect(data.selectedModelKey).toBe('openai:gpt-5.4-mini')
  })
})
