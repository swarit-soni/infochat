import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildDiscordFeedbackPayload,
  sendFeedbackToDiscord
} from '../discord-feedback'

describe('buildDiscordFeedbackPayload', () => {
  it('creates a forum post named after the first line of the message', () => {
    const payload = buildDiscordFeedbackPayload({
      sentiment: 'negative',
      message: 'Search is slow\nMore details here',
      pageUrl: 'https://example.com/search'
    })

    expect(payload.thread_name).toBe('😞 Search is slow')
    expect(payload.allowed_mentions).toEqual({ parse: [] })
    expect(payload.embeds[0].description).toBe(
      'Search is slow\nMore details here'
    )
    expect(payload.embeds[0].fields[1].value).toBe('Anonymous')
  })

  it('truncates to Discord limits', () => {
    const payload = buildDiscordFeedbackPayload({
      sentiment: 'positive',
      message: 'a'.repeat(5000),
      pageUrl: 'https://example.com',
      userEmail: 'u@example.com'
    })

    expect(payload.thread_name.length).toBe(100)
    expect(payload.embeds[0].description.length).toBe(4096)
    expect(payload.embeds[0].fields[1].value).toBe('u@example.com')
  })
})

describe('sendFeedbackToDiscord', () => {
  const original = process.env.DISCORD_FEEDBACK_WEBHOOK_URL
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.DISCORD_FEEDBACK_WEBHOOK_URL = original
  })

  const data = {
    sentiment: 'neutral' as const,
    message: 'Hello',
    pageUrl: 'https://example.com'
  }

  it('does nothing when the webhook URL is unset', async () => {
    delete process.env.DISCORD_FEEDBACK_WEBHOOK_URL
    await sendFeedbackToDiscord(data)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the payload to the webhook', async () => {
    process.env.DISCORD_FEEDBACK_WEBHOOK_URL = 'https://discord.test/hook'
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await sendFeedbackToDiscord(data)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://discord.test/hook')
    expect(JSON.parse(init.body).thread_name).toBe('😐 Hello')
  })

  it('swallows network errors', async () => {
    process.env.DISCORD_FEEDBACK_WEBHOOK_URL = 'https://discord.test/hook'
    fetchMock.mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(sendFeedbackToDiscord(data)).resolves.toBeUndefined()
  })
})
