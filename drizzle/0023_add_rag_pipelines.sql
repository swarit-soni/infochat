CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"domain" varchar(64) DEFAULT 'general' NOT NULL,
	"source_system" varchar(64) NOT NULL,
	"authority" varchar(32) DEFAULT 'joint' NOT NULL,
	"program" varchar(128),
	"semester" varchar(64),
	"squad" varchar(128),
	"residency" varchar(64),
	"priority" varchar(32) DEFAULT 'standard' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"effective_date" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"supersedes_id" varchar(191),
	"supersedes_topic" text,
	"action_required" text,
	"source_url" text,
	"content" text NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"channel" varchar(64) DEFAULT 'mentor_upload' NOT NULL,
	"sender_role" varchar(64) DEFAULT 'mentor' NOT NULL,
	"uploaded_by" varchar(255),
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "knowledge_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_status_priority_expires_idx" ON "knowledge_documents" USING btree ("status","priority","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_domain_authority_status_idx" ON "knowledge_documents" USING btree ("domain","authority","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_content_hash_idx" ON "knowledge_documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_supersedes_id_idx" ON "knowledge_documents" USING btree ("supersedes_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_effective_date_idx" ON "knowledge_documents" USING btree ("effective_date");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"document_id" varchar(191) NOT NULL,
	"chunk_index" integer NOT NULL,
	"heading" text,
	"content" text NOT NULL,
	"contains_table" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"embedding" vector(768),
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', left(coalesce(heading, '') || ' ' || coalesce(content, ''), 100000))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_document_id_idx" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_document_chunk_idx" ON "knowledge_chunks" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_search_vector_idx" ON "knowledge_chunks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campus_events" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"organizer" text NOT NULL,
	"authority" varchar(32) DEFAULT 'joint' NOT NULL,
	"category" varchar(64),
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"venue" text,
	"campus_location" text,
	"online_url" text,
	"registration_url" text,
	"registration_deadline" timestamp with time zone,
	"eligibility" text,
	"guidelines" text,
	"results_summary" text,
	"results_url" text,
	"source_url" text,
	"status" varchar(32) DEFAULT 'upcoming' NOT NULL,
	"uploaded_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "campus_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campus_events_status_start_idx" ON "campus_events" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campus_events_registration_deadline_idx" ON "campus_events" USING btree ("registration_deadline");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "official_portals" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"portal_key" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"authority" varchar(32) NOT NULL,
	"url" text NOT NULL,
	"requires_login" integer DEFAULT 1 NOT NULL,
	"capabilities" text NOT NULL,
	"navigation_steps" text NOT NULL,
	"support_contact" text,
	"last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "official_portals_portal_key_unique" UNIQUE("portal_key")
);--> statement-breakpoint
ALTER TABLE "official_portals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "official_portals_authority_idx" ON "official_portals" USING btree ("authority");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unanswered_queries" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"chat_id" varchar(191),
	"query" text NOT NULL,
	"domain" varchar(64) DEFAULT 'general' NOT NULL,
	"cohort" text,
	"reason" text NOT NULL,
	"flagged_document_id" varchar(191),
	"kind" varchar(32) DEFAULT 'abstention' NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"resolved_by" varchar(255),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unanswered_queries_flagged_document_id_knowledge_documents_id_fk" FOREIGN KEY ("flagged_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
ALTER TABLE "unanswered_queries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unanswered_queries_status_created_idx" ON "unanswered_queries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unanswered_queries_domain_idx" ON "unanswered_queries" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unanswered_queries_flagged_document_idx" ON "unanswered_queries" USING btree ("flagged_document_id");--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'knowledge_documents' AND policyname = 'knowledge_documents_public_select'
  ) THEN
    CREATE POLICY "knowledge_documents_public_select" ON "knowledge_documents" AS PERMISSIVE FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'knowledge_documents' AND policyname = 'knowledge_documents_mentor_manage'
  ) THEN
    CREATE POLICY "knowledge_documents_mentor_manage" ON "knowledge_documents" AS PERMISSIVE FOR ALL TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor')) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'knowledge_chunks' AND policyname = 'knowledge_chunks_public_select'
  ) THEN
    CREATE POLICY "knowledge_chunks_public_select" ON "knowledge_chunks" AS PERMISSIVE FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'knowledge_chunks' AND policyname = 'knowledge_chunks_mentor_manage'
  ) THEN
    CREATE POLICY "knowledge_chunks_mentor_manage" ON "knowledge_chunks" AS PERMISSIVE FOR ALL TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor')) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campus_events' AND policyname = 'campus_events_public_select'
  ) THEN
    CREATE POLICY "campus_events_public_select" ON "campus_events" AS PERMISSIVE FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campus_events' AND policyname = 'campus_events_mentor_manage'
  ) THEN
    CREATE POLICY "campus_events_mentor_manage" ON "campus_events" AS PERMISSIVE FOR ALL TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor')) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'official_portals' AND policyname = 'official_portals_public_select'
  ) THEN
    CREATE POLICY "official_portals_public_select" ON "official_portals" AS PERMISSIVE FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'official_portals' AND policyname = 'official_portals_mentor_manage'
  ) THEN
    CREATE POLICY "official_portals_mentor_manage" ON "official_portals" AS PERMISSIVE FOR ALL TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor')) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unanswered_queries' AND policyname = 'unanswered_queries_public_select'
  ) THEN
    CREATE POLICY "unanswered_queries_public_select" ON "unanswered_queries" AS PERMISSIVE FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unanswered_queries' AND policyname = 'unanswered_queries_public_insert'
  ) THEN
    CREATE POLICY "unanswered_queries_public_insert" ON "unanswered_queries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unanswered_queries' AND policyname = 'unanswered_queries_mentor_manage'
  ) THEN
    CREATE POLICY "unanswered_queries_mentor_manage" ON "unanswered_queries" AS PERMISSIVE FOR UPDATE TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor')) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unanswered_queries' AND policyname = 'unanswered_queries_mentor_delete'
  ) THEN
    CREATE POLICY "unanswered_queries_mentor_delete" ON "unanswered_queries" AS PERMISSIVE FOR DELETE TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor'));
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "knowledge_documents" TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "knowledge_chunks" TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "campus_events" TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "official_portals" TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "unanswered_queries" TO app_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."knowledge_documents" FROM anon;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."knowledge_chunks" FROM anon;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."campus_events" FROM anon;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."official_portals" FROM anon;
    REVOKE UPDATE, DELETE ON TABLE "public"."unanswered_queries" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."knowledge_documents" FROM authenticated;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."knowledge_chunks" FROM authenticated;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."campus_events" FROM authenticated;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."official_portals" FROM authenticated;
    REVOKE UPDATE, DELETE ON TABLE "public"."unanswered_queries" FROM authenticated;
    GRANT SELECT ON TABLE "public"."knowledge_documents" TO authenticated;
    GRANT SELECT ON TABLE "public"."knowledge_chunks" TO authenticated;
    GRANT SELECT ON TABLE "public"."campus_events" TO authenticated;
    GRANT SELECT ON TABLE "public"."official_portals" TO authenticated;
    GRANT SELECT, INSERT ON TABLE "public"."unanswered_queries" TO authenticated;
  END IF;
