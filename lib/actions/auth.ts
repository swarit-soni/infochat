'use server'

import { DOMAIN_BY_USER_TYPE, type UserType } from '@/lib/auth/domain'
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
  const loginHintDomain = userType ? DOMAIN_BY_USER_TYPE[userType] : undefined
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
