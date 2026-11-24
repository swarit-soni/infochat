export const USER_TYPES = ['mentor', 'student'] as const

export type UserType = (typeof USER_TYPES)[number]

export const ALLOWED_EMAIL_DOMAINS: Readonly<Record<string, UserType>> = {
  'kalvium.com': 'mentor',
  'kalvium.community': 'student'
}

export const DOMAIN_BY_USER_TYPE: Readonly<Record<UserType, string>> = {
  mentor: 'kalvium.com',
  student: 'kalvium.community'
}

export const USER_TYPE_LABELS: Readonly<Record<UserType, string>> = {
  mentor: 'Mentor',
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
 * Return true only in non-production runtime stages (Vercel Preview/Development
 * or local non-production Node environments).
 */
export function isNonProductionStage(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (env.VERCEL_ENV) {
    return env.VERCEL_ENV !== 'production'
  }
  return env.NODE_ENV !== 'production'
}

/**
 * Parse comma-separated `SERA_MENTOR_EMAILS` strictly in non-production stages.
 * Returns an empty set in production.
 */
export function getNonProdMentorEmails(
  env: Record<string, string | undefined> = process.env
): ReadonlySet<string> {
  if (!isNonProductionStage(env) || !env.SERA_MENTOR_EMAILS) {
    return new Set()
  }

  const emails = new Set<string>()
  for (const rawEntry of env.SERA_MENTOR_EMAILS.split(',')) {
    const normalized = normalizeEmail(rawEntry)
    if (normalized) {
      emails.add(normalized)
    }
  }
  return emails
}

/**
 * Return true if the email matches a strictly non-production mentor test override.
 */
export function isNonProdMentorEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return false
  }
  return getNonProdMentorEmails(env).has(normalized)
}

/**
 * Return true only when the email belongs to an official Kalvium domain
 * (`kalvium.com` or `kalvium.community`).
 */
export function isKalviumDomainEmail(
  email: string | null | undefined
): boolean {
  const domain = extractEmailDomain(email)
  return Boolean(domain && Object.hasOwn(ALLOWED_EMAIL_DOMAINS, domain))
}

/**
 * Return true when non-production `SERA_MENTOR_EMAILS` includes a non-`@kalvium.com`
 * test mentor email, so OAuth skips Google's `hd=kalvium.com` account picker filter.
 */
export function hasNonKalviumMentorOverride(
  env: Record<string, string | undefined> = process.env
): boolean {
  for (const email of getNonProdMentorEmails(env)) {
    if (extractEmailDomain(email) !== DOMAIN_BY_USER_TYPE.mentor) {
      return true
    }
  }
  return false
}

/**
 * Resolve the Kalvium user type from an email's exact domain (or strictly
 * non-production `SERA_MENTOR_EMAILS` override), or null if disallowed.
 */
export function getUserTypeFromEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): UserType | null {
  if (isNonProdMentorEmail(email, env)) {
    return 'mentor'
  }
  const domain = extractEmailDomain(email)
  if (!domain || !Object.hasOwn(ALLOWED_EMAIL_DOMAINS, domain)) {
    return null
  }
  return ALLOWED_EMAIL_DOMAINS[domain]
}

/**
 * Return true for any structurally valid email address. Sign-in is open to all
 * Google accounts; Kalvium domains only decide the mentor/student user type.
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
