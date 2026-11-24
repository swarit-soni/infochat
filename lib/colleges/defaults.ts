import type { College } from './registry'

/**
 * The colleges Sera launched with. They seed the `colleges` table
 * (drizzle/0025_colleges_table.sql) and are only used at runtime if that
 * table can't be read (e.g. local development without a database). Edit
 * colleges at /admin/colleges, not here.
 */
export const DEFAULT_COLLEGES: College[] = [
  {
    slug: 'kalvium',
    name: 'Kalvium',
    shortName: 'Kalvium',
    location: '',
    website: 'https://kalvium.com',
    officialWebDomains: ['kalvium.com'],
    partnerColleges: ['jecrc'],
    mentorDomains: ['kalvium.com'],
    studentDomains: ['kalvium.community'],
    mentorRequiresAllowlist: false,
    aliases: ['Kalvium'],
    squadLabel: 'Squad',
    residencyLabel: 'Residency',
    eventsLabel: 'Eventum',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 10
  },
  {
    slug: 'jecrc',
    name: 'JECRC University',
    shortName: 'JECRC',
    location: 'Jaipur, Rajasthan',
    website: 'https://jecrcuniversity.edu.in',
    officialWebDomains: ['jecrcuniversity.edu.in'],
    partnerColleges: [],
    mentorDomains: ['jecrcu.edu.in'],
    studentDomains: ['jecrcu.edu.in'],
    mentorRequiresAllowlist: true,
    aliases: ['JECRC', 'JECRC University', 'JU Jaipur'],
    squadLabel: null,
    residencyLabel: 'Hostel / day scholar',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 20
  },
  {
    slug: 'bkbirla',
    name: 'B. K. Birla College of Arts, Science & Commerce (Autonomous), Kalyan',
    shortName: 'B.K. Birla College',
    location: 'Kalyan, Maharashtra',
    website: 'https://bkbck.edu.in',
    officialWebDomains: ['bkbck.edu.in'],
    partnerColleges: [],
    // No confirmed Google Workspace domains yet: mentor login stays off.
    mentorDomains: [],
    studentDomains: [],
    mentorRequiresAllowlist: false,
    aliases: ['B.K. Birla', 'BK Birla', 'BKBC', 'Birla College', 'Kalyan'],
    squadLabel: null,
    residencyLabel: null,
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 30
  }
]
