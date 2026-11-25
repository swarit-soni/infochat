import { cache } from 'react'

import { getAuthProvider, isAnonymousMode } from '@/lib/auth/provider'
import {
  getCollege,
  getPartnerCampuses,
  NO_CAMPUS
} from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'
import { getUserProfile } from '@/lib/db/actions'
import { perfLog } from '@/lib/utils/perf-logging'
import { incrementAuthCallCount } from '@/lib/utils/perf-tracking'

import type { AppUser } from './types'

// One profile read per server render, shared by layout, page and metadata.
const getProfileCollege = cache(async (userId: string) => {
  try {
    const profile = await getUserProfile(userId)
    return {
      ok: true as const,
      college: profile?.college ?? null,
      campus: profile?.campus ?? null,
      onboarded: Boolean(profile?.onboardedAt)
    }
  } catch (error) {
    console.warn('[Auth] Failed to read user profile college:', error)
    return { ok: false as const, college: null, campus: null, onboarded: true }
  }
})

export async function getCurrentUser(): Promise<AppUser | null> {
  const user = await getAuthProvider().getCurrentUser()
  if (!user) return null

  // Anonymous mode and providers without profiles never ask the questions.
  if (isAnonymousMode() || getAuthProvider().name !== 'supabase') {
    return { ...user, college: null, campus: null, collegeOnboarded: true }
  }

  const [directory, profile] = await Promise.all([
    getCollegeDirectory(),
    getProfileCollege(user.id)
  ])

  // A college verified from the email domain is authoritative; otherwise the
  // student's answer, as long as that college still exists on Sera.
  const collegeVerified = Boolean(getCollege(directory, user.college))
  const college = collegeVerified
    ? user.college!
    : (getCollege(directory, profile.college)?.slug ?? null)
  const campuses = getPartnerCampuses(directory, college)
  const campus =
    profile.campus === NO_CAMPUS ||
    campuses.some(c => c.slug === profile.campus)
      ? profile.campus
      : null

  const collegeAnswered = collegeVerified || profile.onboarded
  // Mentors work for their college as a whole; only students pick a campus.
  const campusAnswered =
    campuses.length === 0 || campus !== null || user.userType === 'mentor'
  return {
    ...user,
    college,
    collegeName: getCollege(directory, college)?.name ?? null,
    collegeVerified,
    campus,
    campusName: getCollege(directory, campus)?.name ?? null,
    // If profiles can't be read, don't trap the user in onboarding.
    collegeOnboarded: !profile.ok || (collegeAnswered && campusAnswered)
  }
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
