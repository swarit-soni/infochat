import { UNAUTHORIZED_DOMAIN_ERROR } from '@/lib/auth/domain'

export function getAuthErrorMessage(error: string | undefined): string | null {
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
