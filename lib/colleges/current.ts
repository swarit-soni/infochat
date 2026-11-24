import { getCurrentUser } from '@/lib/auth/get-current-user'

import {
  type CollegeSlug,
  getVisibleCollegesFor,
  isCollegeSlug
} from './registry'

export { getVisibleCollegesFor }

/**
 * Visible colleges for the current request. Signed-in users always get their
 * own college's view; `requested` only applies to visitors without an
 * account (e.g. on a college-specific page).
 */
export async function resolveVisibleColleges(
  requested?: string | null
): Promise<CollegeSlug[]> {
  const user = await getCurrentUser()
  if (user) {
    return getVisibleCollegesFor(user.college)
  }
  return getVisibleCollegesFor(isCollegeSlug(requested) ? requested : null)
}
