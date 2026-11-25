import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/get-current-user'

/** Legacy `/mentor`: each college now has its own mentor dashboard. */
export default async function LegacyMentorPage() {
  const user = await getCurrentUser()
  redirect(
    user?.userType === 'mentor' && user.college
      ? `/${user.college}/mentor`
      : '/auth/mentor'
  )
}
