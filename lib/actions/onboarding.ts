'use server'

import { getCollegeIdentityFromEmail } from '@/lib/auth/domain'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isCollegeSlug } from '@/lib/colleges/registry'
import { setUserProfileCollege } from '@/lib/db/actions'

/** Answer value for students who are not enrolled at any listed college. */
const NOT_ENROLLED = 'none'

/**
 * Save the student's answer to "Which college are you enrolled in?".
 * Accounts whose college is verified from a college email cannot change it.
 */
export async function saveEnrolledCollege(
  answer: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Please sign in first.' }
  }
  if (answer !== NOT_ENROLLED && !isCollegeSlug(answer)) {
    return { success: false, error: 'Please choose an option.' }
  }
  if (getCollegeIdentityFromEmail(user.email)?.college) {
    // College verified from the email domain: nothing to change.
    return { success: true }
  }

  try {
    const profile = await setUserProfileCollege(
      user.id,
      answer === NOT_ENROLLED ? null : answer
    )
    if (!profile) {
      return { success: false, error: 'Could not save your answer.' }
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to save enrolled college:', error)
    return { success: false, error: 'Could not save your answer.' }
  }
}
