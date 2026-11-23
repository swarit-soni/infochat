import type { KnowledgeAuthority } from '@/lib/db/schema'

export interface OfficialPortalRecord {
  id: string
  portalKey: string
  name: string
  authority: KnowledgeAuthority
  url: string
  requiresLogin: number
  capabilities: string
  navigationSteps: string
  supportContact: string | null
  lastVerifiedAt: Date
}

export const DEFAULT_OFFICIAL_PORTALS: ReadonlyArray<OfficialPortalRecord> = [
  {
    id: 'portal_jecrc_erp',
    portalKey: 'jecrc_erp',
    name: 'JECRC ERP Portal',
    authority: 'jecrc',
    url: 'https://jecrcuniversity.edu.in/erp',
    requiresLogin: 1,
    capabilities:
      'Personal attendance percentage, course registration, fee payment history, official fee receipts, and personal student academic profile.',
    navigationSteps:
      '1. Open the JECRC ERP Portal. 2. Sign in with your university enrollment ID and ERP password. 3. Use Academic -> Attendance for subject-wise percentage, or Finance -> Fee Receipts for payment confirmation.',
    supportContact: 'JECRC ERP Helpdesk / Registrar Office',
    lastVerifiedAt: new Date('2026-01-15T00:00:00.000Z')
  },
  {
    id: 'portal_jecrc_enotice',
    portalKey: 'jecrc_enotice',
    name: 'JECRC E-Notice Portal',
    authority: 'jecrc',
    url: 'https://jecrcuniversity.edu.in/e-notice',
    requiresLogin: 1,
    capabilities:
      'Official JECRC University circulars, exam form schedules, timetable revisions, holiday announcements, and campus-wide deadline notices.',
    navigationSteps:
      '1. Open the JECRC E-Notice Portal. 2. Sign in with your student portal credentials. 3. Filter notices by Examination, Academics, or Accounts and download the latest signed PDF circular.',
    supportContact: 'JECRC Academic & Examination Cell',
    lastVerifiedAt: new Date('2026-01-15T00:00:00.000Z')
  },
  {
    id: 'portal_jecrc_result',
    portalKey: 'jecrc_result',
    name: 'JECRC Examination Result Portal',
    authority: 'jecrc',
    url: 'https://jecrcuniversity.edu.in/results',
    requiresLogin: 1,
    capabilities:
      'Individual semester examination results, grade cards, SGPA/CGPA transcripts, and re-evaluation/backlog application status.',
    navigationSteps:
      '1. Open the JECRC Examination Result Portal. 2. Enter your enrollment number and select the exam session. 3. Download the provisional grade card or check re-evaluation status.',
    supportContact: 'JECRC Controller of Examinations',
    lastVerifiedAt: new Date('2026-01-15T00:00:00.000Z')
  },
  {
    id: 'portal_jecrc_support',
    portalKey: 'jecrc_support',
    name: 'JECRC Student Support Portal',
    authority: 'jecrc',
    url: 'https://jecrcuniversity.edu.in/student-support',
    requiresLogin: 1,
    capabilities:
      'Student grievance tickets, ID card/hostel/transport support requests, SLA contacts, and administrative escalation.',
    navigationSteps:
      '1. Open the JECRC Student Support Portal. 2. Log in and select the relevant department category (Accounts, Hostel, Exams, IT). 3. Submit a support ticket with your enrollment number and screenshots.',
    supportContact: 'JECRC Student Helpdesk',
    lastVerifiedAt: new Date('2026-01-15T00:00:00.000Z')
  },
  {
    id: 'portal_jecrc_parent',
    portalKey: 'jecrc_parent',
    name: 'JECRC Parent Portal',
    authority: 'jecrc',
    url: 'https://jecrcuniversity.edu.in/parent-portal',
    requiresLogin: 1,
    capabilities:
      'Parent access to ward attendance, fee schedules, payment status, and official university communications.',
    navigationSteps:
      '1. Open the JECRC Parent Portal. 2. Sign in using the registered parent credentials or student ID OTP. 3. View fee dues, attendance summary, and university notifications.',
    supportContact: 'JECRC Parent & Student Relations',
    lastVerifiedAt: new Date('2026-01-15T00:00:00.000Z')
  },
  {
    id: 'portal_kalvium_dashboard',
    portalKey: 'kalvium_dashboard',
    name: 'Kalvium Student Dashboard',
    authority: 'kalvium',
    url: 'https://app.kalvium.community/dashboard',
    requiresLogin: 1,
    capabilities:
      'Personal learning unit completion, assignment submissions, pending deadlines, assessment scores, personal learning progress, project team/repo reviews, elective enrollment, and 1:1 mentor booking.',
    navigationSteps:
      '1. Sign in to the Kalvium Student Dashboard using your @kalvium.community Google account. 2. Open Learning Units, Assignments, Assessments, or Projects from the left navigation to check your personal standing or book a 1:1 mentor session.',
    supportContact: 'Your Squad Mentor (@kalvium.com)',
    lastVerifiedAt: new Date('2026-01-15T00:00:00.000Z')
  }
]

