import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { isBetaVersion } from '@/lib/version/semver'

import { LoginForm } from '@/components/login-form'

import packageJson from '../../../package.json'

export const dynamic = 'force-dynamic'

export default async function MentorLoginPage(props: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await props.searchParams
  const initialError = getAuthErrorMessage(error)

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          mode="mentor"
          next={next}
          initialError={initialError}
          isBeta={isBetaVersion(packageJson.version)}
        />
      </div>
    </div>
  )
}
