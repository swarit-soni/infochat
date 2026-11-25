import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { isOpenStudentCollege } from '@/lib/colleges/access'
import { getCollege, NOT_ENROLLED_COLLEGE } from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'
import { isBetaVersion } from '@/lib/version/semver'

import { LoginForm, type StudentCollegeOption } from '@/components/login-form'

import packageJson from '../../../package.json'

// Capabilities and provider selection depend on runtime env (AUTH_PROVIDER);
// a prerendered login page would bake in build-time values in prebuilt images.
export const dynamic = 'force-dynamic'

export default async function Page(props: {
  searchParams: Promise<{
    next?: string
    error?: string
    college?: string
    actual?: string
  }>
}) {
  const { next, error, college, actual } = await props.searchParams
  const directory = await getCollegeDirectory()

  const selectedCollege =
    college && college !== NOT_ENROLLED_COLLEGE
      ? getCollege(directory, college)
      : null
  const initialCollege =
    college === NOT_ENROLLED_COLLEGE || selectedCollege ? college : null
  const actualCollege = getCollege(directory, actual)

  const initialError = getAuthErrorMessage(error, {
    collegeName: selectedCollege?.shortName,
    expectedDomains: selectedCollege?.studentDomains,
    actualCollegeName: actualCollege?.shortName
  })

  const studentColleges: StudentCollegeOption[] = directory.list.map(entry => ({
    slug: entry.slug,
    name: entry.name,
    shortName: entry.shortName,
    location: entry.location,
    studentDomains: entry.studentDomains,
    openAccess: isOpenStudentCollege(entry)
  }))

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md items-center justify-center p-6 md:p-10">
        <LoginForm
          studentColleges={studentColleges}
          initialCollege={initialCollege}
          next={next}
          initialError={initialError}
          isBeta={isBetaVersion(packageJson.version)}
        />
      </div>
    </div>
  )
}
