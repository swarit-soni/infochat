import type { CollegeSlug } from '@/lib/colleges/registry'
import type { KnowledgeAuthority } from '@/lib/db/schema'

export interface OfficialPortalRecord {
  id: string
  college: CollegeSlug
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

// Every URL below was checked on 2026-11-24: the JECRC homepage links its
// E-Notice, ERP, Result and Parent Portal entries to the same MastersoftERP
// login, and its Service & Support desk to sws.jecrcuniversity.edu.in.
const VERIFIED_AT = new Date('2026-11-24T00:00:00.000Z')

export const DEFAULT_OFFICIAL_PORTALS: ReadonlyArray<OfficialPortalRecord> = [
  {
    id: 'portal_jecrc_erp',
    college: 'jecrc',
    portalKey: 'jecrc_erp',
    name: 'JECRC ERP (MastersoftERP)',
    authority: 'jecrc',
    url: 'https://jecrc.mastersofterp.in/',
    requiresLogin: 1,
    capabilities:
      'Personal attendance (the university gives no separate shortage notice; attendance is published here), semester results and grade cards, E-Notices, fee details, and the parent portal login.',
    navigationSteps:
      '1. Open the JECRC ERP. 2. Sign in with your ERP student credentials (parents use the parent portal login on the same page). 3. Open the attendance, result or notice section you need. Forgot your password? Use "Reset ERP Password" on the JU Service & Support Portal.',
    supportContact:
      'JECRC IT Department / ERP dashboard login helpline: +91 9982066992',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_jecrc_support',
    college: 'jecrc',
    portalKey: 'jecrc_support',
    name: 'JU Service & Support Portal',
    authority: 'jecrc',
    url: 'https://sws.jecrcuniversity.edu.in/',
    requiresLogin: 0,
    capabilities:
      'Single-window service and grievance desk: raise and track queries, ERP password reset, help with checking attendance, applying for OD (on duty), uploading assignments, fee payment and no-dues.',
    navigationSteps:
      '1. Open the JU Service & Support Portal. 2. Choose "Raise Query" to open a ticket, "Track Query" to follow one up, or the ERP help tiles (Reset Password, Check Attendance, Apply OD, Pay Fees).',
    supportContact: 'JECRC Registrar Office: +91 9116642282',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_jecrc_calendar',
    college: 'jecrc',
    portalKey: 'jecrc_calendar',
    name: 'JECRC Academic Calendar',
    authority: 'jecrc',
    url: 'https://jecrcuniversity.edu.in/academic-calendar/',
    requiresLogin: 0,
    capabilities:
      'Official academic calendars with semester start dates, in-semester and end-semester exam windows, and holidays.',
    navigationSteps:
      '1. Open the Academic Calendar page. 2. Download the calendar PDF for your programme and academic year.',
    supportContact: 'JECRC Registrar Office: +91 9116642282',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_kalvium_dashboard',
    college: 'kalvium',
    portalKey: 'kalvium_dashboard',
    name: 'Kalvium Student Dashboard',
    authority: 'kalvium',
    url: 'https://app.kalvium.community/',
    requiresLogin: 1,
    capabilities:
      'Personal learning unit completion, assignment submissions, pending deadlines, assessment scores, personal learning progress, project team/repo reviews, elective enrollment, and 1:1 mentor booking.',
    navigationSteps:
      '1. Sign in to the Kalvium Student Dashboard using your @kalvium.community Google account. 2. Open Learning Units, Assignments, Assessments, or Projects from the left navigation to check your personal standing or book a 1:1 mentor session.',
    supportContact: 'Your Squad Mentor (@kalvium.com)',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_bkbirla_student',
    college: 'bkbirla',
    portalKey: 'bkbirla_student',
    name: 'B.K. Birla College Student Login (MastersoftERP)',
    authority: 'bkbirla',
    url: 'https://cimsstudentnewui.mastersofterp.in/',
    requiresLogin: 1,
    capabilities:
      'Student dashboard: notifications, admission form status and "Payable Fees" for paying academic fees online.',
    navigationSteps:
      '1. Open the student login (also linked from bkbck.edu.in → Student Corner → Student Login). 2. Sign in with the username and password sent to you by SMS at registration. 3. Check notifications, or scroll to "Payable Fees" to pay.',
    supportContact:
      'B.K. Birla College enquiry: 1800 233 0144 / enquiry@bkbck.edu.in',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_bkbirla_results',
    college: 'bkbirla',
    portalKey: 'bkbirla_results',
    name: 'B.K. Birla College Results (Degree College)',
    authority: 'bkbirla',
    url: 'https://bkbck.edu.in/examination/results-degree-college/',
    requiresLogin: 0,
    capabilities:
      'Published semester-end and ATKT examination results for the degree college.',
    navigationSteps:
      '1. Open the Results page. 2. Choose your programme, semester and exam session.',
    supportContact:
      'B.K. Birla College enquiry: 1800 233 0144 / enquiry@bkbck.edu.in',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_bkbirla_admit_card',
    college: 'bkbirla',
    portalKey: 'bkbirla_admit_card',
    name: 'B.K. Birla College Admit Card',
    authority: 'bkbirla',
    url: 'https://bkbck.edu.in/examination/admit-card/',
    requiresLogin: 0,
    capabilities:
      'Download hall tickets / admit cards for college examinations.',
    navigationSteps:
      '1. Open the Admit Card page. 2. Follow the link for your exam session.',
    supportContact:
      'B.K. Birla College enquiry: 1800 233 0144 / enquiry@bkbck.edu.in',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_bkbirla_timetable',
    college: 'bkbirla',
    portalKey: 'bkbirla_timetable',
    name: 'B.K. Birla College Exam Timetables',
    authority: 'bkbirla',
    url: 'https://bkbck.edu.in/examination/exam-timetable/',
    requiresLogin: 0,
    capabilities:
      'Regular and ATKT examination timetables for UG and PG programmes, by session.',
    navigationSteps:
      '1. Open the Exam Timetable page. 2. Download the PDF for your year, semester and session.',
    supportContact:
      'B.K. Birla College enquiry: 1800 233 0144 / enquiry@bkbck.edu.in',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_bkbirla_notices',
    college: 'bkbirla',
    portalKey: 'bkbirla_notices',
    name: 'B.K. Birla College Notices',
    authority: 'bkbirla',
    url: 'https://bkbck.edu.in/notices',
    requiresLogin: 0,
    capabilities:
      'Official notices: exam commencement, ATKT form and fee deadlines, merit lists, scholarship forms and recruitment.',
    navigationSteps:
      '1. Open the Notices page. 2. Notices are listed newest first with their posting date.',
    supportContact:
      'B.K. Birla College enquiry: 1800 233 0144 / enquiry@bkbck.edu.in',
    lastVerifiedAt: VERIFIED_AT
  },
  // Sera Demo University is fictional (live demonstrations); so are these.
  {
    id: 'portal_sera-demo_student',
    college: 'sera-demo',
    portalKey: 'sera-demo_student',
    name: 'Sera Demo University Student Portal (fictional)',
    authority: 'sera-demo',
    url: 'https://sera-demo.example/portal',
    requiresLogin: 1,
    capabilities:
      'Attendance, semester results, fee payment and receipts, hall tickets and late-entry requests.',
    navigationSteps:
      '1. Open the student portal. 2. Sign in with your student ID. 3. Fees, hall tickets and attendance are in the left menu.',
    supportContact: 'helpdesk@sera-demo.example (extension 1234)',
    lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'portal_sera-demo_placements',
    college: 'sera-demo',
    portalKey: 'sera-demo_placements',
    name: 'Sera Demo University Placement Portal (fictional)',
    authority: 'sera-demo',
    url: 'https://sera-demo.example/placements',
    requiresLogin: 1,
    capabilities:
      'Placement drive registration, resume upload and interview slots.',
    navigationSteps:
      '1. Sign in to the placement portal. 2. Upload your resume. 3. Open Drives, choose a company and register.',
    supportContact: 'placements@sera-demo.example',
    lastVerifiedAt: VERIFIED_AT
  }
]

const PORTAL_SYNONYMS: Record<string, string[]> = {
  jecrc_erp: [
    'erp',
    'attendance',
    'fee receipt',
    'receipt',
    'result',
    'marks',
    'grade',
    'cgpa',
    'sgpa',
    'notice',
    'e-notice',
    'enotice',
    'circular',
    'parent',
    'guardian'
  ],
  jecrc_support: [
    'support',
    'helpdesk',
    'ticket',
    'grievance',
    'complaint',
    'query',
    'password',
    'od',
    'on duty',
    'no due',
    'pay fee'
  ],
  jecrc_calendar: ['calendar', 'holiday', 'semester start', 'exam dates'],
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
  ],
  bkbirla_student: ['login', 'fee', 'pay', 'student corner', 'dashboard'],
  bkbirla_results: ['result', 'marks', 'grade', 'atkt', 'sgpa', 'cgpa'],
  bkbirla_admit_card: ['admit card', 'hall ticket', 'hallticket'],
  bkbirla_timetable: ['timetable', 'time table', 'exam date', 'schedule'],
  bkbirla_notices: ['notice', 'circular', 'merit list', 'scholarship'],
  'sera-demo_student': [
    'login',
    'fee',
    'pay',
    'receipt',
    'result',
    'marks',
    'grade',
    'hall ticket',
    'admit card',
    'late entry',
    'dashboard'
  ],
  'sera-demo_placements': [
    'placement',
    'drive',
    'company',
    'resume',
    'interview',
    'job',
    'internship'
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
