import {
  type CampusScope,
  type College,
  createCollegeDirectory
} from './registry'

/**
 * The colleges Sera knows about: its launch colleges, then India's ten
 * top-ranked institutions (NIRF 2025, overall). They seed the `colleges` table
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
    // Confirmed student domain; staff Google Workspace domain not confirmed yet so staff login stays off.
    mentorDomains: [],
    studentDomains: ['bkbck.edu.in'],
    mentorRequiresAllowlist: false,
    aliases: ['B.K. Birla', 'BK Birla', 'BKBC', 'Birla College', 'Kalyan'],
    squadLabel: null,
    residencyLabel: null,
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 30
  },
  {
    // Fictional college for live demonstrations: no real institution has
    // authorized an integration yet. All its data is invented (see
    // lib/rag/knowledge-seed/demo.ts and drizzle/0026_demo_college.sql).
    slug: 'sera-demo',
    name: 'Sera Demo University (fictional)',
    shortName: 'Sera Demo University',
    location: 'Demo City (fictional)',
    website: 'https://sera-demo.example',
    officialWebDomains: ['sera-demo.example'],
    partnerColleges: [],
    // Students pick the college at onboarding. Demo mentors are added by
    // email to the allowlist (and their domain here) in the database.
    mentorDomains: [],
    studentDomains: [],
    mentorRequiresAllowlist: true,
    aliases: ['Sera Demo University', 'Demo University', 'SDU'],
    squadLabel: 'Section',
    residencyLabel: 'Hostel / day scholar',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 40
  },
  {
    slug: 'iitm',
    name: 'Indian Institute of Technology Madras',
    shortName: 'IIT Madras',
    location: 'Chennai, Tamil Nadu',
    website: 'https://www.iitm.ac.in',
    officialWebDomains: ['iitm.ac.in'],
    partnerColleges: [],
    mentorDomains: ['iitm.ac.in'],
    studentDomains: ['smail.iitm.ac.in', 'iitm.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['IIT Madras', 'IITM', 'IIT-M'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 100
  },
  {
    slug: 'iisc',
    name: 'Indian Institute of Science, Bengaluru',
    shortName: 'IISc',
    location: 'Bengaluru, Karnataka',
    website: 'https://iisc.ac.in',
    officialWebDomains: ['iisc.ac.in'],
    partnerColleges: [],
    mentorDomains: ['iisc.ac.in'],
    studentDomains: ['iisc.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: [
      'IISc',
      'IISc Bangalore',
      'IISc Bengaluru',
      'Indian Institute of Science'
    ],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 110
  },
  {
    slug: 'iitb',
    name: 'Indian Institute of Technology Bombay',
    shortName: 'IIT Bombay',
    location: 'Powai, Mumbai, Maharashtra',
    website: 'https://www.iitb.ac.in',
    officialWebDomains: ['iitb.ac.in'],
    partnerColleges: [],
    mentorDomains: ['iitb.ac.in'],
    studentDomains: ['iitb.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['IIT Bombay', 'IITB', 'IIT-B', 'IIT Powai'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 120
  },
  {
    slug: 'iitd',
    name: 'Indian Institute of Technology Delhi',
    shortName: 'IIT Delhi',
    location: 'Hauz Khas, New Delhi',
    website: 'https://home.iitd.ac.in',
    officialWebDomains: ['iitd.ac.in'],
    partnerColleges: [],
    mentorDomains: ['iitd.ac.in'],
    studentDomains: ['iitd.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['IIT Delhi', 'IITD', 'IIT-D'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 130
  },
  {
    slug: 'iitk',
    name: 'Indian Institute of Technology Kanpur',
    shortName: 'IIT Kanpur',
    location: 'Kanpur, Uttar Pradesh',
    website: 'https://www.iitk.ac.in',
    officialWebDomains: ['iitk.ac.in'],
    partnerColleges: [],
    mentorDomains: ['iitk.ac.in'],
    studentDomains: ['iitk.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['IIT Kanpur', 'IITK', 'IIT-K'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 140
  },
  {
    slug: 'iitkgp',
    name: 'Indian Institute of Technology Kharagpur',
    shortName: 'IIT Kharagpur',
    location: 'Kharagpur, West Bengal',
    website: 'https://www.iitkgp.ac.in',
    officialWebDomains: ['iitkgp.ac.in'],
    partnerColleges: [],
    mentorDomains: ['iitkgp.ac.in'],
    studentDomains: ['iitkgp.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['IIT Kharagpur', 'IIT KGP', 'IITKGP', 'KGP'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 150
  },
  {
    slug: 'iitr',
    name: 'Indian Institute of Technology Roorkee',
    shortName: 'IIT Roorkee',
    location: 'Roorkee, Uttarakhand',
    website: 'https://www.iitr.ac.in',
    officialWebDomains: ['iitr.ac.in'],
    partnerColleges: [],
    mentorDomains: ['iitr.ac.in'],
    studentDomains: ['iitr.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['IIT Roorkee', 'IITR', 'IIT-R'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 160
  },
  {
    slug: 'aiims',
    name: 'All India Institute of Medical Sciences, New Delhi',
    shortName: 'AIIMS Delhi',
    location: 'Ansari Nagar, New Delhi',
    website: 'https://www.aiims.edu',
    officialWebDomains: ['aiims.edu', 'aiimsexams.ac.in'],
    partnerColleges: [],
    mentorDomains: ['aiims.edu'],
    studentDomains: ['gsuite.aiims.edu', 'aiims.edu'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['AIIMS', 'AIIMS Delhi', 'AIIMS New Delhi'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 170
  },
  {
    slug: 'jnu',
    name: 'Jawaharlal Nehru University',
    shortName: 'JNU',
    location: 'New Delhi',
    website: 'https://www.jnu.ac.in',
    officialWebDomains: ['jnu.ac.in'],
    partnerColleges: [],
    mentorDomains: ['jnu.ac.in', 'mail.jnu.ac.in'],
    studentDomains: ['jnu.ac.in', 'mail.jnu.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['JNU', 'Jawaharlal Nehru University'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 180
  },
  {
    slug: 'bhu',
    name: 'Banaras Hindu University',
    shortName: 'BHU',
    location: 'Varanasi, Uttar Pradesh',
    website: 'https://www.bhu.ac.in',
    officialWebDomains: ['bhu.ac.in', 'bhu.edu.in'],
    partnerColleges: [],
    mentorDomains: ['bhu.ac.in'],
    studentDomains: ['bhu.ac.in'],
    // Staff and students share the domain: mentors must be allowlisted.
    mentorRequiresAllowlist: true,
    aliases: ['BHU', 'Banaras Hindu University', 'Kashi Hindu Vishwavidyalaya'],
    squadLabel: null,
    residencyLabel: 'Hostel',
    eventsLabel: 'Events',
    gchatSpaces: [],
    enabled: true,
    sortOrder: 190
  }
]

/** The built-in colleges as a directory (tests, evals and fallbacks). */
export const DEFAULT_COLLEGE_DIRECTORY =
  createCollegeDirectory(DEFAULT_COLLEGES)

/** A scope over the built-in colleges: `college` null sees every college. */
export function defaultCampusScope(
  college: string | null = null,
  campus: string | null = null
): CampusScope {
  return { directory: DEFAULT_COLLEGE_DIRECTORY, college, campus }
}
