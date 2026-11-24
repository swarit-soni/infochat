import { getAuthProvider } from '@/lib/auth/provider'
import { getDefaultCollege } from '@/lib/colleges/access'
import { perfLog } from '@/lib/utils/perf-logging'
import { incrementAuthCallCount } from '@/lib/utils/perf-tracking'

import type { AppUser } from './types'

export async function getCurrentUser(): Promise<AppUser | null> {
  const user = await getAuthProvider().getCurrentUser()
  if (!user) return null
  // Providers without college-domain sign-in (Better Auth, anonymous mode)
  // place every account in the deployment's default college.
  return user.college ? user : { ...user, college: getDefaultCollege() }
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
