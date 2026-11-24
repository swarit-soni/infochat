'use server'

import { cookies } from 'next/headers'

import { getAuthProvider } from '@/lib/auth/provider'
import type { AuthActionResult } from '@/lib/auth/types'
import { getLoginHintDomain, isCollegeRoleEnabled } from '@/lib/colleges/access'
import {
  AUTH_COLLEGE_COOKIE,
  getCollege,
  isCollegeSlug
} from '@/lib/colleges/registry'

function unavailable(): AuthActionResult {
  return { success: false, error: 'Authentication is not available.' }
}

/**
 * Start Google sign-in.
 *
 * - Students and visitors (no `mentorCollege`) use one open login: any Google
 *   account may sign in, and new accounts pick their college afterwards.
 * - Mentors sign in to one college (`mentorCollege`). The OAuth callback only
 *   accepts accounts that are mentors of that college, so each college's
 *   mentor login is disconnected from the others.
 */
export async function signInWithGoogle(
  mentorCollege?: string
): Promise<AuthActionResult> {
  const cookieStore = await cookies()

  if (mentorCollege === undefined) {
    // A stale mentor attempt must not turn this into a mentor sign-in.
    cookieStore.delete(AUTH_COLLEGE_COOKIE)
  } else {
    if (!isCollegeSlug(mentorCollege)) {
      return { success: false, error: 'Unknown college.' }
    }
    if (!isCollegeRoleEnabled(mentorCollege, 'mentor')) {
      return {
        success: false,
        error: `Mentor sign-in is not set up for ${getCollege(mentorCollege).shortName} yet.`
      }
    }
  }

  const provider = getAuthProvider()
  if (!provider.signInWithOAuth) {
    return unavailable()
  }

  if (mentorCollege === undefined) {
    return provider.signInWithOAuth('google')
  }

  cookieStore.set(AUTH_COLLEGE_COOKIE, mentorCollege, {
    path: '/',
    maxAge: 300,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  })
  const loginHintDomain = getLoginHintDomain(mentorCollege, 'mentor')
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