END $$;--> statement-breakpoint
INSERT INTO "official_portals" ("id", "portal_key", "name", "authority", "url", "requires_login", "capabilities", "navigation_steps", "support_contact")
VALUES
  ('portal_jecrc_erp', 'jecrc_erp', 'JECRC ERP Portal', 'jecrc', 'https://jecrcuniversity.edu.in/erp', 1, 'Personal attendance percentage, course registration, fee payment history, official fee receipts, and personal student academic profile.', '1. Open the JECRC ERP Portal. 2. Sign in with your university enrollment ID and ERP password. 3. Use Academic -> Attendance for subject-wise percentage, or Finance -> Fee Receipts for payment confirmation.', 'JECRC ERP Helpdesk / Registrar Office'),
  ('portal_jecrc_enotice', 'jecrc_enotice', 'JECRC E-Notice Portal', 'jecrc', 'https://jecrcuniversity.edu.in/e-notice', 1, 'Official JECRC University circulars, exam form schedules, timetable revisions, holiday announcements, and campus-wide deadline notices.', '1. Open the JECRC E-Notice Portal. 2. Sign in with your student portal credentials. 3. Filter notices by Examination, Academics, or Accounts and download the latest signed PDF circular.', 'JECRC Academic & Examination Cell'),
  ('portal_jecrc_result', 'jecrc_result', 'JECRC Examination Result Portal', 'jecrc', 'https://jecrcuniversity.edu.in/results', 1, 'Individual semester examination results, grade cards, SGPA/CGPA transcripts, and re-evaluation/backlog application status.', '1. Open the JECRC Examination Result Portal. 2. Enter your enrollment number and select the exam session. 3. Download the provisional grade card or check re-evaluation status.', 'JECRC Controller of Examinations'),
  ('portal_jecrc_support', 'jecrc_support', 'JECRC Student Support Portal', 'jecrc', 'https://jecrcuniversity.edu.in/student-support', 1, 'Student grievance tickets, ID card/hostel/transport support requests, SLA contacts, and administrative escalation.', '1. Open the JECRC Student Support Portal. 2. Log in and select the relevant department category (Accounts, Hostel, Exams, IT). 3. Submit a support ticket with your enrollment number and screenshots.', 'JECRC Student Helpdesk'),
  ('portal_jecrc_parent', 'jecrc_parent', 'JECRC Parent Portal', 'jecrc', 'https://jecrcuniversity.edu.in/parent-portal', 1, 'Parent access to ward attendance, fee schedules, payment status, and official university communications.', '1. Open the JECRC Parent Portal. 2. Sign in using the registered parent credentials or student ID OTP. 3. View fee dues, attendance summary, and university notifications.', 'JECRC Parent & Student Relations'),
  ('portal_kalvium_dashboard', 'kalvium_dashboard', 'Kalvium Student Dashboard', 'kalvium', 'https://app.kalvium.community/dashboard', 1, 'Personal learning unit completion, assignment submissions, pending deadlines, assessment scores, personal learning progress, project team/repo reviews, elective enrollment, and 1:1 mentor booking.', '1. Sign in to the Kalvium Student Dashboard using your @kalvium.community Google account. 2. Open Learning Units, Assignments, Assessments, or Projects from the left navigation to check your personal standing or book a 1:1 mentor session.', 'Your Squad Mentor (@kalvium.com)')
ON CONFLICT ("portal_key") DO NOTHING;
