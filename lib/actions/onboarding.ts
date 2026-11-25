'use server'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import {
  getCollege,
  getPartnerCampuses,
  NO_CAMPUS
} from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'
import { setUserProfileCollege } from '@/lib/db/actions'

/** Answer value for students who are not enrolled at any listed college. */
const NOT_ENROLLED = 'none'

/**
 * Save the student's answers to "Which college are you enrolled in?" and,
 * for colleges with partner campuses, "Which campus are you on?". A college
 * verified from the student's email domain cannot be changed here; only the
 * campus is saved for it.
 */
export async function saveEnrolledCollege(
  answer: string,
  campusAnswer?: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user?.email) {
    return { success: false, error: 'Please sign in first.' }
  }
  const email = user.email

  const directory = await getCollegeDirectory()
  const college = user.collegeVerified
    ? user.college
    : answer === NOT_ENROLLED
      ? null
      : (getCollege(directory, answer)?.slug ?? undefined)
  if (college === undefined) {
    return { success: false, error: 'Please choose an option.' }
  }

  const campuses = getPartnerCampuses(directory, college)
  let campus: string | null = null
  if (campuses.length > 0) {
    if (
      campusAnswer !== NO_CAMPUS &&
      !campuses.some(option => option.slug === campusAnswer)
    ) {
      return { success: false, error: 'Please choose your campus.' }
    }
    campus = campusAnswer ?? null
  }

  try {
    const profile = await setUserProfileCollege(
      { id: user.id, email, userType: user.userType },
      college,
      campus
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
