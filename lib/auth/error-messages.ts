import { UNAUTHORIZED_DOMAIN_ERROR } from '@/lib/auth/domain'

export function getAuthErrorMessage(
  error: string | undefined,
  context: { collegeName?: string } = {}
): string | null {
  if (!error) {
    return null
  }

  switch (error) {
    case 'unauthorized_domain':
      return UNAUTHORIZED_DOMAIN_ERROR
    case 'wrong_college': {
      const owner = context.collegeName ?? 'another college'
      return `That Google account is a staff account at ${owner}. Each college has its own staff sign-in: use ${owner}'s staff login instead.`
    }
    case 'not_mentor':
      return "That Google account isn't a staff account for this college. Students sign in from the regular login."

    case 'oauth_failed':
      return 'Google sign-in failed. Please try again.'
    default:
      return 'Unable to sign in. Please try again.'
  }
}
