import { getCurrentUser } from '@/lib/auth/get-current-user'

import {
  type CollegeSlug,
  getVisibleCollegesFor,
  isCollegeSlug
} from './registry'
import { getCollegeDirectory } from './store'

/**
 * Visible colleges for the current request. Signed-in users always get their
 * own college and partner campus; `requested` only applies to visitors
 * without an account (e.g. on a college-specific page).
 */
export async function resolveVisibleColleges(
  requested?: string | null
): Promise<CollegeSlug[]> {
  const [user, directory] = await Promise.all([
    getCurrentUser(),
    getCollegeDirectory()
  ])
  if (user) {
    return getVisibleCollegesFor(directory, user.college, user.campus ?? null)
  }
  return getVisibleCollegesFor(
    directory,
    isCollegeSlug(directory, requested) ? requested : null
  )
}
