import { redirect } from 'next/navigation'

import type { UserType } from '@/lib/auth/domain'
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

/**
 * Shared server page for `/<college>/auth/student` and
 * `/<college>/auth/mentor`.
 */
export async function CollegeLoginPage({
  college,
  mode,
  searchParams
}: {
  college: string
  mode: UserType
  searchParams: { next?: string; error?: string; college?: string }
}) {
  if (!isCollegeSlug(college)) {
    redirect('/')
  }

  // Only accept destinations inside this college's own area.
  const safeNext = searchParams.next
    ? safeRedirectPath(searchParams.next)
    : undefined
  const next =
    safeNext && getCollegeFromPathname(safeNext) === college
      ? safeNext
      : undefined

  const user = await getCurrentUser()
  if (user?.college === college && !searchParams.error) {
    redirect(next ?? collegePath(college, mode === 'mentor' ? '/mentor' : '/'))
  }

  const config = getCollegeLoginConfig(college)
  const loginDomains =
    mode === 'mentor' ? config.mentorDomains : config.studentDomains
  const initialError = getAuthErrorMessage(searchParams.error, {
    college: searchParams.college
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          college={college}
          mode={mode}
          next={next}
          loginDomains={loginDomains}
          initialError={initialError}
          isBeta={isBetaVersion(packageJson.version)}
        />
      </div>
    </div>
  )
}
