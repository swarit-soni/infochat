export const USER_TYPES = ['mentor', 'student'] as const

export type UserType = (typeof USER_TYPES)[number]

export const ALLOWED_EMAIL_DOMAINS: Readonly<Record<string, UserType>> = {
  'kalvium.com': 'mentor',
  'kalvium.community': 'student'
}

export const USER_TYPE_LABELS: Readonly<Record<UserType, string>> = {
  mentor: 'Mentor',
  student: 'Student'
}

export const UNAUTHORIZED_DOMAIN_ERROR =
  'Only @kalvium.com (Mentor) and @kalvium.community (Student) Google accounts are allowed.'

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
 * Resolve the Kalvium user type from an email's exact domain, or null if disallowed.
 */
export function getUserTypeFromEmail(
  email: string | null | undefined
): UserType | null {
  const domain = extractEmailDomain(email)
  if (!domain || !Object.hasOwn(ALLOWED_EMAIL_DOMAINS, domain)) {
    return null
  }
  return ALLOWED_EMAIL_DOMAINS[domain]
}

/**
 * Return true only for allowed @kalvium.com and @kalvium.community email addresses.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  return getUserTypeFromEmail(email) !== null
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
