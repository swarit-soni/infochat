import { UNAUTHORIZED_DOMAIN_ERROR } from '@/lib/auth/domain'

import { LoginForm } from '@/components/login-form'

// Capabilities and provider selection depend on runtime env (AUTH_PROVIDER);
// a prerendered login page would bake in build-time values in prebuilt images.
export const dynamic = 'force-dynamic'

function getAuthErrorMessage(error: string | undefined): string | null {
  if (!error) {
    return null
  }
  switch (error) {
    case 'unauthorized_domain':
      return UNAUTHORIZED_DOMAIN_ERROR
    case 'oauth_failed':
      return 'Google sign-in failed. Please try again.'
    default:
      return 'Unable to sign in. Please try again.'
  }
}

export default async function Page(props: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await props.searchParams
  const initialError = getAuthErrorMessage(error)

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm next={next} initialError={initialError} />
      </div>
    </div>
  )
}
