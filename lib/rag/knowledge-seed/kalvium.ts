import type { KnowledgeSeedDocument } from './types'

const GUIDE_2026 =
  'https://kalvium.com/blog/what-is-kalvium-complete-guide-for-families-2026/'
const FEES_EXPLAINED = 'https://kalvium.com/blog/kalvium-fees-explained/'
const PARTNERS =
  'https://kalvium.com/blog/kalvium-partner-universities-what-the-degree-says/'
const BYOD = 'https://kalvium.com/blog/what-byod-at-kalvium-actually-means/'
const KNET =
  'https://kalvium.com/blog/what-is-knet-a-complete-guide-for-students-and-parents/'
const JECRC_BROCHURE_2026 =
  'https://jecrcuniversity.edu.in/wp-content/uploads/2026/04/JU-Information-Brochure-2026.pdf'
const SYLLABUS_2026 =
  'https://jecrcuniversity.edu.in/wp-content/uploads/2026/02/JECRC-x-Kalvium-Syllabus.pdf'
const SYLLABUS_2023 =
  'https://jecrcuniversity.edu.in/wp-content/uploads/2023/05/JECRC-__-Kalvium-Program-Detailed-Program-Syllabus.pdf'

/** Kalvium and the JECRC × Kalvium B.Tech: official sources, read 2026-11-24. */
export const KALVIUM_KNOWLEDGE: KnowledgeSeedDocument[] = [
  {
    college: 'kalvium',
    title: 'What Kalvium is, and what the partner university does',
    domain: 'general',
    sourceSystem: 'kalvium_web',
    authority: 'kalvium',
    effectiveDate: '2026-06-30',
    sourceUrl: GUIDE_2026,
    content: `# Kalvium and its partner universities

Kalvium runs a **four-year, residential B.Tech in Computer Science Engineering** delivered with partner universities. **Kalvium is not a university and does not award degrees.**

| Kalvium is responsible for | The partner university is responsible for |
| --- | --- |
| Curriculum design, mentor training, daily coding practice (**DOJO**), progress tracking (**HEROS**), "Live Books" learning material, the work-integrated structure | Campus, hostel and infrastructure, AICTE/UGC regulatory matters, university examinations, and **awarding the degree** |

- Students earn a **B.Tech in CSE from the partner university** where they enrol (e.g. "a B.Tech in CSE from JECRC University"). Kalvium says the degree is valid for GATE, M.Tech, MBA and MS applications and for jobs in India and abroad.
- The programme runs **six days a week, about eight hours a day**, and Kalvium says it "expects discipline, attendance, and ownership".
- Students work in **squads of around fifty**, with mentors. Mentoring is 1:1 by video, with Technical Mentors (technical skills) and Professional Coaches (professional and soft skills).
- Courses run by Kalvium are fully digital: no pen and paper.
- **Campus transfers are not allowed:** the partner university chosen at enrolment is the campus for all four years.

## Partner universities taking KNET admissions in AY 2026-27
AMET University (Chennai); **JECRC University (Jaipur)**; Kalasalingam Academy of Research and Education (Krishnankoil); Lovely Professional University (Phagwara); SGT University (Gurugram); SRM University AP (Amaravati); St Joseph University (Chennai); Yenepoya University (Bengaluru); Yenepoya University (Mangaluru). A single KNET score is valid across all nine. Kalvium's wider partner network is larger than these nine.

Placement figures Kalvium publishes (Batch 2026, as of March 2026: 82.40% placed, median ₹16.5 LPA) are self-reported; Kalvium states it makes no placement promise.

Sources: ${GUIDE_2026} and ${PARTNERS} (Kalvium's own admissions content).`
  },
  {
    college: 'kalvium',
    title: 'Kalvium fees: what is paid to Kalvium vs the partner university',
    domain: 'fees',
    sourceSystem: 'kalvium_web',
    authority: 'kalvium',
    effectiveDate: '2026-06-15',
    sourceUrl: FEES_EXPLAINED,
    content: `# Kalvium fees and payment flow

- The **only payment to Kalvium is the ₹1,200 KNET registration fee**, paid once and covering the whole selection process.
- **Tuition, hostel and mess are paid directly to the partner university**, on the university's own schedule (some collect the year upfront, others in instalments).
- Not included in tuition: hostel, mess, laptop and travel.
- Kalvium does **not** accept cash, bank transfers or direct UPI for any purpose. Payments happen online through the official Kalvium portal on a kalvium.com domain.

## Annual tuition by campus (Kalvium Prospectus, AY 2025; may be revised for AY 2026)
| University | Annual tuition | 4-year total |
| --- | --- | --- |
| AMET University (Chennai) | ₹2,25,000 | ₹9,00,000 |
| Yenepoya University (Mangaluru) | ₹2,26,000 | ₹9,04,000 |
| St Joseph University (Chennai) | ₹2,30,000 | ₹9,20,000 |
| Kalasalingam Academy (KARE) | ₹3,00,000 | ₹12,00,000 |
| JECRC University (Jaipur) | ₹3,25,000 | ₹13,00,000 |
| SGT University (Gurugram) | ₹3,25,000 | ₹13,00,000 |
| Yenepoya University (Bengaluru) | ₹3,26,000 | ₹13,04,000 |
| Lovely Professional University (Phagwara) | ₹4,00,000 | ₹16,00,000 |
| SRM University AP (Amaravati) | ₹4,60,000 | ₹18,40,000 |

Before paying, Kalvium advises asking the university in writing for the four-year tuition total, hostel cost, payment schedule and refund policy. For JECRC's own fee breakdown and refund rules, see the JECRC × Kalvium programme and JECRC refund documents.`
  },
  {
    college: 'kalvium',
    title:
      'JECRC × Kalvium B.Tech CSE (Software Product Engineering): fees and eligibility 2026',
    domain: 'admissions',
    sourceSystem: 'jecrc_web',
    authority: 'joint',
    program: 'B.Tech CSE – Software Product Engineering (Kalvium)',
    effectiveDate: '2026-04-01',
    expiresAt: '2027-07-31',
    sourceUrl: JECRC_BROCHURE_2026,
    content: `# B.Tech CSE: Software Product Engineering with Kalvium (JECRC University, 2026)

**Duration:** 4 years (8 semesters). Degree awarded by JECRC University.

## Fees (JECRC Information Brochure 2026, per year)
| Tuition fee | Other fees | Annual fee | 1st instalment + Alumni & Admission fee (₹10,000) | Subsequent instalment |
| --- | --- | --- | --- | --- |
| ₹1,74,000 | ₹1,51,000 | **₹3,25,000** | ₹1,72,500 | ₹1,62,500 |

- The **₹10,000 alumni & admission fee is one-time and non-refundable**.
- **JECRC merit scholarships do not apply** to this programme ("Scholarship is not applicable in B.Tech: CSE-SPE, Kalvium Program").
- Hostel and bus are extra (see JECRC hostel and bus fees 2026-27). Fee instalment dates, late fee and refund rules are JECRC's (see the JECRC fee and refund documents).

## Eligibility
- Pass in 10+2 with **minimum 60% aggregate** in all subjects, with a pass in English, Physics and Mathematics plus one of Chemistry/Biology/Biotechnology/technical vocational subject, from a recognised board.
- **Additionally, the student must have appeared for the KNET (Kalvium National Entrance Test) and personal interview.**

## Careers listed by JECRC
Software engineer, solutions engineer, product analyst, technical product manager.`
  },
  {
    college: 'kalvium',
    title:
      'JECRC × Kalvium B.Tech: semester-wise programme structure (2026 syllabus)',
    domain: 'academics',
    sourceSystem: 'kalvium_guide',
    authority: 'joint',
    program: 'B.Tech CSE – Software Product Engineering (Kalvium)',
    effectiveDate: '2026-02-01',
    sourceUrl: SYLLABUS_2026,
    content: `# Programme structure: B.Tech CSE Specialisation in Software Product Engineering (2026 syllabus)

The document calls this a **tentative** programme structure.

| Semester | Courses |
| --- | --- |
| 1 | Computing Systems & Development Tools; Computational Thinking & Programming Fundamentals; Critical Thinking; Web Interfaces and Frontend Architecture; Professional Communication & AI Collaboration; Breadth of Computer Science – 1; Foundations of Generative AI |
| 2 | Learning How to Learn; Discrete Mathematics; Data Engineering for Product Development; Applied Full Stack Web Development; Indian Constitution; **Capstone Project**; Breadth of Computer Science – 2; Professional Skills for the Workplace |
| 3 | Environmental Sciences; Personal Leadership & Self-Management; **Internship / Project – 1**; Data Structures and Algorithms; Object-Oriented Programming |
| 4 | Database Management Systems; Organizational Behavior; Operating Systems; Machine Learning & Statistical Modeling; **Internship / Project – 2** |
| 5 | Universal Human Values; Computer Organization & Architecture; Design & Analysis of Algorithms; DevOps Foundations; **Internship / Project – 3** |
| 6 | Essence of Indian Knowledge Tradition; Computer Networks; System Design; **Internship / Project – 4**; Professional Elective #1 |
| 7 | Business Thinking & Entrepreneurship; Professional Electives #2 and #3; **Internship / Project – 5** |
| 8 | Open Elective; **Internship / Project – 6** |

## Focus by year
- **Sem 1–2: Foundations for AI-native engineers**: programming fundamentals, web basics, databases, full stack, CS breadth, communication, learning science; smart capstone projects by the end of semester 2.
- **Sem 3–4: Core engineering + applied AI**: DBMS, OOP, OS, DSA, full-stack systems, practical ML.
- **Sem 5–6: Systems thinking in an AI world**: computer architecture, networks, system design, DevOps, cloud, specialisation electives.
- **Sem 7–8: Advanced engineering & AI at scale**: cloud-native and distributed systems, MLOps/serverless, business context, production-grade internships/projects.

**Internship / Project courses (semesters 3–8)** are the transition to real-world work: internships, open-source development, simulated industry sprints or AI product building, assessed on deliverables under real deadlines plus reflective documentation. Text books include the **Kalvium Livebook** (internal structured course material).`
  },
  {
    college: 'kalvium',
    title:
      'Kalvium integrated work (internship) assessment: progress reports, report and presentation',
    domain: 'academics',
    sourceSystem: 'kalvium_guide',
    authority: 'joint',
    program: 'B.Tech CSE – Software Product Engineering (Kalvium)',
    effectiveDate: '2023-05-01',
    sourceUrl: SYLLABUS_2023,
    content: `# Assessment of Integrated Work with partner companies

> From the 2023 JECRC × Kalvium detailed syllabus. The 2026 syllabus renames these courses "Internship / Project 1–6" and does not restate the weightage; confirm the current scheme with your Kalvium mentor.

In the 2023 scheme, students do **Integrated Work with partner companies (paid remote internships) in semesters 3 to 8**, with credits each semester (8 credits per semester in semesters 3–7, 20 credits in semester 8; 184 credits in the whole programme).

- **Fortnightly progress reports** during the internship: analysis of work done, learnings so far, challenges with proposed solutions. Evaluated by a Kalvium supervising mentor.
- **Internship report** after the internship (by a set deadline): an analysis of the project done and a reflection on the learning over the six months.
- **Internship presentation** to a panel of unbiased assessors (not the supervising mentor): **1 hour = 30 minutes presentation + 30 minutes questions**.

| Component | Weight |
| --- | --- |
| Progress reports (supervising mentor) | 20% |
| Internship report / presentation (panel) | 20% |
| Monthly performance rating by the company's supervising manager (weighted average) | 60% |

Monthly ratings can cover punctuality, professionalism, quality of work, meeting deadlines, willingness to learn and collaboration.

Every Kalvium course uses **continuous assessment**: 3–6 assessments spread through the course, each with a set weight.`
  },
  {
    college: 'kalvium',
    title: 'Kalvium laptop (BYOD) policy and minimum specification',
    domain: 'general',
    sourceSystem: 'kalvium_web',
    authority: 'kalvium',
    effectiveDate: '2026-08-08',
    sourceUrl: BYOD,
    content: `# Bring Your Own Device (BYOD) at Kalvium

BYOD is **not optional**: every enrolled student brings their own laptop meeting the minimum specification. There are **no shared computer labs**, and Kalvium does not provide laptops. The laptop is a separate family expense (not subsidised by Kalvium or the university).

## Minimum specification
| Component | Requirement |
| --- | --- |
| Processor | Intel Core i7 or higher, or AMD Ryzen 7 or higher (6 threads or more) |
| RAM | 16 GB or higher |
| Storage | 256 GB SSD or higher |
| Webcam | Required, built in |
| Operating system | Windows or Linux preferred |
| Connectivity | Ethernet port, or a USB-to-Ethernet dongle |

Kalvium does not recommend specific models. JECRC separately requires B.Tech students to bring laptops for lab work; students without one are marked absent in labs.`
  },
  {
    college: 'kalvium',
    title: 'KNET (Kalvium National Entrance Test) and the selection process',
    domain: 'admissions',
    sourceSystem: 'kalvium_web',
    authority: 'kalvium',
    effectiveDate: '2026-05-30',
    sourceUrl: KNET,
    content: `# KNET and Kalvium selection

KNET is a **fit-based** test for admission to the Kalvium B.Tech CSE, not a syllabus-recall exam. **No JEE rank is needed**, and students may sit other entrance exams alongside it.

## Selection steps (in order)
1. **Psychometric assessment**: a short questionnaire on how you learn and work (not used to reject anyone for personality).
2. **KNET**: taken on a laptop; interactive thinking-skill exercises plus a structured section on logical reasoning, quantitative ability and English.
3. **In-person interview** with the admissions team after the KNET result.

- **Fee:** ₹1,200, paid once to Kalvium, covering the full selection process.
- **Dates:** KNET runs in phases as partner-university seats are released; there is no fixed public calendar. Register at **admissions.kalvium.com** to see the next slot.
- Scoring is shared with the student along with an overall profile.
- **Preparation:** official mock test, explainer videos and setup checklist on kalvium.com/knet/. Test your laptop, webcam and internet the day before.
- A single KNET score is valid across all partner universities (including JECRC University). JECRC also requires the KNET and personal interview for its B.Tech CSE – Software Product Engineering (Kalvium) programme.

Free 30-minute counselling call: https://kalvium.com/12th-science-student-counseling/`
  }
]
