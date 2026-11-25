-- Sera Demo University: a fictional college for live demonstrations (no real
-- institution has authorized an integration yet). Everything here is
-- invented. Additive and idempotent. Its knowledge-base documents are loaded
-- with `bun run seed:knowledge sera-demo` (lib/rag/knowledge-seed/demo.ts).
--
-- Students choose the college at onboarding. Demo mentors are added by email
-- to college_mentor_allowlist, with their email domain in mentor_domains.

INSERT INTO "colleges" (
  "slug", "name", "short_name", "location", "website",
  "official_web_domains", "partner_colleges", "mentor_domains",
  "student_domains", "mentor_requires_allowlist", "aliases",
  "squad_label", "residency_label", "events_label", "gchat_spaces",
  "enabled", "sort_order"
) VALUES (
  'sera-demo', 'Sera Demo University (fictional)', 'Sera Demo University',
  'Demo City (fictional)', 'https://sera-demo.example',
  ARRAY['sera-demo.example']::text[], '{}'::text[], '{}'::text[], '{}'::text[],
  true, ARRAY['Sera Demo University', 'Demo University', 'SDU']::text[],
  'Section', 'Hostel / day scholar', 'Events', '{}'::text[], true, 40
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

INSERT INTO "official_portals" (
  "id", "college", "portal_key", "name", "authority", "url", "requires_login",
  "capabilities", "navigation_steps", "support_contact"
) VALUES
  ('portal_sera-demo_student', 'sera-demo', 'sera-demo_student',
   'Sera Demo University Student Portal (fictional)', 'sera-demo',
   'https://sera-demo.example/portal', 1,
   'Attendance, semester results, fee payment and receipts, hall tickets and late-entry requests.',
   '1. Open the student portal. 2. Sign in with your student ID. 3. Fees, hall tickets and attendance are in the left menu.',
   'helpdesk@sera-demo.example (extension 1234)'),
  ('portal_sera-demo_placements', 'sera-demo', 'sera-demo_placements',
   'Sera Demo University Placement Portal (fictional)', 'sera-demo',
   'https://sera-demo.example/placements', 1,
   'Placement drive registration, resume upload and interview slots.',
   '1. Sign in to the placement portal. 2. Upload your resume. 3. Open Drives, choose a company and register.',
   'placements@sera-demo.example')
ON CONFLICT ("college", "portal_key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "campus_events" (
  "id", "college", "title", "organizer", "authority", "category", "start_at",
  "end_at", "venue", "registration_deadline", "eligibility", "status"
) VALUES
  ('event_sera-demo_hackathon', 'sera-demo', 'DemoFest Hackathon',
   'SDU Coding Club', 'sera-demo', 'hackathon',
   '2026-12-12 09:00:00+05:30', '2026-12-13 09:00:00+05:30', 'Innovation Lab',
   '2026-12-08 23:59:00+05:30', 'All students, teams of 2 to 4', 'upcoming'),
  ('event_sera-demo_lecture', 'sera-demo', 'Guest lecture: Building with AI',
   'Department of Computer Science', 'sera-demo', 'lecture',
   '2026-12-04 15:00:00+05:30', '2026-12-04 17:00:00+05:30', 'Auditorium',
   NULL, NULL, 'upcoming'),
  ('event_sera-demo_sports', 'sera-demo', 'Annual sports day',
   'SDU Sports Committee', 'sera-demo', 'sports',
   '2026-12-19 08:00:00+05:30', '2026-12-19 16:00:00+05:30', 'Main ground',
   '2026-12-14 23:59:00+05:30', NULL, 'upcoming')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "unanswered_queries" (
  "id", "college", "query", "domain", "reason", "kind", "status"
) VALUES
  ('uq_sera-demo_bus', 'sera-demo',
   'Is there a college bus from Demo City station on Sundays?', 'general',
   'No transport information in the knowledge base.', 'abstention', 'open'),
  ('uq_sera-demo_electives', 'sera-demo',
   'When will the semester 5 elective list be published?', 'academics',
   'No document mentions semester 5 electives.', 'abstention', 'open')
ON CONFLICT ("id") DO NOTHING;
