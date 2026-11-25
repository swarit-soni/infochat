import type { KnowledgeSeedDocument } from './types'

const BROCHURE_2026 =
  'https://jecrcuniversity.edu.in/wp-content/uploads/2026/04/JU-Information-Brochure-2026.pdf'
const CGPA_REGULATIONS =
  'https://jecrcuniversity.edu.in/upload/JU-291218042011-0-.pdf'
const HOSTEL_RULES =
  'https://jecrcuniversity.edu.in/wp-content/uploads/2024/01/Hostel-Rules-and-Regulations-2024.pdf'

/** JECRC University, Jaipur: official public sources, read 2026-11-24. */
export const JECRC_KNOWLEDGE: KnowledgeSeedDocument[] = [
  {
    college: 'jecrc',
    title: 'JECRC University: address, helplines and department contacts',
    domain: 'general',
    sourceSystem: 'official_website',
    authority: 'jecrc',
    effectiveDate: '2026-11-24',
    sourceUrl: 'https://jecrcuniversity.edu.in/contact-us/',
    content: `# JECRC University contacts

**Address:** JECRC University, Plot No. IS-2036 to IS-2039, Ramchandrapura Industrial Area, Vidhani, Sitapura Extension, Jaipur-303905, Rajasthan.

JECRC University was established under the JECRC University Act, 2012 and is recognised by the UGC.

## Helplines (Information Brochure 2026)

| Office | Phone |
| --- | --- |
| Admission helpline (toll free) | 1800 120 5616 |
| Application form helpline | +91 8079076597 |
| Transfer cases admission | +91 9982066880 |
| Ph.D. admission | +91 9001699997 |
| Registrar Office | +91 9116642282 |
| Accounts Department | +91 9358836595 |
| Hostel (Boys / Girls) | +91 7727039228 / +91 9358724196 |
| Transportation | +91 9358836596 |
| IT Department – ERP dashboard login | +91 9982066992 |
| National Anti-Ragging Helpline | 1800-180-5522 |

## Department contacts (Contact Us page)

| Office / person | Phone | Email |
| --- | --- | --- |
| Admissions (general) | 1800-120-5616 | admission@jecrcu.edu.in |
| Mr. Manish Sharma, Director Admissions | – | director.admission@jecrcu.edu.in |
| Prof. Prashant Sahai Saxena, Directorate of Executive Education | +91-9116107504 | admissions.dee@jecrcu.edu.in |
| Prof. (Dr.) Sanjay K Sharma, Dean Research (Ph.D. enquiry) | +91-9001699997 | dean.research@jecrcu.edu.in |
| Accounts Department | +91-9413081762 | accounts@jecrcu.edu.in |
| Training and Placement Office | – | tpo@jecrcu.edu.in |
| Registrar Office | – | registrar@jecrcu.edu.in |
| VC (President) Office | – | president@jecrcu.edu.in |
| Dr. Varsha Gupta, Transfer / Lateral Entry | – | varsha.gupta@jecrcu.edu.in |
| Controller of Examination | – | coe@jecrcu.edu.in |
| Deputy Controller of Examination | – | deputy.coe@jecrcu.edu.in |
| Mr. Nirmal Jain, Dy. Director (Hostels) | +91-9358724196 | – |
| Mr. Satyavir Singh, Chief Warden | +91-7727039228 | – |
| Ms. Kajal, Hostel Office (Girls) | +91-7300061890 | – |
| HR Office | – | hr@jecrcu.edu.in |

## Anti-Ragging Committee

- Prof. Naveen Hemrajani: +91-9829032657
- Prof. Widhi Dubey: +91-9828277067
- Prof. Narendra Kaushik: +91-98118 20859

Source: JECRC University Contact Us page and Information Brochure 2026 (${BROCHURE_2026}).`
  },
  {
    college: 'jecrc',
    title: 'JECRC attendance rules: 75% per course, relaxation and detention',
    domain: 'academics',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2026-04-01',
    sourceUrl: BROCHURE_2026,
    content: `# Attendance rules (JECRC University, Information Brochure 2026)

- **Minimum 75% attendance is mandatory in each course/subject in all semesters**; otherwise the student is detained.
- A **maximum relaxation of 10%** may be granted on valid grounds with approval from the concerned authorities.
- **Medical relaxation** requires submitting the relevant documents **within 7 days of hospital discharge**.
- Participation in approved academic, cultural, sports, NCC/NSS and similar activities is encouraged with prior approval. Students on official duty are treated as on duty, but **no relaxation beyond 10%** is allowed.
- Attendance is counted from the date classes start, or from the date of admission (or revocation, if applicable).
- **Detained students cannot appear in end-semester exams** and must repeat the subject in the summer semester or complete an approved SWAYAM course.
- Names of detained students are announced **4 days before examinations**; appearing in an exam while detained makes the result null and void.
- **Attendance is shown on the ERP portal** (https://jecrc.mastersofterp.in/); no separate shortage notice is sent.
- **Mass-cut fine:** ₹50 per period; ₹200 for a full day.

## Detained courses: SWAYAM or summer semester

A student detained for attendance in a course registers for that course on the **SWAYAM** portal after written approval from the HOD (the HOD may assign a relevant course if it isn't on SWAYAM) and submits proof of the credits earned. One credit is awarded per 4-week course. In exceptional cases the student may instead register in the **summer semester**, for these fees:

| Programme | Summer-semester / detained fee |
| --- | --- |
| B.Tech and MBA | ₹15,000 per theory subject; ₹7,500 per lab subject |
| All other programmes | ₹7,500 per theory or lab subject |

Scholarship holders: attendance at or below 75% in any subject ends the scholarship even if the exam was allowed with a relaxation (see the scholarship rules).`
  },
  {
    college: 'jecrc',
    title: 'JECRC fee payment schedule, late fee and re-admission',
    domain: 'fees',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2026-04-01',
    expiresAt: '2027-07-31',
    sourceUrl: BROCHURE_2026,
    content: `# Fee payment rules (JECRC University, AY 2026-27)

Fees for the whole programme are payable **annually in two instalments**, regardless of when semesters start or results are declared.

| | First year | Subsequent years |
| --- | --- | --- |
| 1st instalment | At the time of admission | On or before **15 April** of the calendar year |
| 2nd instalment | On or before **15 November 2026** | On or before **15 November** of the calendar year |

## Late fee
- Students who miss the due date pay a fine of **₹500 per day, including Sundays/holidays, for up to 10 days**.
- If the fee and fine are not paid within 10 days of the due date, the student's name is **struck off the rolls**.
- Re-admission needs approval from the Dean/Director of the school and payment of **₹5,000 re-admission charges plus the fees and a ₹5,000 fine**. The struck-off period still counts for the attendance requirement.
- If the last date is a holiday, the next working day counts as the last date.
- **No separate fee notice is issued**: paying on time is the student's and parents' responsibility.

## Other charges
- One-time **Alumni & Admission fee: ₹10,000** (non-refundable), paid with the first instalment.
- Application form: ₹1,000 (UG/PG), ₹1,500 (Ph.D.), non-refundable.
- Change of degree programme (only until the final admission cutoff): fee adjustment plus **₹500 for a new ID card**.
- Demand drafts are payable to "JECRC University".

## Interest-free fee loan
MS Fincap (NBFC) offers zero-interest, collateral-free fee loans up to 100% of academic fees, in partnership with the university (processing fee + GST applies). Contact: www.edcred.in, info.edcred@msfincap.com, 9166845335 / 9700014666, or their staff on campus.

## Laptops
Students of B.Tech, B.Des., BVA, BCA, MCA, BBA, MBA, M.Des. and MVA must bring their own laptops for lab work. Students without laptops are not allowed into lab classes and are marked absent.`
  },
  {
    college: 'jecrc',
    title:
      'JECRC withdrawal and refund rules 2026 (academic, bus and hostel fees)',
    domain: 'fees',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2026-04-01',
    expiresAt: '2027-07-31',
    sourceUrl: BROCHURE_2026,
    content: `# Withdrawal Policy & Refund Rules 2026 (JECRC University)

## How to withdraw
Submit a withdrawal application **in person**, with the **original fee receipt**, to the Office of the Registrar through the **Deputy Registrar (Academics), Admin Block**, and keep the acknowledgment. Refunds are made by cheque/NEFT in the candidate's name within one month after the final admission cutoff date. Refund queries are only entertained with the acknowledgment number and date.

## (A) Academic fees (per UGC notifications of 12 June 2024 and 27 October 2025)
- **Full refund** for cancellations/migrations **up to 30 September 2026**.
- **Up to 31 October 2026:** refund with a deduction of **not more than ₹1,000** as processing fee.
- **After 31 October 2026: no refund.**

## (B) Bus fees
| When the withdrawal notice is given | Deduction |
| --- | --- |
| 15 days or more before classes start | ₹3,000 |
| Within 15 days before classes start | ₹5,000 |
| Up to 15 days after classes start | ₹10,000 |
| 15–30 days after classes start | ₹20,000 |
| After 30 days of classes | No refund |

## (C) Hostel fees
| When the withdrawal notice is given | Deduction |
| --- | --- |
| 15 days or more before classes start | ₹5,000 |
| Within 15 days before classes start | 10% of annual fees |
| Up to 15 days after classes start | 20% of annual fees |
| 15–30 days after classes start | 50% of annual fees |
| After 30 days of classes | No refund |

These withdrawal rules apply to **first-year students**. No refund is made if a student leaves after the first-year admission cutoff date, and a student who leaves the programme midway is liable for the fees of the balance duration (per the Supreme Court's Islamic Academy of Education judgment). The **₹10,000 alumni & admission fee and the application fee are non-refundable**. Outside the first-year withdrawal policy, hostel and bus fees once paid are not refunded.`
  },
  {
    college: 'jecrc',
    title: 'JECRC hostel and bus fees 2026-27',
    domain: 'fees',
    sourceSystem: 'official_website',
    authority: 'jecrc',
    effectiveDate: '2026-04-01',
    expiresAt: '2027-07-31',
    sourceUrl: 'https://jecrcuniversity.edu.in/hostel-transportation-fee/',
    content: `# Hostel and transportation fees, 2026-27 (JECRC University)

## Hostel fee (per annum)
| Room category | Annual fee | One-time registration (non-refundable) | 1st instalment at admission (with registration fee) | 2nd instalment |
| --- | --- | --- | --- | --- |
| AC room, three seated (single occupancy) | ₹1,72,000 | ₹5,000 | ₹1,08,000 | ₹69,000 |
| Non-AC room, three seated (single occupancy) | ₹1,42,000 | ₹5,000 | ₹90,000 | ₹57,000 |
| Non-AC room, four seated (single occupancy) | ₹1,27,000 | ₹5,000 | ₹81,000 | ₹51,000 |

- Hostels are allotted for **only two years (four semesters) for all UG programmes**, and only when a seat is available.
- The fee covers **10 months**; a separate fee applies for the summer semester.
- The hostel is taken for the whole academic year: students sign an undertaking to pay the 2nd instalment even if they stop using the hostel in the even semester. **No refund of hostel fee once paid**, including when operations are suspended for reasons beyond the university's control (e.g. pandemic, curfew).
- **Gymnasium:** ₹1,000 per semester, non-refundable (hostellers who opt in).
- **GST extra** as applicable. Both instalments are paid with the academic fees by the cutoff dates.

## Bus (transportation) fee
| Annual fee | 1st instalment | 2nd instalment |
| --- | --- | --- |
| ₹55,000 | ₹33,000 | ₹22,000 |

- Seats are given only when available, on identified routes from specific pickup points.
- Taken for the whole year, with the same undertaking: **no refund of bus fee once paid**. GST extra.

Fees are revised in later years. Hostel contacts: Mr. Nirmal Jain, Dy. Director (Hostels) +91-9358724196; Mr. Satyavir Singh, Chief Warden +91-7727039228; Ms. Kajal (girls' hostel) +91-7300061890.

The university also lists "JECRC Approved Hostels" outside campus (e.g. Unique Green Meadows boys' hostel; Seasons Park, Shree Kishan Residency, Dreamer's Nest and Shree Ram girls' hostels). The brochure states the university only facilitates these and is not responsible for issues arising from staying there.`
  },
  {
    college: 'jecrc',
    title: 'JECRC hostel rules: timings, out-pass, mess and discipline',
    domain: 'general',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2024-01-01',
    sourceUrl: HOSTEL_RULES,
    content: `# Hostel rules and regulations (JECRC University, 2024 edition)

## Admission to the hostel
- Only admitted students are eligible. The hostel is allotted for a **minimum of one academic year (two semesters)**; vacating is permitted only after one academic year.
- Rooms are allotted by the Dy. Director Hostels / Chief Warden; room changes need their prior permission.
- Continued stay depends on academic performance, behaviour and conduct. Students expelled/suspended must vacate the same day (no refund; dues recovered).
- Students with chronic medical problems may be asked to vacate if personal care by parents is needed.

## Daily rules
- **Attendance in the hostel at 10:00 PM every day**; all residents must be in their rooms.
- **Main gates close at 10:00 PM (boys) and 9:00 PM (girls).** Late entry without permission is fined; regular latecomers are expelled from the hostel.
- All movement is recorded in the movement register. Proxy attendance or false entries are punishable.
- Residents may not stay in rooms during class hours; absence from class is reported to parents and HoDs.
- Silence in rooms, corridors and common areas. Day scholars are not allowed in hostels.
- **Prohibited:** smoking, alcohol, drugs, gambling (including cards), weapons, birthday/other parties in rooms, cricket/outdoor games inside, personal routers, LPG/burners, room heaters, immersion rods, irons. Laptops are for academic use only; surprise checks are carried out.
- Ragging leads to immediate removal from the hostel (the Registrar's decision is final). Smoking, alcohol or drugs can also lead to rustication from the university.
- Vehicles (two/four-wheelers) need specific permission. Carry your ID card when leaving the main gate.

## Out-pass and leave
| | Weekdays | 3rd Saturday, holidays, Sundays |
| --- | --- | --- |
| Boys | 5:00 PM – 8:30 PM | 8:00 AM – 8:30 PM |
| Girls | 5:00 PM – 6:00 PM | 10:00 AM – 6:00 PM |

- Night-out passes: boys with prior permission of the Dy. Director Hostels; girls only on the parents' request to visit a local guardian.

## Mess
- All hostel residents eat in the university mess, at the displayed timings only, and must carry their ID card.
- Food is served in rooms only for sick students registered with the warden. The kitchen is out of bounds. Wasting food, water or electricity can lead to removal from the hostel.

## Damage and vacations
- Damage is charged at **double the cost** (to the individual, the room-mates, or the floor/block if unidentified); repeat damage means expulsion.
- Rooms must be vacated before the summer vacation; a cloak room is provided for belongings. Return a day before classes restart.
- Leaving the hostel requires parents' approval; the hostel fee is not refunded and any balance is recovered.
- A 24-hour ambulance is available on the hostel premises.

The university website also lists "Hostel Rules and Regulations 2026"; where they differ, the latest rules apply.`
  },
  {
    college: 'jecrc',
    title: 'JECRC merit scholarships 2026 and how to keep them',
    domain: 'fees',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2026-04-01',
    expiresAt: '2027-07-31',
    sourceUrl: BROCHURE_2026,
    content: `# Scholarship scheme for new students (JECRC University, 2026)

Scholarships are a percentage of the **tuition fee** only.

| # | Scholarship | Criteria | Programmes | % of tuition fee |
| --- | --- | --- | --- | --- |
| 1 | Merit | 70% to 84.99% aggregate in 10+2 | All UG | 15% |
| 2 | Merit | 85% and above aggregate in 10+2 | All UG | 25% |
| 3 | Merit | JEE (Main) 2026 percentile 75 to 89.99 (General) | All B.Tech | 15% |
| 4 | Merit | JEE (Main) 2026 percentile 90 and above (General) | All B.Tech | 25% |
| 5 | Merit | CAT 2025 percentile 40 to 59.99 | MBA | 15% |
| 6 | Merit | CAT 2025 percentile 60 and above | MBA | 25% |
| 7 | Additional (one time) | NCC 'A' certificate, alumni, sibling, JU employee, single mother, single girl child, war widow, father ex-services/para-military killed in action, or sports medallist at state level or above | All programmes | 10% |

- **Only one** of scholarships 1–4 is given, whichever is higher. Merit is calculated on all subjects in the qualifying exam.
- **Not applicable** to B.Tech CSE – Software Product Engineering (Kalvium programme), or to transfer/lateral admissions.
- Students receiving government or private financial assistance for education are not eligible. The university may discontinue the scheme at its discretion.

## Keeping the scholarship
- Maintain a **minimum CGPA of 8.0** (SGPA in the 1st semester), **no compartment** in any subject, and **at least 75% attendance in every course**. Reviewed at the end of every even semester.
- A CGPA of 7.99 or lower, or attendance at or below 75% in any subject, loses the scholarship, even if the exam was allowed under an attendance relaxation. It may be restored after the next even-semester review if the criteria are met again.
- The scholarship is withdrawn permanently if the student is found guilty of indiscipline (including a written warning).`
  },
  {
    college: 'jecrc',
    title:
      'JECRC admission process, documents and eligibility relaxations (2026-27)',
    domain: 'admissions',
    sourceSystem: 'official_website',
    authority: 'jecrc',
    effectiveDate: '2026-04-01',
    expiresAt: '2027-07-31',
    sourceUrl:
      'https://jecrcuniversity.edu.in/important-instructions-students-of-application-and-admission/',
    content: `# Admission process (JECRC University, AY 2026-27)

As of November 2026 the website shows **applications and admissions closed for AY 2026-27** (UG, PG, lateral/migration and DEE).

## Applying
- Apply online at www.jecrcuniversity.edu.in (form fee ₹1,000 for UG/PG, ₹1,500 for Ph.D.; non-refundable). The application number is used for all correspondence.
- **In-person counselling** before the Admission Committee is mandatory: report to the Registration Desk in formal dress. Seats are allotted on merit, subject to availability, and confirmed only when the fee is paid on the spot. Canvassing leads to rejection.
- Admission is provisional until the Registration Branch confirms it. The final admission cutoff for AY 2026-27 was **31 August 2026**; PG candidates admitted provisionally had to meet eligibility by **31 October 2026**.

## Merit basis by programme
- **B.Tech:** JEE Main 2026, then CUET-UG 2026, then Class XII aggregate. (B.Tech CSE – Software Product Engineering with Kalvium additionally requires the KNET and personal interview.)
- **Other UG:** CUET-UG 2026 where applicable, otherwise Class XII aggregate.
- **Integrated law:** CLAT 2026, then CUET-UG, then the qualifying exam.
- **MBA:** CAT/MAT/XAT plus group discussion and interview. **B.Des / BVA:** portfolio and interview.

## Documents to bring (originals + one set of self-attested copies)
10th marksheet; 12th marksheet; graduation marksheet (PG) / PG marksheet (Ph.D.); migration certificate; character certificate from the last institution; caste certificate (only to claim eligibility relaxation); gap-year affidavit if applicable; Aadhaar card copy; four passport-size colour photographs in formal dress; **APAR ID** proof; and the **Anti-Ragging undertaking reference number** from the national Anti-Ragging portal.

## Relaxations and seats
- **5% relaxation in eligibility** for SC/ST, women, and Rajasthan State OBC (non-creamy layer) candidates in all UG/PG programmes.
- Seat split: **15% NRI / foreign national / PIO**, 85% general.
- Programme changes are not allowed after the session starts.`
  },
  {
    college: 'jecrc',
    title: 'JECRC grading, SGPA/CGPA and promotion rules (CGPA regulations)',
    domain: 'examinations',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2016-07-01',
    sourceUrl: CGPA_REGULATIONS,
    content: `# Academic evaluation under the CGPA scheme (JECRC University)

> This regulations document is older: its credit tables list batches up to 2016-2020. It is still the university's published CGPA regulation, but where the Information Brochure 2026 differs (for example attendance relaxation: up to 10% in 2026, 5% here), **the 2026 brochure applies**. Confirm current rules with the Controller of Examinations (coe@jecrcu.edu.in).

## Assessment
- 50% in-semester assessment + 50% end-semester exam for theory subjects.
- Two compulsory in-semester (sessional) exams of 1.5 hours (50 marks each, weighted 30%), an optional third, and **20 marks for assignments and attendance** (15 assignment + 5 attendance). Attendance marks: 75–79% = 1, 80–84% = 2, 85–89% = 3, 90–94% = 4, 95%+ = 5.
- One make-up in-semester exam is held for students who missed one on medical grounds (decided by a school-level committee).
- Labs: about 12 practicals per semester; the best 10 count.
- **Minimum to pass the end-semester theory exam: 35/100** (17.5/50 after scaling).

## Grades
| Grade | A+ | A | B | C | D | E | F | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grade point | 10 | 9 | 8 | 7 | 6 | 5 | 0 | – |

- Grades A+ to E pass. **I** = incomplete (attendance not met, or absent from the end-sem exam for a valid reason applied for in advance). Absent without valid reason = **F**.
- Relative grading uses the class mean and standard deviation: A+ cutoff = mean + 1.5σ (between 75 and 100), E cutoff = mean − 2σ (between 35 and 50); at most about 10% of the class gets A+. Classes under 30 use modified absolute grading.
- **Absolute grading for detained and failed students:** A+ ≥ 90, A 80–89, B 70–79, C 60–69, D 50–59, E 35–49, F < 35. The **maximum grade for a failed student is C**.

## SGPA / CGPA
- GPA (SGPA) = Σ(grade point × credits) ÷ total credits in the semester.
- CGPA = Σ(semester GPA × semester credits) ÷ total credits of all semesters, to two decimals.
- **Equivalent percentage = CGPA ÷ 1.1.** No class or division is awarded; the CGPA appears on the grade card.

## Promotion and duration
| Promotion | Minimum credits earned |
| --- | --- |
| Odd → even semester | No minimum |
| I year → II year | 50% |
| II year → III year | 60% |
| III year → IV year | 60% |
| Degree | All credits defined by the Board of Studies |

- Maximum time to finish: **2n years** (n = normal duration). A student who can't earn the I→II year credits within two years is declared not fit to continue unless the university extends.
- **Summer (extra) semester:** about 8 weeks, for backlogs and attendance shortages; register for up to 50% of a semester's credits, with 75% attendance required in each subject.
- **Re-evaluation:** answer scripts are shown to students before award lists go to the COE, so there is normally no re-evaluation; the COE can order one after a reported discrepancy.`
  },
  {
    college: 'jecrc',
    title: 'JECRC examination hall rules and unfair-means penalties',
    domain: 'examinations',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2016-07-01',
    sourceUrl: CGPA_REGULATIONS,
    content: `# Examination conduct (JECRC University CGPA regulations)

## In the exam hall
- Entry only after checking the **I-card and hall ticket**. **No entry after 30 minutes** from the start (late entry only with permission of the Deputy Controller of Examinations).
- **No washroom visits in the first hour**; later visits are recorded.
- **Mobile phones are not allowed** in the exam hall. No additional answer sheets are issued. Calculators and stationery may not be exchanged.
- Sign only in your own column of the attendance sheet; don't leave until your answer sheet is returned and verified.
- Results are published online for students and parents.

## Unfair means
- **Category I (minor):** possessing notes/chits/books related to the paper, giving or receiving help, copying, writing on body or items, identifying marks in the answer book, appeals for marks, **carrying a mobile phone**.
- **Category II (serious):** abusive language, disturbing others, tearing answer sheets, destroying evidence, a second Category I offence.
- **Category III (very serious):** breaching exam confidentiality, impersonation, third Category I or second Category II offence.

**Procedure:** the student is expelled from the hall and that paper is cancelled; they may sit the remaining papers provisionally. A Malpractice Committee recommends the penalty, confirmed by the VC.

| Offence | End-semester exam penalty |
| --- | --- |
| Category I | At least that paper scrapped; at most all papers of that exam |
| Category II | At least all papers of that exam scrapped; up to one-year suspension |
| Category III | Suspension of at least one year, up to rustication |

For sessional exams the Dean investigates; penalties range from scrapping the paper to suspension or rustication for repeat Category II/III offences.`
  },
  {
    college: 'jecrc',
    title: 'JECRC back examination form, odd semester 2026-27 (offline)',
    domain: 'examinations',
    sourceSystem: 'official_notice',
    authority: 'jecrc',
    priority: 'urgent',
    effectiveDate: '2026-11-04',
    expiresAt: '2027-01-31',
    actionRequired:
      'Students with backlogs who could not submit the online form: submit the offline form at the Dy. COE Office (9:30 AM–4:30 PM) with result and payment proof by 20 Nov 2026.',
    sourceUrl:
      'https://jecrcuniversity.edu.in/wp-content/uploads/2026/11/Back_Exam_Form_(Offline)_Odd_Sem_2026_27.pdf',
    content: `# Offline back examination form – odd semester session 2026-27

Notice Ref. JU/2026/Dy.COE/Back Exam.Nov.-2026/604, dated **4 November 2026**, Examination Conduct Cell (Dr. Jitendra Kumawat, Deputy COE).

**Who:** students of passed-out batches of all schools/courses, and students who couldn't submit the online back exam form due to technical issues, must submit the back exam form in **hard copy**.

- Registration in offline mode starts **12 November 2026**; the form is available in the **E-Notice** section from that date.
- Fill all details in **CAPITAL LETTERS** with full subject names and codes. Attach a printout of the **result proof and payment proof**.
- **Submission:** 9:30 AM to 4:30 PM at the **Dy. COE Office**. Sunstone, ISDC, CollegeDekho and MBA FinTech (Imarticus) students submit to their department coordinators.
- Back exams for registered subjects are held during or after the regular examination period.

## Examination fee (by date of submission)
| Submission date | Fee per paper |
| --- | --- |
| 12–16 November 2026 | ₹700 |
| 17–18 November 2026 | ₹1,400 |
| 19–20 November 2026 | ₹2,100 |

No forms are accepted after the stated dates. Payment link: https://securepayments.payu.in/omni/JECRCUM/`
  },
  {
    college: 'jecrc',
    title:
      'JECRC student portals: ERP, service & support desk, academic calendar',
    domain: 'general',
    sourceSystem: 'portal_guide',
    authority: 'jecrc',
    effectiveDate: '2026-11-24',
    sourceUrl: 'https://jecrcuniversity.edu.in/',
    content: `# Where to find things online (JECRC University)

- **ERP (MastersoftERP): https://jecrc.mastersofterp.in/**: the JECRC homepage links its *ERP Login*, *E-Notice*, *Result* and *New Parent Portal Login* here. Use it for attendance, results, notices and fee details. ERP dashboard login help: +91 9982066992.
- **JU Service & Support Portal: https://sws.jecrcuniversity.edu.in/**: single-window service and grievance desk. Raise and track queries, **reset your ERP password** (OTP to the registered email), and get help to check attendance, apply for **OD (on duty)**, upload assignments, pay fees and get no-dues.
- **Academic calendar:** https://jecrcuniversity.edu.in/academic-calendar/ (also the list of holidays).
- **Refund policy:** https://jecrcuniversity.edu.in/refund-policy/
- **Hostel & transportation fee:** https://jecrcuniversity.edu.in/hostel-transportation-fee/
- Fee demand, late-fee and back-exam notices are posted on the JECRC homepage and the E-Notice section.

Never share your ERP password. The university gives no separate attendance-shortage notice: check the ERP regularly.`
  }
]