const PORTAL_SYNONYMS: Record<string, string[]> = {
  jecrc_erp: [
    'erp',
    'attendance',
    'fee receipt',
    'receipt',
    'registration',
    'profile'
  ],
  jecrc_enotice: ['e-notice', 'enotice', 'circular', 'notice'],
  jecrc_result: [
    'result',
    'marks',
    'grade',
    'cgpa',
    'sgpa',
    'transcript',
    're-evaluation',
    'backlog'
  ],
  jecrc_support: [
    'support',
    'helpdesk',
    'ticket',
    'grievance',
    'complaint',
    'hostel',
    'id card'
  ],
  jecrc_parent: ['parent', 'guardian', 'father', 'mother'],
  kalvium_dashboard: [
    'kalvium',
    'dashboard',
    'learning unit',
    'assignment',
    'assessment',
    'progress',
    'project',
    'mentor',
    '1:1',
    'elective'
  ]
}

/**
 * Filter official portal records deterministically by key, authority, or query keywords.
 */
export function matchPortalsFromList(
  portals: ReadonlyArray<OfficialPortalRecord>,
  options: {
    query?: string
    authority?: KnowledgeAuthority
    portalKey?: string
  } = {}
): OfficialPortalRecord[] {
  const normalizedKey = options.portalKey?.trim().toLowerCase()
  if (normalizedKey) {
    const exact = portals.filter(
      p => p.portalKey.toLowerCase() === normalizedKey
    )
    if (exact.length > 0) return exact
  }

  let filtered = portals.filter(p =>
    options.authority ? p.authority === options.authority : true
  )

  const normalizedQuery = options.query?.trim().toLowerCase()
  if (!normalizedQuery) {
    return [...filtered]
  }

  const tokens = normalizedQuery
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 2)

  const scored = filtered
    .map(portal => {
      const haystack =
        `${portal.portalKey} ${portal.name} ${portal.capabilities} ${portal.navigationSteps}`.toLowerCase()
      const synonyms = PORTAL_SYNONYMS[portal.portalKey] ?? []
      let score = 0

      if (haystack.includes(normalizedQuery)) score += 5
      for (const synonym of synonyms) {
        if (normalizedQuery.includes(synonym)) {
          score += 4
        }
      }
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += 1
        }
      }

      return { portal, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.length > 0 ? scored.map(item => item.portal) : [...filtered]
}

export function matchDefaultPortals(
  query?: string,
  authority?: KnowledgeAuthority,
  portalKey?: string
): OfficialPortalRecord[] {
  return matchPortalsFromList(DEFAULT_OFFICIAL_PORTALS, {
    query,
    authority,
    portalKey
  })
}
