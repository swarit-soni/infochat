import { applyCollegeEnvOverrides } from './access'
import {
  type College,
  type CollegeDirectory,
  type CollegeSlug,
  createCollegeDirectory
} from './registry'

/** The directory plus server-only data (never send this to a client). */
export interface ServerCollegeDirectory extends CollegeDirectory {
  /** Allowlisted mentor emails per college (lowercased). */
  mentorEmails: Readonly<Record<CollegeSlug, string[]>>
}

/**
 * Build the server directory from college rows and the mentor allowlist,
 * applying per-deployment env overrides (domains and `SERA_<SLUG>_MENTOR_EMAILS`).
 */
export function buildDirectory(
  list: College[],
  allowlist: Array<{ college: string; email: string }>,
  env: Record<string, string | undefined> = process.env
): ServerCollegeDirectory {
  const withEnv = list.map(college => applyCollegeEnvOverrides(college, env))
  const directory = createCollegeDirectory(withEnv)
  const mentorEmails: Record<CollegeSlug, string[]> = Object.create(null)
  for (const college of directory.list) {
    mentorEmails[college.slug] = []
  }
  for (const entry of allowlist) {
    mentorEmails[entry.college]?.push(entry.email.trim().toLowerCase())
  }
  for (const college of directory.list) {
    mentorEmails[college.slug].push(...envMentorEmails(college.slug, env))
  }
  return { ...directory, mentorEmails }
}

function envMentorEmails(
  slug: CollegeSlug,
  env: Record<string, string | undefined>
): string[] {
  const value =
    env[`SERA_${slug.toUpperCase().replace(/-/g, '_')}_MENTOR_EMAILS`]
  return (value ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => /^[^@\s]+@[^@\s]+$/.test(email))
}
