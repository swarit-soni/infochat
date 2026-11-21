import { NextRequest, NextResponse } from 'next/server'

import {
  getUserTypeFromEmail,
  isGoogleAuthUser,
  normalizeEmail
} from '@/lib/auth/domain'
import { safeRedirectPath } from '@/lib/auth/redirect-target'
import { upsertUserProfile } from '@/lib/db/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function buildRedirectUrl(request: NextRequest, pathWithQuery: string): string {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) {
    return `${origin}${pathWithQuery}`
  }
  if (forwardedHost) {
    return `https://${forwardedHost}${pathWithQuery}`
  }
  return `${origin}${pathWithQuery}`
}

function redirectAndClearNext(
  request: NextRequest,
  pathWithQuery: string
): NextResponse {
  const response = NextResponse.redirect(
    buildRedirectUrl(request, pathWithQuery)
  )
  response.cookies.delete('auth_next')
  return response
}

function isDomainRejectionMessage(
  error: string | null,
  errorDescription: string | null
): boolean {
  const combined = `${error ?? ''} ${errorDescription ?? ''}`.toLowerCase()
  return (
    combined.includes('kalvium') ||
    combined.includes('domain') ||
    combined.includes('hook') ||
    combined.includes('unauthorized_domain')
  )
}

function extractMetadataString(
  metadata: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')

  if (oauthError || oauthErrorDescription) {
    const errorCode = isDomainRejectionMessage(
      oauthError,
      oauthErrorDescription
    )
      ? 'unauthorized_domain'
      : 'oauth_failed'
    return redirectAndClearNext(request, `/auth/login?error=${errorCode}`)
  }

  const code = searchParams.get('code')
  // If "next" is in param, use it as the redirect URL (same-origin paths
  // only, so a crafted ?next= cannot bounce the signed-in user off-site).
  const next = safeRedirectPath(
    searchParams.get('next') ??
      request.cookies.get('auth_next')?.value ??
      undefined
  )

  if (!code) {
    return redirectAndClearNext(request, '/auth/login?error=oauth_failed')
  }

  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return redirectAndClearNext(request, '/auth/login?error=oauth_failed')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData?.user
  if (userError || !user) {
    return redirectAndClearNext(request, '/auth/login?error=oauth_failed')
  }

  const userType = getUserTypeFromEmail(user.email)
  if (!userType || !isGoogleAuthUser(user)) {
    await supabase.auth.signOut()
    try {
      const adminClient = createAdminClient()
      await adminClient.auth.admin.deleteUser(user.id)
    } catch (deleteError) {
      console.error('Failed to delete unauthorized auth user:', deleteError)
    }
    return redirectAndClearNext(
      request,
      '/auth/login?error=unauthorized_domain'
    )
  }

  const normalizedEmail = normalizeEmail(user.email)
  if (normalizedEmail) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    try {
      await upsertUserProfile({
        id: user.id,
        email: normalizedEmail,
        userType,
        name: extractMetadataString(metadata, 'full_name', 'name'),
        avatarUrl: extractMetadataString(metadata, 'avatar_url', 'picture')
      })
    } catch (profileError) {
      console.error('Failed to upsert user profile:', profileError)
    }
  }

  return redirectAndClearNext(request, next)
}
