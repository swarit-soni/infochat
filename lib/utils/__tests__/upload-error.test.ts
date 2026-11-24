import { describe, expect, it } from 'vitest'

import { readUploadError } from '../upload-error'

const json = (body: unknown, status = 400) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })

describe('readUploadError', () => {
  it('combines error and message', async () => {
    await expect(
      readUploadError(
        json({
          error: 'File upload storage is not configured',
          message: 'Set R2_ACCESS_KEY_ID.'
        })
      )
    ).resolves.toBe(
      'File upload storage is not configured. Set R2_ACCESS_KEY_ID.'
    )
  })

  it('uses error alone', async () => {
    await expect(
      readUploadError(json({ error: 'File too large (max 5MB)' }))
    ).resolves.toBe('File too large (max 5MB)')
  })

  it('falls back to the status for non-JSON bodies', async () => {
    await expect(
      readUploadError(new Response('<html>Bad Gateway</html>', { status: 502 }))
    ).resolves.toBe('Upload failed (HTTP 502)')
  })
})
