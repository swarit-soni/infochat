import type { KnowledgeSeedDocument } from './types'

const SITE = 'https://sera-demo.example'

/**
 * Sera Demo University: a fictional college for live demonstrations. Every
 * name, number, date and contact below is invented; nothing describes a real
 * institution. Dates are set for the 2026-27 winter term.
 */
export const DEMO_KNOWLEDGE: KnowledgeSeedDocument[] = [
  {
    college: 'sera-demo',
    title: 'Sera Demo University: overview, contacts and student portals',
    domain: 'general',
    sourceSystem: 'official_website',
    authority: 'sera-demo',
    effectiveDate: '2026-07-01',
    sourceUrl: `${SITE}/about`,
    content: `# Sera Demo University (fictional)

Sera Demo University (SDU) is a fictional college used to demonstrate Sera. None of this information is real.

- **Address:** 1 Demo Avenue, Demo City 000 000.
- **Student helpdesk:** helpdesk@sera-demo.example, extension 1234, Monday to Friday, 9:00 to 17:00.
- **Programmes:** B.Tech in Computer Science (4 years), BBA (3 years), M.Sc in Data Science (2 years).
- **Sections:** first-year B.Tech students are in sections A to D.

## Student links
- Student portal (attendance, results, fee receipts, hall tickets): ${SITE}/portal
- Placement portal: ${SITE}/placements
- Library: ${SITE}/library`
  },
  {
    college: 'sera-demo',
    title: 'Winter semester fee schedule 2026-27',
    domain: 'fees',
    sourceSystem: 'official_notice',
    authority: 'sera-demo',
    priority: 'urgent',
    effectiveDate: '2026-11-15',
    expiresAt: '2027-01-31',
    actionRequired:
      'Pay the winter semester fee on the student portal by 15 December 2026.',
    sourceUrl: `${SITE}/notices/fees-winter-2026`,
    content: `# Winter semester fee schedule 2026-27

| Programme | Tuition per semester | Hostel per semester |
| --- | --- | --- |
| B.Tech CSE | Rs. 90,000 | Rs. 45,000 |
| BBA | Rs. 60,000 | Rs. 45,000 |
| M.Sc Data Science | Rs. 75,000 | Rs. 45,000 |

- **Due date:** 15 December 2026. A late fee of Rs. 1,000 per week applies after that.
- **How to pay:** student portal → Fees → Pay now (UPI, card or net banking).
- **Instalments:** two instalments are allowed if requested from the accounts office (accounts@sera-demo.example) before the due date.
- **Scholarship holders** pay only the hostel fee; the tuition waiver is applied automatically.`
  },
  {
    college: 'sera-demo',
    title: 'End-semester examination timetable: B.Tech CSE, semester 3',
    domain: 'examinations',
    sourceSystem: 'official_notice',
    authority: 'sera-demo',
    effectiveDate: '2026-11-20',
    expiresAt: '2027-01-20',
    program: 'B.Tech CSE',
    semester: '3',
    sourceUrl: `${SITE}/notices/exams-winter-2026`,
    content: `# End-semester examination timetable: B.Tech CSE, semester 3

| Date | Course | Time | Hall |
| --- | --- | --- | --- |
| 5 January 2027 | Data Structures | 10:00 to 13:00 | Hall 1 |
| 7 January 2027 | Discrete Mathematics | 10:00 to 13:00 | Hall 2 |
| 9 January 2027 | Computer Organisation | 14:00 to 17:00 | Hall 1 |
| 12 January 2027 | Object Oriented Programming | 10:00 to 13:00 | Hall 3 |

- Hall tickets are on the student portal from 22 December 2026; bring a printed copy and your ID card.
- Minimum attendance to sit the exams: 75%. Students below it should see their section mentor before 18 December 2026.
- Re-evaluation requests close 7 days after results are published.`
  },
  {
    college: 'sera-demo',
    title: 'Hostel rules and mess timings',
    domain: 'general',
    sourceSystem: 'official_guide',
    authority: 'sera-demo',
    effectiveDate: '2026-07-01',
    sourceUrl: `${SITE}/hostel`,
    content: `# Hostel rules and mess timings

- **In-time:** 22:00 on weekdays, 23:00 on Saturdays. Late entry needs the warden's approval on the student portal.
- **Mess:** breakfast 7:30 to 9:00, lunch 12:30 to 14:00, snacks 17:00 to 18:00, dinner 19:30 to 21:30.
- **Guests:** day visitors only, 10:00 to 18:00, registered at the hostel gate.
- **Warden:** warden@sera-demo.example.`
  },
  {
    college: 'sera-demo',
    title: 'Placement drive registration: December 2026',
    domain: 'activities',
    sourceSystem: 'official_notice',
    authority: 'sera-demo',
    priority: 'urgent',
    effectiveDate: '2026-11-22',
    expiresAt: '2026-12-20',
    actionRequired: 'Register on the placement portal by 8 December 2026.',
    sourceUrl: `${SITE}/placements`,
    content: `# Placement drive registration: December 2026

The fictional companies Acme Widgets and Globex Labs visit campus on 14 December 2026.

- **Eligibility:** final-year B.Tech and M.Sc students with no active backlogs and a CGPA of 6.5 or above.
- **Register by:** 8 December 2026 on ${SITE}/placements.
- **Bring:** two printed resumes and your college ID.`
  }
]
