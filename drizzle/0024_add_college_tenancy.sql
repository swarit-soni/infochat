-- College (tenant) isolation. Every shared campus record belongs to exactly
-- one college, and each mentor manages only their college's records.
-- Existing campus rows were created for Kalvium.

-- 1. user_profiles: add the account's college (null = not enrolled, e.g. an
--    admission seeker) and when the student answered the college question.
--    Drop the Kalvium-only domain check: sign-in is open to any Google
--    account, and every signed-in account now gets a profile row.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "college" varchar(32);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "onboarded_at" timestamp with time zone;--> statement-breakpoint
UPDATE "user_profiles" SET "college" = 'kalvium', "onboarded_at" = COALESCE("onboarded_at", now()) WHERE "college" IS NULL AND split_part(lower("email"), '@', 2) IN ('kalvium.com', 'kalvium.community');--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_domain_matches_type";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profiles_college_idx" ON "user_profiles" USING btree ("college");--> statement-breakpoint

-- 2. Shared campus tables: add the owning college.
ALTER TABLE "knowledge_documents" ADD COLUMN IF NOT EXISTS "college" varchar(32) DEFAULT 'kalvium' NOT NULL;--> statement-breakpoint
ALTER TABLE "campus_events" ADD COLUMN IF NOT EXISTS "college" varchar(32) DEFAULT 'kalvium' NOT NULL;--> statement-breakpoint
ALTER TABLE "official_portals" ADD COLUMN IF NOT EXISTS "college" varchar(32) DEFAULT 'kalvium' NOT NULL;--> statement-breakpoint
ALTER TABLE "unanswered_queries" ADD COLUMN IF NOT EXISTS "college" varchar(32) DEFAULT 'kalvium' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_college_status_idx" ON "knowledge_documents" USING btree ("college","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campus_events_college_start_idx" ON "campus_events" USING btree ("college","start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unanswered_queries_college_status_idx" ON "unanswered_queries" USING btree ("college","status");--> statement-breakpoint

-- 3. Portal keys are unique per college, not globally.
ALTER TABLE "official_portals" DROP CONSTRAINT IF EXISTS "official_portals_portal_key_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "official_portals_college_portal_key_idx" ON "official_portals" USING btree ("college","portal_key");--> statement-breakpoint

-- 4. Mentors may only manage their own college's rows.
DROP POLICY IF EXISTS "knowledge_documents_mentor_manage" ON "knowledge_documents";--> statement-breakpoint
CREATE POLICY "knowledge_documents_mentor_manage" ON "knowledge_documents" AS PERMISSIVE FOR ALL TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "knowledge_documents"."college")) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "knowledge_documents"."college"));--> statement-breakpoint
DROP POLICY IF EXISTS "campus_events_mentor_manage" ON "campus_events";--> statement-breakpoint
CREATE POLICY "campus_events_mentor_manage" ON "campus_events" AS PERMISSIVE FOR ALL TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "campus_events"."college")) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "campus_events"."college"));--> statement-breakpoint
DROP POLICY IF EXISTS "official_portals_mentor_manage" ON "official_portals";--> statement-breakpoint
CREATE POLICY "official_portals_mentor_manage" ON "official_portals" AS PERMISSIVE FOR ALL TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "official_portals"."college")) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "official_portals"."college"));--> statement-breakpoint
DROP POLICY IF EXISTS "unanswered_queries_mentor_manage" ON "unanswered_queries";--> statement-breakpoint
CREATE POLICY "unanswered_queries_mentor_manage" ON "unanswered_queries" AS PERMISSIVE FOR UPDATE TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "unanswered_queries"."college")) WITH CHECK ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "unanswered_queries"."college"));--> statement-breakpoint
DROP POLICY IF EXISTS "unanswered_queries_mentor_delete" ON "unanswered_queries";--> statement-breakpoint
CREATE POLICY "unanswered_queries_mentor_delete" ON "unanswered_queries" AS PERMISSIVE FOR DELETE TO public USING ((select current_setting('app.rag_system_write', true)) = 'true' OR EXISTS (SELECT 1 FROM "user_profiles" WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true)) AND "user_profiles"."user_type" = 'mentor' AND "user_profiles"."college" = "unanswered_queries"."college"));
