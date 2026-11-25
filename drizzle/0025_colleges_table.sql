-- College directory in the database (was hard-coded in lib/colleges).
-- Additive and idempotent: the colleges table, the private mentor
-- allowlist, a partner-campus answer on profiles, seeded colleges (Sera's
-- launch colleges plus India's ten top-ranked institutions, NIRF 2025), and
-- a sign-up trigger that reads college email domains from the table.

CREATE TABLE IF NOT EXISTS "colleges" (
  "slug" varchar(32) PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "short_name" text NOT NULL,
  "location" text DEFAULT '' NOT NULL,
  "website" text DEFAULT '' NOT NULL,
  "official_web_domains" text[] DEFAULT '{}'::text[] NOT NULL,
  "partner_colleges" text[] DEFAULT '{}'::text[] NOT NULL,
  "mentor_domains" text[] DEFAULT '{}'::text[] NOT NULL,
  "student_domains" text[] DEFAULT '{}'::text[] NOT NULL,
  "mentor_requires_allowlist" boolean DEFAULT false NOT NULL,
  "aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "squad_label" text,
  "residency_label" text,
  "events_label" text DEFAULT 'Events' NOT NULL,
  "gchat_spaces" text[] DEFAULT '{}'::text[] NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "updated_by" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "colleges" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colleges_public_select" ON "colleges";
CREATE POLICY "colleges_public_select" ON "colleges" AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "colleges_platform_write" ON "colleges";
CREATE POLICY "colleges_platform_write" ON "colleges" AS PERMISSIVE FOR ALL TO public
  USING ((select current_setting('app.platform_write', true)) = 'true')
  WITH CHECK ((select current_setting('app.platform_write', true)) = 'true');

CREATE TABLE IF NOT EXISTS "college_mentor_allowlist" (
  "college" varchar(32) NOT NULL REFERENCES "colleges"("slug") ON DELETE CASCADE,
  "email" varchar(320) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "college_mentor_allowlist_college_email_pk" PRIMARY KEY ("college", "email")
);
CREATE INDEX IF NOT EXISTS "college_mentor_allowlist_email_idx" ON "college_mentor_allowlist" ("email");
ALTER TABLE "college_mentor_allowlist" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "college_mentor_allowlist_platform_access" ON "college_mentor_allowlist";
CREATE POLICY "college_mentor_allowlist_platform_access" ON "college_mentor_allowlist" AS PERMISSIVE FOR ALL TO public
  USING ((select current_setting('app.platform_write', true)) = 'true' OR (select current_setting('app.college_directory_read', true)) = 'true')
  WITH CHECK ((select current_setting('app.platform_write', true)) = 'true');
-- The allowlist is private: no direct API access at all.
REVOKE ALL ON "college_mentor_allowlist" FROM anon, authenticated;

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "campus" varchar(32);

INSERT INTO "colleges" (
  "slug", "name", "short_name", "location", "website",
  "official_web_domains", "partner_colleges", "mentor_domains",
  "student_domains", "mentor_requires_allowlist", "aliases",
  "squad_label", "residency_label", "events_label", "gchat_spaces",
  "enabled", "sort_order"
) VALUES
  ('kalvium', 'Kalvium', 'Kalvium', '', 'https://kalvium.com', ARRAY['kalvium.com']::text[], ARRAY['jecrc']::text[], ARRAY['kalvium.com']::text[], ARRAY['kalvium.community']::text[], false, ARRAY['Kalvium']::text[], 'Squad', 'Residency', 'Eventum', '{}'::text[], true, 10),
  ('jecrc', 'JECRC University', 'JECRC', 'Jaipur, Rajasthan', 'https://jecrcuniversity.edu.in', ARRAY['jecrcuniversity.edu.in']::text[], '{}'::text[], ARRAY['jecrcu.edu.in']::text[], ARRAY['jecrcu.edu.in']::text[], true, ARRAY['JECRC', 'JECRC University', 'JU Jaipur']::text[], NULL, 'Hostel / day scholar', 'Events', '{}'::text[], true, 20),
  ('bkbirla', 'B. K. Birla College of Arts, Science & Commerce (Autonomous), Kalyan', 'B.K. Birla College', 'Kalyan, Maharashtra', 'https://bkbck.edu.in', ARRAY['bkbck.edu.in']::text[], '{}'::text[], '{}'::text[], '{}'::text[], false, ARRAY['B.K. Birla', 'BK Birla', 'BKBC', 'Birla College', 'Kalyan']::text[], NULL, NULL, 'Events', '{}'::text[], true, 30),
  ('iitm', 'Indian Institute of Technology Madras', 'IIT Madras', 'Chennai, Tamil Nadu', 'https://www.iitm.ac.in', ARRAY['iitm.ac.in']::text[], '{}'::text[], ARRAY['iitm.ac.in']::text[], ARRAY['smail.iitm.ac.in', 'iitm.ac.in']::text[], true, ARRAY['IIT Madras', 'IITM', 'IIT-M']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 100),
  ('iisc', 'Indian Institute of Science, Bengaluru', 'IISc', 'Bengaluru, Karnataka', 'https://iisc.ac.in', ARRAY['iisc.ac.in']::text[], '{}'::text[], ARRAY['iisc.ac.in']::text[], ARRAY['iisc.ac.in']::text[], true, ARRAY['IISc', 'IISc Bangalore', 'IISc Bengaluru', 'Indian Institute of Science']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 110),
  ('iitb', 'Indian Institute of Technology Bombay', 'IIT Bombay', 'Powai, Mumbai, Maharashtra', 'https://www.iitb.ac.in', ARRAY['iitb.ac.in']::text[], '{}'::text[], ARRAY['iitb.ac.in']::text[], ARRAY['iitb.ac.in']::text[], true, ARRAY['IIT Bombay', 'IITB', 'IIT-B', 'IIT Powai']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 120),
  ('iitd', 'Indian Institute of Technology Delhi', 'IIT Delhi', 'Hauz Khas, New Delhi', 'https://home.iitd.ac.in', ARRAY['iitd.ac.in']::text[], '{}'::text[], ARRAY['iitd.ac.in']::text[], ARRAY['iitd.ac.in']::text[], true, ARRAY['IIT Delhi', 'IITD', 'IIT-D']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 130),
  ('iitk', 'Indian Institute of Technology Kanpur', 'IIT Kanpur', 'Kanpur, Uttar Pradesh', 'https://www.iitk.ac.in', ARRAY['iitk.ac.in']::text[], '{}'::text[], ARRAY['iitk.ac.in']::text[], ARRAY['iitk.ac.in']::text[], true, ARRAY['IIT Kanpur', 'IITK', 'IIT-K']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 140),
  ('iitkgp', 'Indian Institute of Technology Kharagpur', 'IIT Kharagpur', 'Kharagpur, West Bengal', 'https://www.iitkgp.ac.in', ARRAY['iitkgp.ac.in']::text[], '{}'::text[], ARRAY['iitkgp.ac.in']::text[], ARRAY['iitkgp.ac.in']::text[], true, ARRAY['IIT Kharagpur', 'IIT KGP', 'IITKGP', 'KGP']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 150),
  ('iitr', 'Indian Institute of Technology Roorkee', 'IIT Roorkee', 'Roorkee, Uttarakhand', 'https://www.iitr.ac.in', ARRAY['iitr.ac.in']::text[], '{}'::text[], ARRAY['iitr.ac.in']::text[], ARRAY['iitr.ac.in']::text[], true, ARRAY['IIT Roorkee', 'IITR', 'IIT-R']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 160),
  ('aiims', 'All India Institute of Medical Sciences, New Delhi', 'AIIMS Delhi', 'Ansari Nagar, New Delhi', 'https://www.aiims.edu', ARRAY['aiims.edu', 'aiimsexams.ac.in']::text[], '{}'::text[], ARRAY['aiims.edu']::text[], ARRAY['gsuite.aiims.edu', 'aiims.edu']::text[], true, ARRAY['AIIMS', 'AIIMS Delhi', 'AIIMS New Delhi']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 170),
  ('jnu', 'Jawaharlal Nehru University', 'JNU', 'New Delhi', 'https://www.jnu.ac.in', ARRAY['jnu.ac.in']::text[], '{}'::text[], ARRAY['jnu.ac.in', 'mail.jnu.ac.in']::text[], ARRAY['jnu.ac.in', 'mail.jnu.ac.in']::text[], true, ARRAY['JNU', 'Jawaharlal Nehru University']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 180),
  ('bhu', 'Banaras Hindu University', 'BHU', 'Varanasi, Uttar Pradesh', 'https://www.bhu.ac.in', ARRAY['bhu.ac.in', 'bhu.edu.in']::text[], '{}'::text[], ARRAY['bhu.ac.in']::text[], ARRAY['bhu.ac.in']::text[], true, ARRAY['BHU', 'Banaras Hindu University', 'Kashi Hindu Vishwavidyalaya']::text[], NULL, 'Hostel', 'Events', '{}'::text[], true, 190)
ON CONFLICT ("slug") DO NOTHING;

-- Sign-up sync, college-agnostic: an account on a college's email domain
-- gets that college (and its role) on its profile. Mirrors
-- resolveCollegeIdentity in lib/colleges/access.ts; the OAuth callback
-- re-resolves (with env overrides) on every sign-in.
CREATE OR REPLACE FUNCTION private.handle_new_kalvium_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_email text;
  email_local text;
  email_domain text;
  has_google_provider boolean;
  matched_college text;
  classified_type public.user_type;
  display_name text;
  avatar text;
  c record;
BEGIN
  has_google_provider :=
    lower(coalesce(new.raw_app_meta_data->>'provider', '')) = 'google'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        coalesce(new.raw_app_meta_data->'providers', '[]'::jsonb)
      ) AS p(provider_name)
      WHERE lower(p.provider_name) = 'google'
    );
  IF NOT has_google_provider THEN
    RETURN new;
  END IF;

  normalized_email := lower(trim(coalesce(new.email, '')));
  email_local := split_part(normalized_email, '@', 1);
  email_domain := split_part(normalized_email, '@', 2);
  IF email_local = ''
     OR (length(normalized_email) - length(replace(normalized_email, '@', ''))) <> 1 THEN
    RETURN new;
  END IF;

  FOR c IN
    SELECT slug, mentor_domains, student_domains, mentor_requires_allowlist
    FROM public.colleges
    WHERE enabled
      AND (email_domain = ANY (mentor_domains) OR email_domain = ANY (student_domains))
    ORDER BY sort_order, name
    LIMIT 1
  LOOP
    IF email_domain = ANY (c.mentor_domains)
       AND (
         NOT c.mentor_requires_allowlist
         OR EXISTS (
           SELECT 1 FROM public.college_mentor_allowlist a
           WHERE a.college = c.slug AND a.email = normalized_email
         )
       ) THEN
      classified_type := 'mentor'::public.user_type;
    ELSIF email_domain = ANY (c.student_domains) THEN
      classified_type := 'student'::public.user_type;
    END IF;
    IF classified_type IS NOT NULL THEN
      matched_college := c.slug;
    END IF;
  END LOOP;

  IF matched_college IS NULL THEN
    -- Not a college domain: the app's OAuth callback creates the profile and
    -- asks the student which college they are enrolled in.
    RETURN new;
  END IF;

  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), '')
  );
  avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );

  INSERT INTO public.user_profiles (
    id, email, user_type, college, onboarded_at, name, avatar_url
  )
  VALUES (
    new.id::text, normalized_email, classified_type, matched_college, now(),
    display_name, avatar
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    college = EXCLUDED.college,
    onboarded_at = coalesce(public.user_profiles.onboarded_at, now()),
    name = coalesce(EXCLUDED.name, public.user_profiles.name),
    avatar_url = coalesce(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$;
