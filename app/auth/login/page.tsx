import type { UserType } from '@/lib/auth/domain'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { isBetaVersion } from '@/lib/version/semver'

import { LoginForm } from '@/components/login-form'

import packageJson from '../../../package.json'

// Capabilities and provider selection depend on runtime env (AUTH_PROVIDER);
// a prerendered login page would bake in build-time values in prebuilt images.
export const dynamic = 'force-dynamic'

export default async function Page(props: {
  searchParams: Promise<{ next?: string; error?: string; role?: string }>
}) {
  const { next, error, role } = await props.searchParams
  const initialError = getAuthErrorMessage(error)
  const initialMode: UserType = role === 'mentor' ? 'mentor' : 'student'

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          mode={initialMode}
          next={next}
          initialError={initialError}
          isBeta={isBetaVersion(packageJson.version)}
        />
      </div>
    </div>
  )
}
