import { UNAUTHORIZED_DOMAIN_ERROR } from '@/lib/auth/domain'

export function getAuthErrorMessage(
  error: string | undefined,
  context: {
    collegeName?: string
    expectedDomains?: string[]
    actualCollegeName?: string
  } = {}
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
    case 'wrong_student_domain': {
      const domains = context.expectedDomains?.map(d => `@${d}`).join(' / ')
      const target = context.collegeName ?? 'that college'
      if (context.actualCollegeName) {
        return domains
          ? `That Google account belongs to ${context.actualCollegeName}, not ${target}. Sign in with your ${target} Google account (${domains}), or choose ${context.actualCollegeName} instead.`
          : `That Google account belongs to ${context.actualCollegeName}, not ${target}. Choose ${context.actualCollegeName} or sign in with your ${target} Google account.`
      }
      return domains
        ? `Please sign in with your ${target} Google account (${domains}) to save ${target} as your enrolled college, or choose "Not enrolled yet".`
        : `Please sign in with your ${target} Google account to save ${target} as your enrolled college, or choose "Not enrolled yet".`
    }
    case 'college_unavailable':
      return `Student sign-in for ${context.collegeName ?? 'this college'} is not set up yet. Choose another college or "Not enrolled yet".`
    case 'oauth_failed':
      return 'Google sign-in failed. Please try again.'
    default:
      return 'Unable to sign in. Please try again.'
  }
}
