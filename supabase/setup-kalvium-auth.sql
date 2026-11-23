-- Sera Kalvium Google-only Auth & User Profiles Setup
-- Target Supabase project: fheytswhnzhiibxrqzqo
-- Idempotent script safe to re-run in the Supabase SQL Editor.

-- 1. User type enum and public.user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_type'
  ) THEN
    CREATE TYPE public.user_type AS ENUM ('mentor', 'student');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id varchar(255) PRIMARY KEY NOT NULL,
  email varchar(320) NOT NULL,
  user_type public.user_type NOT NULL,
  name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_email_unique UNIQUE (email),
  CONSTRAINT user_profiles_domain_matches_type CHECK (
    (
      user_type = 'mentor'
      AND split_part(lower(email), '@', 2) = 'kalvium.com'
    )
    OR (
      user_type = 'student'
      AND split_part(lower(email), '@', 2) = 'kalvium.community'
    )
  )
);

CREATE INDEX IF NOT EXISTS user_profiles_user_type_idx
  ON public.user_profiles USING btree (user_type);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Prevent clients from inserting, updating, or deleting profiles directly via PostgREST
REVOKE ALL ON TABLE public.user_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.user_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_profiles FROM authenticated;
GRANT SELECT ON TABLE public.user_profiles TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO app_user;
  END IF;
END
$$;

-- RLS policies:
-- 1) Authenticated PostgREST callers (SELECT-only via auth.uid())
DROP POLICY IF EXISTS "authenticated_read_own_profile" ON public.user_profiles;
CREATE POLICY "authenticated_read_own_profile"
  ON public.user_profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = id);

-- 2) Server-side Drizzle transactions scoped via withRLS (app.current_user_id)
DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
CREATE POLICY "users_read_own_profile"
  ON public.user_profiles
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.user_profiles;
CREATE POLICY "users_insert_own_profile"
  ON public.user_profiles
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (id = (select current_setting('app.current_user_id', true)))
  WITH CHECK (id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS "users_delete_own_profile" ON public.user_profiles;
CREATE POLICY "users_delete_own_profile"
  ON public.user_profiles
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (id = (select current_setting('app.current_user_id', true)));

-- 2. Supabase Auth "Before User Created" Hook
-- Configure in Supabase Dashboard -> Authentication -> Hooks -> Before User Created:
--   Postgres Function: public.hook_restrict_kalvium_signup
CREATE OR REPLACE FUNCTION public.hook_restrict_kalvium_signup(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  auth_provider text;
  user_email text;
  email_local text;
  email_domain text;
BEGIN
  auth_provider := lower(coalesce(event->'user'->'app_metadata'->>'provider', ''));
  IF auth_provider <> 'google' THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Only @kalvium.com and @kalvium.community Google accounts are allowed.'
      )
    );
  END IF;

  user_email := lower(trim(coalesce(event->'user'->>'email', '')));
  email_local := split_part(user_email, '@', 1);
  email_domain := split_part(user_email, '@', 2);

  IF email_local = ''
     OR (length(user_email) - length(replace(user_email, '@', ''))) <> 1
     OR email_domain NOT IN ('kalvium.com', 'kalvium.community') THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Only @kalvium.com and @kalvium.community Google accounts are allowed.'
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hook_restrict_kalvium_signup(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_restrict_kalvium_signup(jsonb) FROM authenticated, anon, public;

-- 3. Non-exposed private schema & auth.users sync trigger
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

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
  classified_type public.user_type;
  has_google_provider boolean;
  display_name text;
  avatar text;
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

  IF email_domain = 'kalvium.com' THEN
    classified_type := 'mentor'::public.user_type;
  ELSIF email_domain = 'kalvium.community' THEN
    classified_type := 'student'::public.user_type;
  ELSE
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
    id,
    email,
    user_type,
    name,
    avatar_url
  )
  VALUES (
    new.id::text,
    normalized_email,
    classified_type,
    display_name,
    avatar
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    name = coalesce(EXCLUDED.name, public.user_profiles.name),
    avatar_url = coalesce(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_kalvium_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_kalvium_sync ON auth.users;
CREATE TRIGGER on_auth_user_kalvium_sync
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_kalvium_user();
