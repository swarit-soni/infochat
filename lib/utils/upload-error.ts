/**
 * The reason a failed `/api/upload` response gives, for showing to the user.
 *
 * The route answers with `{ error, message? }`, where `message` carries the
 * actionable detail (for example that object storage is not configured).
 * Anything unreadable falls back to the HTTP status.
 */
export async function readUploadError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    const error = typeof body?.error === 'string' ? body.error : ''
    const message = typeof body?.message === 'string' ? body.message : ''
    if (error && message) return `${error}. ${message}`
    if (error || message) return error || message
  } catch {
    // Not JSON (e.g. a proxy error page); use the status below.
  }
  return `Upload failed (HTTP ${res.status})`
}
