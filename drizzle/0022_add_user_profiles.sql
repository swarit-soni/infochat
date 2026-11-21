DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_type'
  ) THEN
    CREATE TYPE "public"."user_type" AS ENUM('mentor', 'student');
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"user_type" "public"."user_type" NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "user_profiles_domain_matches_type" CHECK (((user_type = 'mentor' AND split_part(lower(email), '@', 2) = 'kalvium.com') OR (user_type = 'student' AND split_part(lower(email), '@', 2) = 'kalvium.community')))
);--> statement-breakpoint
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profiles_user_type_idx" ON "user_profiles" USING btree ("user_type");--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'users_read_own_profile'
  ) THEN
    CREATE POLICY "users_read_own_profile" ON "user_profiles" AS PERMISSIVE FOR SELECT TO public USING (id = (select current_setting('app.current_user_id', true)));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'users_insert_own_profile'
  ) THEN
    CREATE POLICY "users_insert_own_profile" ON "user_profiles" AS PERMISSIVE FOR INSERT TO public WITH CHECK (id = (select current_setting('app.current_user_id', true)));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'users_update_own_profile'
  ) THEN
    CREATE POLICY "users_update_own_profile" ON "user_profiles" AS PERMISSIVE FOR UPDATE TO public USING (id = (select current_setting('app.current_user_id', true))) WITH CHECK (id = (select current_setting('app.current_user_id', true)));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'users_delete_own_profile'
  ) THEN
    CREATE POLICY "users_delete_own_profile" ON "user_profiles" AS PERMISSIVE FOR DELETE TO public USING (id = (select current_setting('app.current_user_id', true)));
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user_profiles" TO app_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."user_profiles" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."user_profiles" FROM authenticated;
    GRANT SELECT ON TABLE "public"."user_profiles" TO authenticated;
  END IF;
END $$;
