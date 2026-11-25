'use server'

import { cookies } from 'next/headers'

import { getAuthProvider } from '@/lib/auth/provider'
import type { AuthActionResult } from '@/lib/auth/types'
import {
  getLoginHintDomain,
  isCollegeRoleEnabled,
  isOpenStudentCollege,
  isStudentEnrollmentEnabled
} from '@/lib/colleges/access'
import {
  AUTH_COLLEGE_COOKIE,
  AUTH_STUDENT_COLLEGE_COOKIE,
  getCollege,
  NOT_ENROLLED_COLLEGE
} from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'

function unavailable(): AuthActionResult {
  return { success: false, error: 'Authentication is not available.' }
}

function authCookieOptions() {
  return {
    path: '/',
    maxAge: 300,
    sameSite: 'lax' as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}

/**
 * Start Google sign-in for staff or generic OAuth fallback.
 *
 * - Mentors/staff sign in to one college (`mentorCollege`). The OAuth callback
 *   only accepts accounts that are staff of that college, so each college's
 *   staff login is disconnected from the others.
 */
export async function signInWithGoogle(
  mentorCollege?: string
): Promise<AuthActionResult> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_STUDENT_COLLEGE_COOKIE)

  if (mentorCollege === undefined) {
    // A stale mentor attempt must not turn this into a mentor sign-in.
    cookieStore.delete(AUTH_COLLEGE_COOKIE)
  }
  const college =
    mentorCollege === undefined
      ? null
      : getCollege(await getCollegeDirectory(), mentorCollege)
  if (mentorCollege !== undefined) {
    if (!college) {
      return { success: false, error: 'Unknown college.' }
    }
    if (!isCollegeRoleEnabled(college, 'mentor')) {
      return {
        success: false,
        error: `Staff sign-in is not set up for ${college.shortName} yet.`
      }
    }
  }

  const provider = getAuthProvider()
  if (!provider.signInWithOAuth) {
    return unavailable()
  }

  if (!college) {
    return provider.signInWithOAuth('google')
  }

  cookieStore.set(AUTH_COLLEGE_COOKIE, college.slug, authCookieOptions())
  const loginHintDomain = getLoginHintDomain(college, 'mentor')
  return provider.signInWithOAuth(
    'google',
    loginHintDomain ? { loginHintDomain } : undefined
  )
}

/**
 * Start Google sign-in for a student who first selected their college (or
 * `NOT_ENROLLED_COLLEGE`). The OAuth callback verifies authentic college
 * email domains against this choice before saving enrollment.
 */
export async function signInStudentWithGoogle(
  collegeSelection: string
): Promise<AuthActionResult> {
  const cookieStore = await cookies()
  // A stale staff attempt must not turn a student sign-in into a staff login.
  cookieStore.delete(AUTH_COLLEGE_COOKIE)

  const provider = getAuthProvider()
  if (!provider.signInWithOAuth) {
    return unavailable()
  }

  if (collegeSelection === NOT_ENROLLED_COLLEGE) {
    cookieStore.set(
      AUTH_STUDENT_COLLEGE_COOKIE,
      NOT_ENROLLED_COLLEGE,
      authCookieOptions()
    )
    return provider.signInWithOAuth('google')
  }

  const college = getCollege(await getCollegeDirectory(), collegeSelection)
  if (!college) {
    return { success: false, error: 'Unknown college.' }
  }
  if (!isStudentEnrollmentEnabled(college)) {
    return {
      success: false,
      error: `Student sign-in is not set up for ${college.shortName} yet.`
    }
  }

  cookieStore.set(
    AUTH_STUDENT_COLLEGE_COOKIE,
    college.slug,
    authCookieOptions()
  )
  const loginHintDomain = isOpenStudentCollege(college)
    ? undefined
    : getLoginHintDomain(college, 'student')
  return provider.signInWithOAuth(
    'google',
    loginHintDomain ? { loginHintDomain } : undefined
  )
}

export async function signOut(): Promise<AuthActionResult> {
  const provider = getAuthProvider()
  if (!provider.signOut) {
    return unavailable()
  }
  return provider.signOut()
}
