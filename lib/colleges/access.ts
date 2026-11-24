import {
  COLLEGE_SLUGS,
  type CollegeRole,
  COLLEGES,
  type CollegeSlug
} from './registry'

type Env = Record<string, string | undefined>

export interface CollegeLoginConfig {
  mentorDomains: string[]
  studentDomains: string[]
  mentorRequiresAllowlist: boolean
  /** Emails allowed to sign in as mentors when the domain is shared. */
  mentorEmails: string[]
}

export interface CollegeIdentity {
  college: CollegeSlug
  userType: CollegeRole
}

function envKey(slug: CollegeSlug, suffix: string): string {
  return `SERA_${slug.toUpperCase()}_${suffix}`
}

function parseList(value: string | undefined): string[] | null {
  if (value === undefined) return null
  return value
    .split(',')
    .map(entry => entry.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

function normalizeEmailValue(email: string | null | undefined): string | null {
  if (typeof email !== 'string') return null
  const normalized = email.trim().toLowerCase()
  const parts = normalized.split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  if (/\s/.test(normalized)) return null
  return normalized
}

/**
 * Whether the runtime is a non-production stage (Vercel Preview/Development,
 * or a local non-production Node environment).
 */
export function isNonProductionStage(env: Env = process.env): boolean {
  if (env.VERCEL_ENV) {
    return env.VERCEL_ENV !== 'production'
  }
  return env.NODE_ENV !== 'production'
}

/**
 * Login rules for a college: registry defaults, overridable per deployment
 * with `SERA_<SLUG>_MENTOR_DOMAINS`, `SERA_<SLUG>_STUDENT_DOMAINS` (comma
 * separated; an empty value disables that role) and `SERA_<SLUG>_MENTOR_EMAILS`.
 */
export function getCollegeLoginConfig(
  slug: CollegeSlug,
  env: Env = process.env
): CollegeLoginConfig {
  const defaults = COLLEGES[slug].login
  return {
    mentorDomains: parseList(env[envKey(slug, 'MENTOR_DOMAINS')]) ?? [
      ...defaults.mentorDomains
    ],
    studentDomains: parseList(env[envKey(slug, 'STUDENT_DOMAINS')]) ?? [
      ...defaults.studentDomains
    ],
    mentorRequiresAllowlist: defaults.mentorRequiresAllowlist,
    mentorEmails: (parseList(env[envKey(slug, 'MENTOR_EMAILS')]) ?? [])
      .map(normalizeEmailValue)
      .filter((email): email is string => Boolean(email))
  }
}

/** Whether anyone can sign in to this college's area in this deployment. */
export function isCollegeLoginEnabled(
  slug: CollegeSlug,
  env: Env = process.env
): boolean {
  const config = getCollegeLoginConfig(slug, env)
  return config.mentorDomains.length > 0 || config.studentDomains.length > 0
}

/** Whether a role can sign in to this college in this deployment. */
export function isCollegeRoleEnabled(
  slug: CollegeSlug,
  role: CollegeRole,
  env: Env = process.env
): boolean {
  const config = getCollegeLoginConfig(slug, env)
  return role === 'mentor'
    ? config.mentorDomains.length > 0
    : config.studentDomains.length > 0
}

/**
 * The single domain Google should pre-filter the account picker to, or
 * undefined when the role accepts several domains (or none).
 */
export function getLoginHintDomain(
  slug: CollegeSlug,
  role: CollegeRole,
  env: Env = process.env
): string | undefined {
  const config = getCollegeLoginConfig(slug, env)
  const domains =
    role === 'mentor' ? config.mentorDomains : config.studentDomains
  if (role === 'mentor' && getNonProdMentorOverrides(env).size > 0) {
    // Test mentors may use other domains; do not hide them in the picker.
    return undefined
  }
  return domains.length === 1 ? domains[0] : undefined
}

/**
 * Strictly non-production test mentors (`SERA_MENTOR_EMAILS`), mapped to the
 * college they act as mentors for. `SERA_MENTOR_EMAILS` entries may be
 * written `college:email`; bare emails default to Kalvium for compatibility.
 */
export function getNonProdMentorOverrides(
  env: Env = process.env
): ReadonlyMap<string, CollegeSlug> {
  const overrides = new Map<string, CollegeSlug>()
  if (!isNonProductionStage(env) || !env.SERA_MENTOR_EMAILS) {
    return overrides
  }
  for (const rawEntry of env.SERA_MENTOR_EMAILS.split(',')) {
    const entry = rawEntry.trim()
    if (!entry) continue
    const separator = entry.indexOf(':')
    const prefix = separator > 0 ? entry.slice(0, separator).trim() : null
    const college = prefix && isSlug(prefix) ? prefix : 'kalvium'
    const email = normalizeEmailValue(
      prefix && isSlug(prefix) ? entry.slice(separator + 1) : entry
    )
    if (email) {
      overrides.set(email, college)
    }
  }
  return overrides
}

function isSlug(value: string): value is CollegeSlug {
  return (COLLEGE_SLUGS as readonly string[]).includes(value)
}

/**
 * Resolve which college a Google account belongs to and its role there, or
 * null when the account belongs to no configured college.
 *
 * Each account belongs to exactly one college. Domains are expected not to
 * overlap between colleges; if a misconfiguration makes them overlap, the
 * first college in registry order wins.
 */
export function resolveCollegeIdentity(
  email: string | null | undefined,
  env: Env = process.env
): CollegeIdentity | null {
  const normalized = normalizeEmailValue(email)
  if (!normalized) return null

  const override = getNonProdMentorOverrides(env).get(normalized)
  if (override) {
    return { college: override, userType: 'mentor' }
  }

  const domain = normalized.slice(normalized.indexOf('@') + 1)
  for (const slug of COLLEGE_SLUGS) {
    const config = getCollegeLoginConfig(slug, env)
    const mentorDomain = config.mentorDomains.includes(domain)
    const studentDomain = config.studentDomains.includes(domain)
    if (!mentorDomain && !studentDomain) continue

    if (
      mentorDomain &&
      (!config.mentorRequiresAllowlist ||
        config.mentorEmails.includes(normalized))
    ) {
      return { college: slug, userType: 'mentor' }
    }
    if (studentDomain) {
      return { college: slug, userType: 'student' }
    }
    // A mentor-only domain without allowlist membership is not accepted.
    return null
  }

  return null
}

/**
 * The college used for users whose identity does not come from a college
 * email (anonymous mode, Better Auth, guests without a college in the URL).
 */
export function getDefaultCollege(env: Env = process.env): CollegeSlug {
  const configured = env.SERA_DEFAULT_COLLEGE?.trim().toLowerCase()
  return configured && isSlug(configured) ? configured : 'kalvium'
}
