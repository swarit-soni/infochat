/**
 * College (tenant) registry. Every college gets its own area of the app at
 * `/<slug>/...` with separate logins, dashboards and knowledge base.
 *
 * This module is client-safe: it holds static metadata only. Login domains
 * can be overridden per deployment through env vars, which are resolved on
 * the server in `lib/colleges/access.ts`.
 */

export const COLLEGE_SLUGS = ['kalvium', 'jecrc', 'bkbirla'] as const

/**
 * Cookie carrying the college a Google sign-in was started for. The OAuth
 * callback only accepts accounts that belong to this college, which keeps
 * each college's login disconnected from the others.
 */
export const AUTH_COLLEGE_COOKIE = 'auth_college'

export type CollegeSlug = (typeof COLLEGE_SLUGS)[number]

export type CollegeRole = 'mentor' | 'student'

export interface CollegeLoginDefaults {
  /** Email domains whose Google accounts may sign in as mentors. */
  mentorDomains: readonly string[]
  /** Email domains whose Google accounts may sign in as students. */
  studentDomains: readonly string[]
  /**
   * When mentors and students share a domain, the domain alone cannot tell
   * them apart. Mentors must then also be listed in the college's mentor
   * allowlist (`SERA_<SLUG>_MENTOR_EMAILS`); everyone else is a student.
   */
  mentorRequiresAllowlist: boolean
}

export interface CollegeConfig {
  slug: CollegeSlug
  name: string
  shortName: string
  location: string
  website: string
  /** Official domains the assistant may use for its live web fallback. */
  officialWebDomains: readonly string[]
  /**
   * Colleges whose knowledge base, events and portals this college's users
   * may also read (e.g. Kalvium students study on the JECRC campus).
   */
  partnerColleges: readonly CollegeSlug[]
  login: CollegeLoginDefaults
}

export const COLLEGES: Readonly<Record<CollegeSlug, CollegeConfig>> = {
  kalvium: {
    slug: 'kalvium',
    name: 'Kalvium',
    shortName: 'Kalvium',
    location: 'Partner university campuses across India',
    website: 'https://kalvium.com',
    officialWebDomains: ['kalvium.com'],
    partnerColleges: ['jecrc'],
    login: {
      mentorDomains: ['kalvium.com'],
      studentDomains: ['kalvium.community'],
      mentorRequiresAllowlist: false
    }
  },
  jecrc: {
    slug: 'jecrc',
    name: 'JECRC University',
    shortName: 'JECRC',
    location: 'Jaipur, Rajasthan',
    website: 'https://jecrcuniversity.edu.in',
    officialWebDomains: ['jecrcuniversity.edu.in'],
    partnerColleges: [],
    login: {
      mentorDomains: ['jecrcu.edu.in'],
      studentDomains: ['jecrcu.edu.in'],
      mentorRequiresAllowlist: true
    }
  },
  bkbirla: {
    slug: 'bkbirla',
    name: 'B. K. Birla College of Arts, Science & Commerce (Autonomous), Kalyan',
    shortName: 'B.K. Birla College',
    location: 'Kalyan, Maharashtra',
    website: 'https://bkbck.edu.in',
    officialWebDomains: ['bkbck.edu.in'],
    partnerColleges: [],
    // No confirmed Google Workspace domains yet: login stays disabled until
    // SERA_BKBIRLA_MENTOR_DOMAINS / SERA_BKBIRLA_STUDENT_DOMAINS are set.
    login: {
      mentorDomains: [],
      studentDomains: [],
      mentorRequiresAllowlist: false
    }
  }
}

export function isCollegeSlug(value: unknown): value is CollegeSlug {
  return (
    typeof value === 'string' &&
    (COLLEGE_SLUGS as readonly string[]).includes(value)
  )
}

export function getCollege(slug: CollegeSlug): CollegeConfig {
  return COLLEGES[slug]
}

/**
 * The colleges whose shared data (knowledge base, events, portals) a user of
 * `slug` may read: the college itself plus its partner colleges.
 */
export function getVisibleColleges(slug: CollegeSlug): CollegeSlug[] {
  return [slug, ...COLLEGES[slug].partnerColleges.filter(p => p !== slug)]
}

/** Official web domains for a college and its partners, deduplicated. */
export function getOfficialWebDomains(slug: CollegeSlug): string[] {
  return [
    ...new Set(
      getVisibleColleges(slug).flatMap(c => COLLEGES[c].officialWebDomains)
    )
  ]
}

/** Prefix an app path with the college's area, e.g. `/kalvium/search/abc`. */
export function collegePath(slug: CollegeSlug, path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized === '/' ? `/${slug}` : `/${slug}${normalized}`
}

/**
 * Return the college slug when `pathname` lies inside a college area
 * (`/<slug>` or `/<slug>/...`), otherwise null.
 */
export function getCollegeFromPathname(
  pathname: string | null | undefined
): CollegeSlug | null {
  if (!pathname) return null
  const segment = pathname.split('/')[1]
  return isCollegeSlug(segment) ? segment : null
}
