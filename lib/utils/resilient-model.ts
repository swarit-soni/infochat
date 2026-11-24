import { type LanguageModelMiddleware, wrapLanguageModel } from 'ai'

// Provider-level types, derived from the middleware contract `ai` exports.
type WrapStream = NonNullable<LanguageModelMiddleware['wrapStream']>
type WrapStreamOptions = Parameters<WrapStream>[0]
type StreamResult = Awaited<ReturnType<WrapStream>>
type CallOptions = WrapStreamOptions['params']
type StreamPart =
  StreamResult['stream'] extends ReadableStream<infer P> ? P : never
export type StreamingModel = WrapStreamOptions['model']

// Parts a provider sends before the answer itself. A failure while only these
// have arrived can be retried without the caller ever seeing a duplicate.
const PREAMBLE_PARTS = new Set<string>([
  'stream-start',
  'response-metadata',
  'raw'
])

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504])

export function isRetryableModelError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { isRetryable?: unknown; statusCode?: unknown }
  if (e.isRetryable === true) return true
  return typeof e.statusCode === 'number' && RETRYABLE_STATUS.has(e.statusCode)
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Read a stream until its first answer part. Returns the stream with the
 * parts read so far put back in front, or the retryable error that arrived
 * before any answer part did.
 */
async function peekStream(
  result: StreamResult
): Promise<{ result: StreamResult } | { error: unknown }> {
  const reader = result.stream.getReader()
  const buffered: StreamPart[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      return { result: { ...result, stream: replay(buffered, null) } }
    }
    if (value.type === 'error' && isRetryableModelError(value.error)) {
      void reader.cancel().catch(() => {})
      return { error: value.error }
    }
    buffered.push(value)
    if (!PREAMBLE_PARTS.has(value.type)) {
      return { result: { ...result, stream: replay(buffered, reader) } }
    }
  }
}

function replay(
  buffered: StreamPart[],
  reader: ReadableStreamDefaultReader<StreamPart> | null
): ReadableStream<StreamPart> {
  return new ReadableStream({
    start(controller) {
      for (const part of buffered) controller.enqueue(part)
      if (!reader) controller.close()
    },
    async pull(controller) {
      if (!reader) return
      try {
        const { done, value } = await reader.read()
        if (done) controller.close()
        else controller.enqueue(value)
      } catch (error) {
        controller.error(error)
      }
    },
    cancel(reason) {
      return reader?.cancel(reason)
    }
  })
}

export type ResilientModelOptions = {
  /** Models tried, in order, once the primary model's attempts are used up. */
  fallbacks?: StreamingModel[]
  /** Extra attempts on the primary model before moving to a fallback. */
  retries?: number
  /** Wait before the first retry; doubles with each further one. */
  retryDelayMs?: number
  onRetry?: (info: {
    attempt: number
    modelId: string
    nextModelId: string
    error: unknown
  }) => void
}

/**
 * Retry a streamed model call when the provider reports a temporary failure
 * (overload, rate limit, 5xx) before any of the answer has streamed.
 *
 * Providers such as Gemini can accept a request and then send "model is
 * experiencing high demand" as an error inside the stream. The AI SDK's
 * maxRetries only covers a failed HTTP call, so without this the turn ends
 * mid-answer. Once text or a tool call has streamed, an error is passed
 * through unchanged: retrying then would repeat what the user already saw.
 */
export function withStreamRetry(
  model: StreamingModel,
  {
    fallbacks = [],
    retries = 1,
    retryDelayMs = 750,
    onRetry
  }: ResilientModelOptions = {}
): StreamingModel {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: 'v4',
      wrapStream: async ({ doStream, params }) => {
        const attempts: Array<{
          modelId: string
          run: (p: CallOptions) => PromiseLike<StreamResult>
        }> = [
          ...Array.from({ length: retries + 1 }, () => ({
            modelId: model.modelId,
            run: () => doStream()
          })),
          ...fallbacks.map(fallback => ({
            modelId: fallback.modelId,
            run: (p: CallOptions) => fallback.doStream(p)
          }))
        ]

        for (let i = 0; i < attempts.length; i++) {
          const { modelId, run } = attempts[i]
          const isLast = i === attempts.length - 1
          let error: unknown

          try {
            const result = await run(params)
            // The last attempt's failure is the turn's failure: hand it on.
            if (isLast) return result
            const peeked = await peekStream(result)
            if ('result' in peeked) return peeked.result
            error = peeked.error
          } catch (thrown) {
            if (isLast || !isRetryableModelError(thrown)) throw thrown
            error = thrown
          }

          const next = attempts[i + 1]
          onRetry?.({
            attempt: i + 1,
            modelId,
            nextModelId: next.modelId,
            error
          })
          // Switching models needs no wait; the same model gets a moment.
          if (next.modelId === modelId) {
            await delay(retryDelayMs * 2 ** i, params.abortSignal)
          }
        }

        // Unreachable: the loop returns or throws on its last attempt.
        throw new Error('withStreamRetry: no attempts were made')
      }
    }
  }) as StreamingModel
}
