import { cache } from 'react'

import { getAuthProvider, isAnonymousMode } from '@/lib/auth/provider'
import { getUserProfile } from '@/lib/db/actions'
import { perfLog } from '@/lib/utils/perf-logging'
import { incrementAuthCallCount } from '@/lib/utils/perf-tracking'

import type { AppUser } from './types'

// One profile read per server render, shared by layout, page and metadata.
const getProfileCollege = cache(async (userId: string) => {
  try {
    const profile = await getUserProfile(userId)
    return {
      college: profile?.college ?? null,
      onboarded: Boolean(profile?.onboardedAt)
    }
  } catch (error) {
    console.warn('[Auth] Failed to read user profile college:', error)
    return { college: null, onboarded: true }
  }
})

export async function getCurrentUser(): Promise<AppUser | null> {
  const user = await getAuthProvider().getCurrentUser()
  if (!user) return null

  // A college verified from the email domain is authoritative.
  if (user.college) {
    return { ...user, collegeOnboarded: true }
  }
  // Anonymous mode and providers without profiles never ask the question.
  if (isAnonymousMode() || getAuthProvider().name !== 'supabase') {
    return { ...user, college: null, collegeOnboarded: true }
  }

  const { college, onboarded } = await getProfileCollege(user.id)
  return { ...user, college, collegeOnboarded: onboarded }
}

export async function getCurrentUserId() {
  const count = incrementAuthCallCount()
  perfLog(`getCurrentUserId called - count: ${count}`)

  const provider = getAuthProvider()
  if (provider.getCurrentUserId) {
    return provider.getCurrentUserId()
  }

  const user = await provider.getCurrentUser()
  return user?.id
}
