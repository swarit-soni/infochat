'use server'

import { cookies } from 'next/headers'

import type { UserType } from '@/lib/auth/domain'
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

export async function signInWithGoogle(
  college: string,
  userType: UserType = 'student'
): Promise<AuthActionResult> {
  if (!isCollegeSlug(college)) {
    return { success: false, error: 'Unknown college.' }
  }
  if (!isCollegeRoleEnabled(college, userType)) {
    return {
      success: false,
      error: `${userType === 'mentor' ? 'Mentor' : 'Student'} sign-in is not set up for ${getCollege(college).shortName} yet.`
    }
  }

  const provider = getAuthProvider()
  if (!provider.signInWithOAuth) {
    return unavailable()
  }

  const cookieStore = await cookies()
  cookieStore.set(AUTH_COLLEGE_COOKIE, college, {
    path: '/',
    maxAge: 300,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  })

  const loginHintDomain = getLoginHintDomain(college, userType)
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
