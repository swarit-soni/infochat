import {
  type CollegeIdentity,
  isNonProductionStage,
  resolveCollegeIdentity
} from '@/lib/colleges/access'

export { isNonProductionStage }
export type { CollegeIdentity }

export const USER_TYPES = ['mentor', 'student'] as const

export type UserType = (typeof USER_TYPES)[number]

export const USER_TYPE_LABELS: Readonly<Record<UserType, string>> = {
  mentor: 'Mentor',
  student: 'Student'
}

export const UNAUTHORIZED_DOMAIN_ERROR =
  "This Google account doesn't belong to any college on Sera. Sign in with your college Google account."

export interface AuthUserMetadataContainer {
  app_metadata?: {
    provider?: unknown
    providers?: unknown
  } | null
}

/**
 * Trim and lowercase an email address, returning null if empty or structurally invalid.
 */
export function normalizeEmail(
  email: string | null | undefined
): string | null {
  if (typeof email !== 'string') {
    return null
  }
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  const parts = normalized.split('@')
  if (parts.length !== 2) {
    return null
  }
  const [local, domain] = parts
  if (!local || !domain || /\s/.test(local) || /\s/.test(domain)) {
    return null
  }
  return normalized
}

/**
 * Extract the lowercased domain from an email with exactly one `@`,
 * non-empty local part, and non-empty domain.
 */
export function extractEmailDomain(
  email: string | null | undefined
): string | null {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return null
  }
  const atIndex = normalized.indexOf('@')
  const domain = normalized.slice(atIndex + 1)
  return domain || null
}

/**
 * Resolve the college and role for an email, or null if the account does not
 * belong to any configured college. See `resolveCollegeIdentity`.
 */
export function getCollegeIdentityFromEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): CollegeIdentity | null {
  return resolveCollegeIdentity(email, env)
}

/**
 * Resolve the user type from an email's college login rules, or null if the
 * account belongs to no configured college.
 */
export function getUserTypeFromEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): UserType | null {
  return resolveCollegeIdentity(email, env)?.userType ?? null
}

/** Return true when the email belongs to a configured college. */
export function isAllowedEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  return resolveCollegeIdentity(email, env) !== null
}

/**
 * Verify that the Supabase Auth user authenticated via Google using server-controlled
 * `app_metadata` (never `user_metadata`).
 */
export function isGoogleAuthUser(
  user: AuthUserMetadataContainer | null | undefined
): boolean {
  if (!user?.app_metadata || typeof user.app_metadata !== 'object') {
    return false
  }
  const { provider, providers } = user.app_metadata
  if (provider === 'google') {
    return true
  }
  return Array.isArray(providers) && providers.includes('google')
}
