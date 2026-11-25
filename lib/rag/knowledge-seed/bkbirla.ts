import type { KnowledgeSeedDocument } from './types'

const EXAM_MANUAL =
  'https://bkbck.edu.in/wp-content/uploads/2026/07/Examination-Manual-Under-NEP-2020.pdf'
const AICTE_BROCHURE =
  'https://bkbck.edu.in/wp-content/uploads/2026/03/AICTE-Broucher.pdf'

/**
 * B. K. Birla College (Autonomous), Kalyan: official public sources, read
 * 2026-11-24. The old bkbirlacollegekalyan.com addresses redirect to
 * bkbck.edu.in.
 */
export const BKBIRLA_KNOWLEDGE: KnowledgeSeedDocument[] = [
  {
    college: 'bkbirla',
    title: 'B.K. Birla College, Kalyan: about the college and contacts',
    domain: 'general',
    sourceSystem: 'official_website',
    authority: 'bkbirla',
    effectiveDate: '2026-07-01',
    sourceUrl: 'https://bkbck.edu.in/contact-us/',
    content: `# B. K. Birla College of Arts, Science & Commerce (Empowered Autonomous), Kalyan

- **Address:** Birla College Campus Road, Gauripada, Kalyan, Maharashtra – 421301.
- **Toll-free:** 1800 233 0144 · **Landline:** 0251 2231293
- **Email:** enquiry@bkbck.edu.in (enquiries), principal@bkbck.edu.in (Principal)
- **Website:** https://bkbck.edu.in (the old bkbirlacollegekalyan.com links redirect here)

## About (Examination Manual under NEP 2020 and college website)
- Established in **1972**, affiliated to the **University of Mumbai**.
- **Autonomous status** from UGC and the University of Mumbai since **2018-19**; **Empowered Autonomous status** from AY **2023-24 to 2032-33**.
- Reaccredited by NAAC (4th cycle) with **A++ grade (CGPA 3.51), valid 2024–2031**. Previously granted "College of Excellence" status by UGC (2015–20); ISO 9001:2015 certified.
- Offers about **32 UG, 33 PG and 9 Ph.D. programmes** (the exam manual's count; the homepage gives 33 UG, 34 PG), plus PG diplomas and a UGC Community College diploma.
- Technology programmes (unaided): B.Sc. Computer Science, B.Sc. Information Technology, B.Sc. Data Science, B.Sc. Cyber Security, B.Sc. AI, Robotics & Automation, and BCA (AICTE-approved), with M.Sc. options in Computer Science, IT (Cloud Computing), Data Science & Big Data Analytics, AI and Cyber Security.
- **Mental health:** the Mpower Cell (Aditya Birla Education Trust) offers counselling on campus.

Social: facebook.com/BKBirlaCollegeKalyan · instagram.com/bkbirlacollege_kalyan`
  },
  {
    college: 'bkbirla',
    title:
      'B.K. Birla College examination scheme (NEP 2020): CIA/SEE marks and passing',
    domain: 'examinations',
    sourceSystem: 'official_document',
    authority: 'bkbirla',
    effectiveDate: '2026-07-01',
    sourceUrl: EXAM_MANUAL,
    content: `# Examination scheme under NEP 2020 (B.K. Birla College, Kalyan)

Each course has **Continuous Internal Assessment (CIA)** and a **Semester End Examination (SEE)**. A semester is at least 15 weeks.

## Credits
- UG: 22 credits per semester; **132 credits for a 3-year UG degree**, **176 for a 4-year UG (Honours)**. PG: **88 credits**.

## Major and Minor courses (100 marks)
| Component | Marks | Passing minimum |
| --- | --- | --- |
| CIA | 40 | 16 (40%) |
| SEE (2 hours) | 60 | 24 (40%) |
| Overall | 100 | 40 (40%) |

**CIA (40):** group/individual project or assignment 20; class test (multiple-choice objective) 15; conduct, articulation, leadership and active participation 5.
**SEE (60):** four compulsory questions of 15 marks each (one per unit) with internal choice.

## 2-credit courses (Open Elective, VSC, SEC, IKS, AEC, VEC) – 50 marks
- CIA 20 (class test/viva/presentations 15 + **attendance and code of conduct 5**) and SEE 30 (assignments/project/fieldwork), often conducted online by the course teacher.
- Pass: 40% in each component and **20/50 overall**.

## Practicals
Practical, internship report and project/viva are each out of 100 with a **passing minimum of 40**.

## Evaluation
- SEM I–IV: single evaluation, with external moderation of 10% of papers when a course has 100+ answer books.
- SEM V–VI (UG) and III–IV (PG): **double-blind evaluation** (external examiner + course teacher), averaged; a third evaluation if many papers differ by over 15%.

## Grades
| FY & SY: % of marks | Grade | Points | | TY: % of marks | Grade | Points |
| --- | --- | --- | --- | --- | --- | --- |
| 90 & above | O | 10 | | 80 & above | O | 10 |
| 80–89.99 | A+ | 9 | | 70–79.99 | A+ | 9 |
| 70–79.99 | A | 8 | | 60–69.99 | A | 8 |
| 60–69.99 | B+ | 7 | | 55–59.99 | B+ | 7 |
| 50–59.99 | B | 6 | | 50–54.99 | B | 6 |
| 45–49.99 | C | 5 | | 45–49.99 | C | 5 |
| 40–44.99 | D | 4 | | 40–44.99 | D | 4 |
| below 40 | F | 0 | | below 40 | F | 0 |

Grades are based on CIA and SEE together.

## Failing one component
- Pass CIA but fail SEE: reappear for the SEE only; CIA marks carry over.
- Pass SEE but fail CIA: reappear for the CIA only; SEE marks carry over.
- Ex-candidates take failed-course exams at least 15 days before the next semester's SEE, every semester.

## Additional semester-end examination
For students absent on medical grounds, representing the college/university (sports, cultural, NSS, NCC), other valid reasons approved by the Principal, or who failed: apply in writing **to the Controller of Examinations on or before the exam date**, with proof and the hall ticket, approved by the HoD and Vice Principal. **No exam fee is charged.** Held 15 days to one month after the last exam (not in vacations). Not available for backlog/ATKT exams.`
  },
  {
    college: 'bkbirla',
    title: 'B.K. Birla College ATKT and progression rules (NEP 2020)',
    domain: 'examinations',
    sourceSystem: 'official_document',
    authority: 'bkbirla',
    effectiveDate: '2026-07-01',
    sourceUrl: EXAM_MANUAL,
    content: `# Allowed To Keep Terms (ATKT) / progression (B.K. Birla College, NEP 2020)

## UG programmes under NEP 2020
- Semester II: allowed **irrespective** of the number of courses failed in Semester I.
- Semester III: allowed if the student has **32 credits** from Semesters I and II together.
- Semester IV: allowed irrespective of failures in Semester III.
- Semester V (admission and keeping term): allowed with **76 credits** from Semesters I–IV together.
- Semester VI: allowed irrespective of failures in Semester V. **The Semester VI result is withheld until Semesters I–V are all passed.**
- Semester VII (UG Honours / PG Part I): only after passing **all courses of Semesters I–VI (132 credits)**.

## B.Voc / Diploma in Accountancy / Diploma in Event Management
- Semester II: irrespective of Semester I failures.
- Semester III: pass Semesters I and II, **or** fail in not more than two courses of each.
- Semester IV: irrespective of Semester III failures.
- Semester V: pass Semesters I–IV, or pass I and II and fail in not more than two courses of each of III and IV, or pass III and IV and fail in not more than two courses of each of I and II.
- Semester VI: irrespective of Semester V failures; the result is kept in abeyance until Semesters I–V are passed.

## PG programmes
- Semester II and IV: irrespective of failures in the previous semester.
- Semester III: **32 or more cumulative credits** from Semesters I and II.

## PG grade improvement
A PG student may re-register a course for grade improvement (application through the HoD to the Head of Institution, within 5 years of enrolment). Allowed for at most **two semesters in the whole programme**, once per programme; if the grade doesn't improve, the new attempt is ignored. Students who passed Part I (Sem I and II) cannot reappear in those exams to improve.

These rules can be amended by the college's academic bodies.`
  },
  {
    college: 'bkbirla',
    title:
      'B.K. Birla College: unfair means, verification of marks and answer-book photocopies',
    domain: 'examinations',
    sourceSystem: 'official_document',
    authority: 'bkbirla',
    effectiveDate: '2026-07-01',
    sourceUrl: EXAM_MANUAL,
    content: `# Unfair means, verification and revaluation (B.K. Birla College, Kalyan)

## Unfair means (University of Mumbai Ordinance O.5050)
- Students using unfair means face action as per University of Mumbai rules. A suspected copy case is sent to the Examination Control Room with the answer paper, hall ticket and proof; the student gives an undertaking and receives a charge sheet with the date of the **Unfair Means Inquiry Committee** hearing.
- The committee hears the student in writing, questions the supervisors, and recommends a penalty to the Principal (Chief Controller of Examinations), who publishes it and has it recorded on the grade card.
- Under O.5050, **possession of copy material** leads to **annulment of the student's performance in the whole examination**. **Actual copying** from that material also excludes the student from **one additional examination**, and more serious malpractices carry heavier penalties.

## Verification and revaluation
- **Re-valuation** of answer books is available for F.Y., S.Y. and T.Y. B.A., B.Sc. and B.Com. exams conducted by the college; **verification of marks** follows University of Mumbai guidance (as per the AICTE/BCA brochure).
- **Verification** covers mistakes in carrying over or totalling marks and unassessed answers; it is **not reassessment**.
- A **photocopy of the answer book** is given on application and payment of the prescribed fee.
- The exam manual states verification and revaluation follow the existing ordinances, regulations and VCDs of the University of Mumbai. Answer books are kept for at least **six months** after results.
- Notices for verification/photocopy windows are posted on https://bkbck.edu.in/notices (e.g. "Verification of marks and photocopies of answer sheets, PG Sem II/IV, Summer 2026", posted 29 Jul 2026).

## Other rules
- Gracing and extra time for physically or visually challenged candidates follow the University of Mumbai ordinances.
- Exemption: a failed candidate who passed a particular subject/practical may be exempted from it at the next attempt.`
  },
  {
    college: 'bkbirla',
    title: 'B.K. Birla College admission cancellation and fee refund rules',
    domain: 'fees',
    sourceSystem: 'official_website',
    authority: 'bkbirla',
    effectiveDate: '2026-06-01',
    sourceUrl:
      'https://bkbck.edu.in/admission/rules-regulations-for-cancellation/',
    content: `# Fee deduction on cancellation of admission (B.K. Birla College, Kalyan)

Per University guidelines (Circular No. UG/412 of 2008). Apply in writing; the refund is paid within 30 days of cancellation, less:

| When the admission is cancelled | Deduction |
| --- | --- |
| Before the academic term and instruction begin | ₹500 (lump sum) |
| Up to 20 days after the term begins | 20% of total fees |
| Day 21 to day 50 after the term begins | 30% of total fees |
| Day 51 to day 80, or 31 August, whichever is earlier | 50% of total fees |
| 1 to 30 September | 60% of total fees |
| After 30 September | 100% of total fees |

- "Total fees" means all fee items chargeable for one year per University circulars.
- **Not refundable** (if already paid by the college): group insurance and the University share (Vice-Chancellor fund, sports and cultural activities, e-charge, disaster management fund, exam fee, enrolment fee).
- **Not refundable after the term starts:** identity card, library card, admission form and prospectus, enrolment and other course-specific fees.
- **Fully refunded:** laboratory, caution-money and library deposits.
- For centralised admissions (CAP), the competent authority's refund rules apply to first-year admissions; for later years the **0.2859 rule** applies.

## Fees and deposits (college brochure)
- Fees and deposits for the term are paid at admission.
- To leave in the second term, inform the Principal **in writing two to four weeks before the second term starts**; otherwise the full second-term fee is payable.
- Refundable deposits **lapse if not claimed within one calendar year** of leaving, and aren't refunded if dues (breakage, damage, lost library books) are pending. Bring the fee receipt and identity card to claim a refund.
- The 2026-27 fee structure for each course is published at https://bkbck.edu.in/wp-content/uploads/2026/06/Fees-Structure.pdf.`
  },
  {
    college: 'bkbirla',
    title:
      'B.K. Birla College UG eligibility: B.Sc. CS/IT, BCA, B.Com, BMS, BA',
    domain: 'admissions',
    sourceSystem: 'official_website',
    authority: 'bkbirla',
    effectiveDate: '2026-06-01',
    sourceUrl: 'https://bkbck.edu.in/admission/general-information/',
    content: `# Eligibility for first-year UG admission (B.K. Birla College, Kalyan)

| Programme | Eligibility |
| --- | --- |
| B.Sc. (Computer Science) | Std XII (Maharashtra State Board or equivalent) **with Mathematics and Statistics** as one of the subjects |
| B.Sc. (Information Technology) | Std XII **with Mathematics**, at least **45% (Open) / 40% (Reserved)**, at first attempt |
| B.Sc. (Biotechnology) | Std XII with Mathematics |
| B.Com (Accounting & Finance / Banking & Insurance / Financial Management) | Std XII with at least **45% aggregate (40% Reserved)** at one sitting |
| B.M.S. | Std XII (or a 2/3-year engineering diploma after SSC) with at least 45% (Open) / 40% (Reserved), in one attempt |
| B.A.M.M.C. | Std XII in Arts, Science or Commerce |
| B.A. | Std XII (HSC) or equivalent; **no fixed minimum percentage**, admission is merit-based |
| Junior College (XI–XII) | Std X (Maharashtra State Board or equivalent) |

Admission to other B.Sc. subjects (Physics, Chemistry, Botany, Zoology, Microbiology, etc.) is on merit as per University norms.

## BCA and BMS (AICTE-approved programmes)
Per the college's AICTE brochure: Indian citizens who have passed 10+2 as per the affiliating university's admission policy **and** obtained a **non-zero score in the MAH-BCA/BBA/BMS/BBM CET** conducted by the competent authority (or a non-zero positive score in **CUET-UG**), plus any other criteria announced by the authorities.

Merit lists (CAP rounds and institute quota) are published on the admission pages of https://bkbck.edu.in.`
  },
  {
    college: 'bkbirla',
    title: 'B.K. Birla College online admission registration and fee payment',
    domain: 'admissions',
    sourceSystem: 'official_document',
    authority: 'bkbirla',
    effectiveDate: '2026-04-01',
    sourceUrl:
      'https://bkbck.edu.in/wp-content/uploads/2026/04/Admission_Process.pdf',
    content: `# Online admission registration (B.K. Birla College, Kalyan)

Degree college registration: https://enrollonline.co.in/registration/apply/bkbc

1. **Create an account:** Admission → Online Admission form → create a new student account (username, password, mobile number, email) and click Register.
2. Your **username and password are sent by SMS/email** to the registered mobile/email.
3. Log in, **accept the terms and conditions**, and choose the **course level** ("Apply For").
4. Fill **personal details** and **address details** (mandatory fields are marked red).
5. **Education details** of the last school/college (add more than one if required).
6. Upload **photo (max 500 KB)** and **signature (max 300 KB)**.
7. **Course selection**, then **subject selection** (choose English medium first, then add subjects).
8. **Last qualifying exam** details (marks obtained and total; the percentage is calculated automatically).
9. **Upload documents** (max 200 KB each) and submit.
10. Wait for **verification by college staff**; check the notifications on your dashboard.

## Paying fees
After verification you'll get an SMS with the payment link, or pay through **Student Corner → Student Login** (https://cimsstudentnewui.mastersofterp.in/): log in with the SMS credentials, check notifications, and scroll to **"Payable Fees"**.`
  },
  {
    college: 'bkbirla',
    title:
      'B.K. Birla College student rules, anti-ragging cell and office timings',
    domain: 'general',
    sourceSystem: 'official_website',
    authority: 'bkbirla',
    effectiveDate: '2026-03-01',
    sourceUrl: 'https://bkbck.edu.in/student-corner/rules-and-regulation/',
    content: `# Student rules (B.K. Birla College, Kalyan)

- **ID card:** carry and wear it on campus at all times and show it when asked. Report a lost ID/library card in writing to the Library. A duplicate needs an **affidavit on ₹50 non-judicial stamp paper** and a **₹100 fine**.
- **Mobile phones** are not allowed on campus or in classrooms; violations lead to strict action.
- **Ragging** is a cognizable offence under a Government of Maharashtra resolution.
- **Smoking, gutka and tobacco** are banned on campus, including the canteen.
- Photography on campus needs the Principal's permission. Collecting funds or organising picnics needs the Principal's prior written permission. Students may not bring four-wheelers on campus.
- Students using unfair means in exams face action under University of Mumbai rules.

## Anti-Ragging Cell (college brochure)
Dr. Avinash G. Patil, Principal (Chairman); Dr. Mahadev Yadav, Vice Principal (Arts); Dr. M. K. Dhaliwal, Vice Principal (Science); Mr. Bipinchandra Wadekar, Vice Principal (Commerce); Mrs. Esmita Gupta, Vice Principal (Unaided); Prof. Meeta Bhot; Dr. Harish Dubey, Vice Principal (Admin).

## Office services and timings (college brochure)
| Service | Timing / turnaround |
| --- | --- |
| Cash counter | 9:30 AM – 12:30 PM |
| Railway concession | 10 AM – 12 PM |
| Transfer certificate (TC) | Within 1 month |
| Transcript | Within one month of submitting complete documents and fees |
| Old bonafide certificate | 1 week |

Source: Student Corner rules page and the college's AICTE brochure (${AICTE_BROCHURE}).`
  },
  {
    college: 'bkbirla',
    title: 'B.K. Birla College Winter Session 2026 examination notices',
    domain: 'examinations',
    sourceSystem: 'official_notice',
    authority: 'bkbirla',
    effectiveDate: '2026-11-05',
    expiresAt: '2027-03-31',
    sourceUrl: 'https://bkbck.edu.in/examination/exam-timetable/',
    content: `# Winter Session 2026: examination notices (B.K. Birla College, Kalyan)

Timetable PDFs: https://bkbck.edu.in/examination/exam-timetable/ · Notices: https://bkbck.edu.in/notices

| Posted | Notice |
| --- | --- |
| 5 Nov 2026 | UG FY Sem-I regular exam timetable (B.Sc. AIRA, B.Com FinTech, B.Sc. Psychology, FY-DEM) |
| 5 Nov 2026 | PG Part-I Sem-I and PG Part-II Sem-III regular and ATKT timetables |
| 8 Oct 2026 | UG FY Sem-II ATKT timetable (F.Y.B.M.S & F.Y.B.C.A, AICTE) and PG Part-I/II ATKT timetable |
| 26 Sep 2026 | UG FY Sem-I, SY Sem-III and TY Sem-V regular timetables |
| 24 Sep 2026 | Commencement of UG FY Sem-I and SY Sem-III regular (NEP) exams |
| 24 Sep 2026 | Commencement of PG Part-I Sem-I and Part-II Sem-III regular and ATKT exams |
| 21 Sep 2026 | Extended date for PG ATKT exam form and fees |
| 8 Sep 2026 | UG Sem-II F.Y.B.C.A / F.Y.B.M.S (AICTE, NEP) ATKT form and fees |
| 29 Aug 2026 | PG ATKT exam form and fees |
| 10 Aug 2026 | Commencement of UG FY/SY/TY regular exams; scholarship notice and form 2026-27 |
| 22 Jul 2026 | UG ATKT form and fees, extended date (offline mode) |

Exact exam dates are in each timetable PDF. Admit cards: https://bkbck.edu.in/examination/admit-card/ · Results: https://bkbck.edu.in/examination/results-degree-college/`
  }
]
