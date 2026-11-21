'use server'

import { getAuthProvider } from '@/lib/auth/provider'
import type { AuthActionResult } from '@/lib/auth/types'

function unavailable(): AuthActionResult {
  return { success: false, error: 'Authentication is not available.' }
}

export async function signInWithGoogle(): Promise<AuthActionResult> {
  const provider = getAuthProvider()
  if (!provider.signInWithOAuth) {
    return unavailable()
  }
  return provider.signInWithOAuth('google')
}

export async function signOut(): Promise<AuthActionResult> {
  const provider = getAuthProvider()
  if (!provider.signOut) {
    return unavailable()
  }
  return provider.signOut()
}
