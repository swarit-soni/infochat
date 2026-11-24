import { NextRequest, NextResponse } from 'next/server'

import {
  getCollegeIdentityFromEmail,
  isGoogleAuthUser,
  normalizeEmail
} from '@/lib/auth/domain'
import { safeRedirectPath } from '@/lib/auth/redirect-target'
import {
  AUTH_COLLEGE_COOKIE,
  collegePath,
  type CollegeSlug,
  getCollegeFromPathname,
  isCollegeSlug
} from '@/lib/colleges/registry'
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

function redirectAndClearCookies(
  request: NextRequest,
  pathWithQuery: string
): NextResponse {
  const response = NextResponse.redirect(
    buildRedirectUrl(request, pathWithQuery)
  )
  response.cookies.delete('auth_next')
  response.cookies.delete(AUTH_COLLEGE_COOKIE)
  return response
}

/** The login page to send a failed sign-in back to. */
function loginErrorPath(
  college: CollegeSlug | null,
  error: string,
  extra: Record<string, string> = {}
): string {
  const params = new URLSearchParams({ error, ...extra })
  return college
    ? `${collegePath(college, '/auth/student')}?${params}`
    : `/?${params}`
}

function isDomainRejectionMessage(
  error: string | null,
  errorDescription: string | null
): boolean {
  const combined = `${error ?? ''} ${errorDescription ?? ''}`.toLowerCase()
  return (
    combined.includes('college') ||
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

  // Same-origin paths only, so a crafted ?next= cannot bounce the
  // signed-in user off-site.
  const next = safeRedirectPath(
    searchParams.get('next') ??
      request.cookies.get('auth_next')?.value ??
      undefined
  )
  const cookieCollege = request.cookies.get(AUTH_COLLEGE_COOKIE)?.value
  // The college this sign-in was started for: set by the login action, or
  // inferred from the destination for older in-flight sign-ins.
  const requestedCollege: CollegeSlug | null = isCollegeSlug(cookieCollege)
    ? cookieCollege
    : getCollegeFromPathname(next)

  if (oauthError || oauthErrorDescription) {
    const errorCode = isDomainRejectionMessage(
      oauthError,
      oauthErrorDescription
    )
      ? 'unauthorized_domain'
      : 'oauth_failed'
    return redirectAndClearCookies(
      request,
      loginErrorPath(requestedCollege, errorCode)
    )
  }

  const code = searchParams.get('code')
  if (!code) {
    return redirectAndClearCookies(
      request,
      loginErrorPath(requestedCollege, 'oauth_failed')
    )
  }

  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return redirectAndClearCookies(
      request,
      loginErrorPath(requestedCollege, 'oauth_failed')
    )
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData?.user
  if (userError || !user) {
    return redirectAndClearCookies(
      request,
      loginErrorPath(requestedCollege, 'oauth_failed')
    )
  }

  const identity = getCollegeIdentityFromEmail(user.email)
  if (!identity || !isGoogleAuthUser(user)) {
    // The account belongs to no college: remove the auth user it created.
    await supabase.auth.signOut()
    try {
      const adminClient = createAdminClient()
      await adminClient.auth.admin.deleteUser(user.id)
    } catch (deleteError) {
      console.error('Failed to delete unauthorized auth user:', deleteError)
    }
    return redirectAndClearCookies(
      request,
      loginErrorPath(requestedCollege, 'unauthorized_domain')
    )
  }

  if (requestedCollege && identity.college !== requestedCollege) {
    // A valid account of another college: logins are disconnected, so it
    // cannot sign in here. Keep the account; just end this session.
    await supabase.auth.signOut()
    return redirectAndClearCookies(
      request,
      loginErrorPath(requestedCollege, 'wrong_college', {
        college: identity.college
      })
    )
  }

  const normalizedEmail = normalizeEmail(user.email)
  if (normalizedEmail) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    try {
      await upsertUserProfile({
        id: user.id,
        email: normalizedEmail,
        userType: identity.userType,
        college: identity.college,
        name: extractMetadataString(metadata, 'full_name', 'name'),
        avatarUrl: extractMetadataString(metadata, 'avatar_url', 'picture')
      })
    } catch (profileError) {
      console.error('Failed to upsert user profile:', profileError)
    }
  }

  // Never land in another college's area, even through a stale ?next=.
  const destination =
    getCollegeFromPathname(next) === identity.college
      ? next
      : collegePath(identity.college)
  return redirectAndClearCookies(request, destination)
}
