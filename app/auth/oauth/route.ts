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
  getPartnerCampuses,
  isCollegeSlug
} from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'
import { getUserProfile, upsertUserProfile } from '@/lib/db/actions'
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
  response.cookies.delete(AUTH_COLLEGE_COOKIE)
  return response
}

/** The login page a failed sign-in returns to. */
function loginErrorPath(
  mentorCollege: CollegeSlug | null,
  error: string,
  extra: Record<string, string> = {}
): string {
  const params = new URLSearchParams({ error, ...extra })
  return mentorCollege
    ? `${collegePath(mentorCollege, '/auth/mentor')}?${params}`
    : `/auth/login?${params}`
}

function isDomainRejectionMessage(
  error: string | null,
  errorDescription: string | null
): boolean {
  const combined = `${error ?? ''} ${errorDescription ?? ''}`.toLowerCase()
  return (
    combined.includes('domain') ||
    combined.includes('signup') ||
    combined.includes('google account') ||
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

  // Set by a college's mentor login; absent for the open student login.
  const cookieCollege = request.cookies.get(AUTH_COLLEGE_COOKIE)?.value
  const directory = await getCollegeDirectory()
  const mentorCollege: CollegeSlug | null = isCollegeSlug(
    directory,
    cookieCollege
  )
    ? cookieCollege
    : null

  if (oauthError || oauthErrorDescription) {
    const errorCode = isDomainRejectionMessage(
      oauthError,
      oauthErrorDescription
    )
      ? 'unauthorized_domain'
      : 'oauth_failed'
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, errorCode)
    )
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
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, 'oauth_failed')
    )
  }

  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, 'oauth_failed')
    )
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData?.user
  if (userError || !user) {
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, 'oauth_failed')
    )
  }

  const normalizedEmail = normalizeEmail(user.email)
  if (!normalizedEmail || !isGoogleAuthUser(user)) {
    await supabase.auth.signOut()
    try {
      const adminClient = createAdminClient()
      await adminClient.auth.admin.deleteUser(user.id)
    } catch (deleteError) {
      console.error('Failed to delete unauthorized auth user:', deleteError)
    }
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, 'unauthorized_domain')
    )
  }

  // Any Google account may sign in. A college email domain decides mentor
  // access and, for students on a college domain, their college.
  const identity = getCollegeIdentityFromEmail(normalizedEmail, directory)

  if (mentorCollege) {
    // Each college's mentor login only admits that college's mentors. The
    // account itself stays valid (it can still use the student login).
    const isMentorHere =
      identity?.userType === 'mentor' && identity.college === mentorCollege
    if (!isMentorHere) {
      await supabase.auth.signOut()
      const mentorElsewhere = identity?.userType === 'mentor'
      return redirectAndClearNext(
        request,
        loginErrorPath(
          mentorCollege,
          mentorElsewhere ? 'wrong_college' : 'not_mentor',
          mentorElsewhere ? { college: identity.college } : {}
        )
      )
    }
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  let collegeOnboarded = Boolean(identity?.college)
  try {
    await upsertUserProfile({
      id: user.id,
      email: normalizedEmail,
      userType: identity?.userType ?? 'student',
      // Only a verified college domain sets the college here; others keep
      // the college they chose at onboarding.
      college: identity?.college ?? null,
      name: extractMetadataString(metadata, 'full_name', 'name'),
      avatarUrl: extractMetadataString(metadata, 'avatar_url', 'picture')
    })
    const profile = await getUserProfile(user.id)
    const answered = collegeOnboarded || Boolean(profile?.onboardedAt)
    // Students of a college with partner campuses also say which campus.
    const needsCampus =
      identity?.userType !== 'mentor' &&
      !profile?.campus &&
      getPartnerCampuses(directory, identity?.college ?? profile?.college)
        .length > 0
    collegeOnboarded = answered && !needsCampus
  } catch (profileError) {
    console.error('Failed to upsert user profile:', profileError)
    // Don't trap the user in onboarding when profiles are unavailable.
    collegeOnboarded = true
  }

  if (mentorCollege) {
    return redirectAndClearNext(
      request,
      next !== '/' ? next : collegePath(mentorCollege, '/mentor')
    )
  }

  if (!collegeOnboarded) {
    // New student sign-up: ask which college they are enrolled in.
    const query = next !== '/' ? `?next=${encodeURIComponent(next)}` : ''
    return redirectAndClearNext(request, `/onboarding/college${query}`)
  }

  return redirectAndClearNext(request, next)
}
