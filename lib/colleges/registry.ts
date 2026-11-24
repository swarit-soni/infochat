/**
 * College types and pure helpers. Colleges are data: they live in the
 * `colleges` table and are managed by platform admins at /admin/colleges.
 * The server loads them into a `CollegeDirectory` (lib/colleges/store.ts);
 * every helper here works on that directory and is safe on the client.
 */

/** A college's URL-safe id, e.g. `kalvium` (used in `/<slug>/mentor`). */
export type CollegeSlug = string

export type CollegeRole = 'mentor' | 'student'

export interface College {
  slug: CollegeSlug
  name: string
  shortName: string
  /** Physical campus location; empty for multi-campus programmes. */
  location: string
  website: string
  /** Official domains the assistant may use for its live web fallback. */
  officialWebDomains: string[]
  /**
   * Partner campuses whose records this college's students may also read
   * (e.g. Kalvium students study on partner university campuses). Each
   * student picks their campus at onboarding.
   */
  partnerColleges: CollegeSlug[]
  /** Email domains whose Google accounts are this college's mentors. */
  mentorDomains: string[]
  /** Email domains whose Google accounts are this college's students. */
  studentDomains: string[]
  /**
   * When mentors and students share a domain, mentors must also be on the
   * college's mentor allowlist (managed server-side, never sent to clients).
   */
  mentorRequiresAllowlist: boolean
  /** Other names people use for the college, for spotting who issued a notice. */
  aliases: string[]
  /** Label for the squad/batch/section cohort field; null hides it. */
  squadLabel: string | null
  /** Label for the hostel/day-scholar cohort field; null hides it. */
  residencyLabel: string | null
  /** What the college calls its events listing (e.g. "Eventum"). */
  eventsLabel: string
  /**
   * Google Chat space resource names (`spaces/AAAA…`) whose announcements
   * the webhook files under this college.
   */
  gchatSpaces: string[]
  enabled: boolean
  sortOrder: number
}

export interface CollegeDirectory {
  /** Enabled colleges, in display order. */
  list: College[]
  bySlug: Readonly<Record<CollegeSlug, College>>
}

/**
 * A student's partner campus answer: a partner college's slug, `NO_CAMPUS`
 * for a campus not on Sera, or null when not answered yet.
 */
export const NO_CAMPUS = 'none'

/**
 * Cookie carrying the college a mentor sign-in was started for. The OAuth
 * callback only accepts that college's mentors, which keeps each college's
 * mentor login disconnected from the others.
 */
export const AUTH_COLLEGE_COOKIE = 'auth_college'

export const COLLEGE_SLUG_PATTERN = /^[a-z][a-z0-9-]{1,31}$/

/**
 * Top-level paths that are app routes, never college areas. A new college
 * may not use one of these slugs.
 */
export const RESERVED_COLLEGE_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'auth',
  'mentor',
  'none',
  'onboarding',
  'relay',
  'search',
  'share',
  'favicon.ico',
  '_next'
])

export function isValidCollegeSlugFormat(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    COLLEGE_SLUG_PATTERN.test(value) &&
    !RESERVED_COLLEGE_SLUGS.has(value)
  )
}

export function createCollegeDirectory(colleges: College[]): CollegeDirectory {
  const list = colleges
    .filter(college => college.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  const bySlug: Record<CollegeSlug, College> = Object.create(null)
  for (const college of list) {
    bySlug[college.slug] = college
  }
  return { list, bySlug }
}

export function isCollegeSlug(
  directory: CollegeDirectory,
  value: unknown
): value is CollegeSlug {
  return typeof value === 'string' && Object.hasOwn(directory.bySlug, value)
}

export function getCollege(
  directory: CollegeDirectory,
  slug: CollegeSlug | null | undefined
): College | null {
  return slug && Object.hasOwn(directory.bySlug, slug)
    ? directory.bySlug[slug]
    : null
}

/** Short display name, falling back to the slug for unknown colleges. */
export function collegeShortName(
  directory: CollegeDirectory,
  slug: CollegeSlug
): string {
  return getCollege(directory, slug)?.shortName ?? slug
}

/** The partner campuses a college's students can choose from. */
export function getPartnerCampuses(
  directory: CollegeDirectory,
  slug: CollegeSlug | null | undefined
): College[] {
  const college = getCollege(directory, slug)
  if (!college) return []
  return college.partnerColleges
    .filter(partner => partner !== college.slug)
    .map(partner => getCollege(directory, partner))
    .filter((partner): partner is College => partner !== null)
}

/**
 * Colleges whose shared records (knowledge base, events, portals) a user may
 * read: their college plus their partner campus. Without a college (admission
 * seekers, guests) every college is visible. A student who hasn't said which
 * partner campus they are on sees all of their college's partners.
 */
export function getVisibleCollegesFor(
  directory: CollegeDirectory,
  slug: CollegeSlug | null | undefined,
  campus: string | null = null
): CollegeSlug[] {
  const college = getCollege(directory, slug)
  if (!college) return directory.list.map(c => c.slug)

  const partners = getPartnerCampuses(directory, college.slug).map(p => p.slug)
  if (campus === NO_CAMPUS) return [college.slug]
  if (campus && partners.includes(campus)) return [college.slug, campus]
  return [college.slug, ...partners]
}

/** Official web domains for the visible colleges, deduplicated. */
export function getOfficialWebDomains(
  directory: CollegeDirectory,
  slug: CollegeSlug | null | undefined,
  campus: string | null = null
): string[] {
  return [
    ...new Set(
      getVisibleCollegesFor(directory, slug, campus).flatMap(
        c => getCollege(directory, c)?.officialWebDomains ?? []
      )
    )
  ]
}

/** Prefix an app path with the college's area, e.g. `/kalvium/mentor`. */
export function collegePath(slug: CollegeSlug, path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized === '/' ? `/${slug}` : `/${slug}${normalized}`
}

/**
 * The college segment of a pathname (`/<slug>/...`) when it is shaped like a
 * college slug, otherwise null. Syntactic only: pages check the slug against
 * the directory, which this cannot see (e.g. in middleware).
 */
export function getCollegeSegment(
  pathname: string | null | undefined
): CollegeSlug | null {
  if (!pathname) return null
  const segment = pathname.split('/')[1]
  return isValidCollegeSlugFormat(segment) ? segment : null
}

/** Display label for a document's issuing authority (a college slug or `joint`). */
export function formatAuthority(
  directory: CollegeDirectory,
  authority: string
): string {
  if (authority === 'joint') return 'Joint notice'
  return getCollege(directory, authority)?.name ?? authority
}
