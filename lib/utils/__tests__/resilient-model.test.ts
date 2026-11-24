import { describe, expect, it, vi } from 'vitest'

import {
  isRetryableModelError,
  type StreamingModel,
  withStreamRetry
} from '../resilient-model'

type Part = { type: string; [key: string]: unknown }

const overloaded = Object.assign(
  new Error('This model is currently experiencing high demand.'),
  { statusCode: 503, isRetryable: true }
)

function mockModel(modelId: string, runs: Part[][]) {
  let call = 0
  const doStream = vi.fn(async () => {
    const parts = runs[Math.min(call++, runs.length - 1)]
    return {
      stream: new ReadableStream<Part>({
        start(controller) {
          parts.forEach(part => controller.enqueue(part))
          controller.close()
        }
      })
    }
  })
  const model = {
    specificationVersion: 'v4',
    provider: 'mock',
    modelId,
    supportedUrls: {},
    doGenerate: vi.fn(),
    doStream
  } as unknown as StreamingModel
  return { model, doStream }
}

const answer = (text: string): Part[] => [
  { type: 'stream-start', warnings: [] },
  { type: 'text-start', id: 't' },
  { type: 'text-delta', id: 't', delta: text },
  { type: 'text-end', id: 't' },
  { type: 'finish', finishReason: { unified: 'stop' }, usage: {} }
]
const failsEarly: Part[] = [
  { type: 'stream-start', warnings: [] },
  { type: 'error', error: overloaded }
]

async function run(model: StreamingModel) {
  const { stream } = await model.doStream({ prompt: [] } as never)
  const parts: Part[] = []
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) return parts
    parts.push(value as Part)
  }
}

const text = (parts: Part[]) =>
  parts
    .filter(p => p.type === 'text-delta')
    .map(p => p.delta)
    .join('')

describe('withStreamRetry', () => {
  it('retries the same model when it fails before answering', async () => {
    const primary = mockModel('primary', [failsEarly, answer('hello')])
    const fallback = mockModel('fallback', [answer('from fallback')])

    const parts = await run(
      withStreamRetry(primary.model, {
        fallbacks: [fallback.model],
        retryDelayMs: 0
      })
    )

    expect(text(parts)).toBe('hello')
    expect(parts.some(p => p.type === 'error')).toBe(false)
    expect(primary.doStream).toHaveBeenCalledTimes(2)
    expect(fallback.doStream).not.toHaveBeenCalled()
  })

  it('falls back to the next model once the retries are used up', async () => {
    const primary = mockModel('primary', [failsEarly])
    const fallback = mockModel('fallback', [answer('from fallback')])
    const onRetry = vi.fn()

    const parts = await run(
      withStreamRetry(primary.model, {
        fallbacks: [fallback.model],
        retryDelayMs: 0,
        onRetry
      })
    )

    expect(text(parts)).toBe('from fallback')
    expect(primary.doStream).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenLastCalledWith(
      expect.objectContaining({ modelId: 'primary', nextModelId: 'fallback' })
    )
  })

  it('passes the error on when every model fails', async () => {
    const primary = mockModel('primary', [failsEarly])
    const fallback = mockModel('fallback', [failsEarly])

    const parts = await run(
      withStreamRetry(primary.model, {
        fallbacks: [fallback.model],
        retryDelayMs: 0
      })
    )

    expect(parts.at(-1)).toEqual({ type: 'error', error: overloaded })
  })

  it('does not retry once the answer has started streaming', async () => {
    const primary = mockModel('primary', [
      [...answer('partial').slice(0, 3), { type: 'error', error: overloaded }],
      answer('never')
    ])

    const parts = await run(withStreamRetry(primary.model, { retryDelayMs: 0 }))

    expect(text(parts)).toBe('partial')
    expect(parts.at(-1)).toEqual({ type: 'error', error: overloaded })
    expect(primary.doStream).toHaveBeenCalledOnce()
  })

  it('does not retry errors that are not temporary', async () => {
    const invalid = Object.assign(new Error('Invalid argument'), {
      statusCode: 400,
      isRetryable: false
    })
    const primary = mockModel('primary', [
      [{ type: 'error', error: invalid }],
      answer('never')
    ])

    const parts = await run(withStreamRetry(primary.model, { retryDelayMs: 0 }))

    expect(parts).toEqual([{ type: 'error', error: invalid }])
    expect(primary.doStream).toHaveBeenCalledOnce()
  })
})

describe('isRetryableModelError', () => {
  it('treats overload, rate limits and 5xx as temporary', () => {
    expect(isRetryableModelError(overloaded)).toBe(true)
    expect(isRetryableModelError({ statusCode: 429 })).toBe(true)
    expect(isRetryableModelError({ statusCode: 400 })).toBe(false)
    expect(isRetryableModelError(new Error('boom'))).toBe(false)
  })
})
