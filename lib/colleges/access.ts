import type { College, CollegeRole, CollegeSlug } from './registry'

type Env = Record<string, string | undefined>

/** The parts of the directory identity resolution needs. */
export interface IdentityDirectory {
  list: College[]
  /** Allowlisted mentor emails per college (lowercased). */
  mentorEmails?: Readonly<Record<CollegeSlug, string[]>>
}

export interface CollegeIdentity {
  college: CollegeSlug
  userType: CollegeRole
}

function envKey(slug: CollegeSlug, suffix: string): string {
  return `SERA_${slug.toUpperCase().replace(/-/g, '_')}_${suffix}`
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
 * Per-deployment overrides of a college's login domains:
 * `SERA_<SLUG>_MENTOR_DOMAINS` / `SERA_<SLUG>_STUDENT_DOMAINS` (comma
 * separated; an empty value disables that role). Mainly for previews.
 */
export function applyCollegeEnvOverrides(
  college: College,
  env: Env = process.env
): College {
  return {
    ...college,
    mentorDomains:
      parseList(env[envKey(college.slug, 'MENTOR_DOMAINS')]) ??
      college.mentorDomains,
    studentDomains:
      parseList(env[envKey(college.slug, 'STUDENT_DOMAINS')]) ??
      college.studentDomains
  }
}

/** Whether a role can sign in to this college. */
export function isCollegeRoleEnabled(
  college: College,
  role: CollegeRole
): boolean {
  return role === 'mentor'
    ? college.mentorDomains.length > 0
    : college.studentDomains.length > 0
}

/**
 * The single domain Google should pre-filter the mentor account picker to,
 * or undefined when several (or none) are accepted.
 */
export function getLoginHintDomain(
  college: College,
  role: CollegeRole,
  env: Env = process.env
): string | undefined {
  const domains =
    role === 'mentor' ? college.mentorDomains : college.studentDomains
  if (role === 'mentor' && getNonProdMentorOverrides(env).size > 0) {
    // Test mentors may use other domains; do not hide them in the picker.
    return undefined
  }
  return domains.length === 1 ? domains[0] : undefined
}

/**
 * Strictly non-production test mentors (`SERA_MENTOR_EMAILS`), as
 * `college:email` entries, mapped to the college they mentor.
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
    const separator = entry.indexOf(':')
    if (separator <= 0) continue
    const college = entry.slice(0, separator).trim().toLowerCase()
    const email = normalizeEmailValue(entry.slice(separator + 1))
    if (college && email) {
      overrides.set(email, college)
    }
  }
  return overrides
}

/**
 * Resolve which college a Google account is verified for, and its role there,
 * from the colleges' email domains. Null when the email is on no college's
 * domain (such accounts can still sign in as students and pick a college).
 *
 * Domains are expected not to overlap between colleges; if they do, the first
 * college in display order wins.
 */
export function resolveCollegeIdentity(
  email: string | null | undefined,
  directory: IdentityDirectory,
  env: Env = process.env
): CollegeIdentity | null {
  const normalized = normalizeEmailValue(email)
  if (!normalized) return null

  const override = getNonProdMentorOverrides(env).get(normalized)
  if (override && directory.list.some(c => c.slug === override)) {
    return { college: override, userType: 'mentor' }
  }

  const domain = normalized.slice(normalized.indexOf('@') + 1)
  for (const college of directory.list) {
    const mentorDomain = college.mentorDomains.includes(domain)
    const studentDomain = college.studentDomains.includes(domain)
    if (!mentorDomain && !studentDomain) continue

    const allowlisted =
      directory.mentorEmails?.[college.slug]?.includes(normalized) ?? false
    if (mentorDomain && (!college.mentorRequiresAllowlist || allowlisted)) {
      return { college: college.slug, userType: 'mentor' }
    }
    if (studentDomain) {
      return { college: college.slug, userType: 'student' }
    }
    // A mentor-only domain without allowlist membership is not a college identity.
    return null
  }

  return null
}
