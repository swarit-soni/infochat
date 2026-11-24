'use server'

import {
  DOMAIN_BY_USER_TYPE,
  hasNonKalviumMentorOverride,
  type UserType
} from '@/lib/auth/domain'
import { getAuthProvider } from '@/lib/auth/provider'
import type { AuthActionResult } from '@/lib/auth/types'

function unavailable(): AuthActionResult {
  return { success: false, error: 'Authentication is not available.' }
}

export async function signInWithGoogle(
  userType?: UserType
): Promise<AuthActionResult> {
  const provider = getAuthProvider()
  if (!provider.signInWithOAuth) {
    return unavailable()
  }

  // Any Google account may sign in, so only the mentor flow narrows Google's
  // account picker to @kalvium.com (unless a non-prod override is set).
  const loginHintDomain =
    userType === 'mentor' && !hasNonKalviumMentorOverride()
      ? DOMAIN_BY_USER_TYPE.mentor
      : undefined

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
