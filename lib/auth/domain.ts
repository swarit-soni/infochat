import {
  type CollegeIdentity,
  type IdentityDirectory,
  isNonProductionStage,
  resolveCollegeIdentity
} from '@/lib/colleges/access'

export { isNonProductionStage }
export type { CollegeIdentity }

export const USER_TYPES = ['mentor', 'student'] as const

export type UserType = (typeof USER_TYPES)[number]

export const USER_TYPE_LABELS: Readonly<Record<UserType, string>> = {
  mentor: 'Staff',
  student: 'Student'
}

export const UNAUTHORIZED_DOMAIN_ERROR = 'Please sign in with a Google account.'

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
 * Resolve the college an email is verified for (from college email domains)
 * and its role there, or null when it is on no college's domain.
 */
export function getCollegeIdentityFromEmail(
  email: string | null | undefined,
  directory: IdentityDirectory,
  env: Record<string, string | undefined> = process.env
): CollegeIdentity | null {
  return resolveCollegeIdentity(email, directory, env)
}

/** The role an email's college domain grants, or null. */
export function getUserTypeFromEmail(
  email: string | null | undefined,
  directory: IdentityDirectory,
  env: Record<string, string | undefined> = process.env
): UserType | null {
  return resolveCollegeIdentity(email, directory, env)?.userType ?? null
}

/**
 * Return true for any structurally valid email address. Sign-in is open to all
 * Google accounts; college domains only decide mentor access and, for
 * students on a college domain, their college.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email) !== null
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
