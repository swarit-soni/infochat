import { redirect } from 'next/navigation'

import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { safeRedirectPath } from '@/lib/auth/redirect-target'
import { getCollegeLoginConfig } from '@/lib/colleges/access'
import {
  collegePath,
  getCollegeFromPathname,
  isCollegeSlug
} from '@/lib/colleges/registry'
import { isBetaVersion } from '@/lib/version/semver'

import { LoginForm } from '@/components/login-form'

import packageJson from '../../package.json'

/** Server page for a college's mentor login, `/<college>/auth/mentor`. */
export async function CollegeMentorLoginPage({
  college,
  searchParams
}: {
  college: string
  searchParams: { next?: string; error?: string; college?: string }
}) {
  if (!isCollegeSlug(college)) {
    redirect('/auth/mentor')
  }

  // Only accept destinations inside this college's own mentor area.
  const safeNext = searchParams.next
    ? safeRedirectPath(searchParams.next)
    : undefined
  const next =
    safeNext && getCollegeFromPathname(safeNext) === college
      ? safeNext
      : undefined

  const user = await getCurrentUser()
  if (
    user?.userType === 'mentor' &&
    user.college === college &&
    !searchParams.error
  ) {
    redirect(next ?? collegePath(college, '/mentor'))
  }

  const initialError = getAuthErrorMessage(searchParams.error, {
    college: searchParams.college
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          mentorCollege={college}
          mentorDomains={getCollegeLoginConfig(college).mentorDomains}
          next={next}
          initialError={initialError}
          isBeta={isBetaVersion(packageJson.version)}
        />
      </div>
    </div>
  )
}
