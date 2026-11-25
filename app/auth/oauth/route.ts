import { NextRequest, NextResponse } from 'next/server'

import {
  getCollegeIdentityFromEmail,
  isGoogleAuthUser,
  normalizeEmail
} from '@/lib/auth/domain'
import { safeRedirectPath } from '@/lib/auth/redirect-target'
import {
  isOpenStudentCollege,
  isStudentEnrollmentEnabled
} from '@/lib/colleges/access'
import {
  AUTH_COLLEGE_COOKIE,
  AUTH_STUDENT_COLLEGE_COOKIE,
  collegePath,
  type CollegeSlug,
  DEMO_COLLEGE_SLUG,
  getCollege,
  getPartnerCampuses,
  isCollegeSlug,
  NOT_ENROLLED_COLLEGE
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
  response.cookies.delete(AUTH_STUDENT_COLLEGE_COOKIE)
  return response
}

/** The login page a failed sign-in returns to. */
function loginErrorPath(
  mentorCollege: CollegeSlug | null,
  studentSelection: string | null,
  error: string,
  extra: Record<string, string> = {},
  nextPath?: string
): string {
  const params = new URLSearchParams({ error })
  if (!mentorCollege && studentSelection && !('college' in extra)) {
    params.set('college', studentSelection)
  }
  for (const [key, value] of Object.entries(extra)) {
    params.set(key, value)
  }
  if (!mentorCollege && nextPath && nextPath !== '/') {
    params.set('next', nextPath)
  }
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

  // Set by a college's mentor login; absent for the student login.
  const cookieCollege = request.cookies.get(AUTH_COLLEGE_COOKIE)?.value
  const directory = await getCollegeDirectory()
  const mentorCollege: CollegeSlug | null = isCollegeSlug(
    directory,
    cookieCollege
  )
    ? cookieCollege
    : null

  const cookieStudentSelection = request.cookies.get(
    AUTH_STUDENT_COLLEGE_COOKIE
  )?.value
  const studentSelection =
    mentorCollege !== null
      ? null
      : cookieStudentSelection === NOT_ENROLLED_COLLEGE ||
          isCollegeSlug(directory, cookieStudentSelection)
        ? cookieStudentSelection
        : null
  const selectedStudentCollege =
    studentSelection && studentSelection !== NOT_ENROLLED_COLLEGE
      ? getCollege(directory, studentSelection)
      : null

  // If "next" is in param, use it as the redirect URL (same-origin paths
  // only, so a crafted ?next= cannot bounce the signed-in user off-site).
  const next = safeRedirectPath(
    searchParams.get('next') ??
      request.cookies.get('auth_next')?.value ??
      undefined
  )

  if (oauthError || oauthErrorDescription) {
    const errorCode = isDomainRejectionMessage(
      oauthError,
      oauthErrorDescription
    )
      ? 'unauthorized_domain'
      : 'oauth_failed'
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, studentSelection, errorCode, {}, next)
    )
  }

  const code = searchParams.get('code')
  if (!code) {
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, studentSelection, 'oauth_failed', {}, next)
    )
  }

  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, studentSelection, 'oauth_failed', {}, next)
    )
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData?.user
  if (userError || !user) {
    return redirectAndClearNext(
      request,
      loginErrorPath(mentorCollege, studentSelection, 'oauth_failed', {}, next)
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
      loginErrorPath(
        mentorCollege,
        studentSelection,
        'unauthorized_domain',
        {},
        next
      )
    )
  }

  // Authentic college email domains decide staff access and verified student
  // enrollment. Open demo enrollment and "Not enrolled yet" also allow
  // personal Google accounts.
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
          null,
          mentorElsewhere ? 'wrong_college' : 'not_mentor',
          mentorElsewhere ? { college: identity.college } : {},
          next
        )
      )
    }
  } else if (
    selectedStudentCollege &&
    !isOpenStudentCollege(selectedStudentCollege)
  ) {
    if (!isStudentEnrollmentEnabled(selectedStudentCollege)) {
      await supabase.auth.signOut()
      return redirectAndClearNext(
        request,
        loginErrorPath(
          null,
          selectedStudentCollege.slug,
          'college_unavailable',
          {},
          next
        )
      )
    }
    if (identity?.college !== selectedStudentCollege.slug) {
      await supabase.auth.signOut()
      const extra: Record<string, string> = identity?.college
        ? { actual: identity.college }
        : {}
      return redirectAndClearNext(
        request,
        loginErrorPath(
          null,
          selectedStudentCollege.slug,
          'wrong_student_domain',
          extra,
          next
        )
      )
    }
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const isDemoEnrollment = Boolean(
    selectedStudentCollege &&
      isOpenStudentCollege(selectedStudentCollege) &&
      identity?.userType !== 'mentor'
  )
  const explicitNotEnrolled =
    studentSelection === NOT_ENROLLED_COLLEGE && !identity?.college
  const savedCollege = isDemoEnrollment
    ? selectedStudentCollege!.slug
    : (identity?.college ?? null)

  let collegeOnboarded = Boolean(savedCollege) || explicitNotEnrolled
  try {
    await upsertUserProfile({
      id: user.id,
      email: normalizedEmail,
      userType: identity?.userType ?? 'student',
      college: savedCollege,
      ...(isDemoEnrollment
        ? { campus: null }
        : explicitNotEnrolled
          ? { campus: null, onboarded: true }
          : {}),
      name: extractMetadataString(metadata, 'full_name', 'name'),
      avatarUrl: extractMetadataString(metadata, 'avatar_url', 'picture')
    })
    const profile = await getUserProfile(user.id)
    const effectiveCollege =
      savedCollege ??
      (profile?.college === DEMO_COLLEGE_SLUG ? DEMO_COLLEGE_SLUG : null)
    const answered =
      Boolean(savedCollege) ||
      explicitNotEnrolled ||
      Boolean(profile?.onboardedAt)
    // Students of a college with partner campuses also say which campus.
    const needsCampus =
      identity?.userType !== 'mentor' &&
      !profile?.campus &&
      getPartnerCampuses(directory, effectiveCollege).length > 0
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
