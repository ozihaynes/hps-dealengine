-- Migration: Create profiles table
-- Purpose: Store user profile data separate from auth.users for extensibility
-- Gap: G-001 (Profile uses useState with hardcoded data)
-- Rollback: DROP TABLE IF EXISTS profiles CASCADE;

BEGIN;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  timezone text DEFAULT 'America/New_York',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only SELECT their own profile
DO $pol$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select'
  ) THEN
    EXECUTE $$CREATE POLICY profiles_select ON public.profiles
      FOR SELECT USING (id = auth.uid());$$;
  END IF;
END $pol$;

-- RLS: Users can only INSERT their own profile
DO $pol$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert'
  ) THEN
    EXECUTE $$CREATE POLICY profiles_insert ON public.profiles
      FOR INSERT WITH CHECK (id = auth.uid());$$;
  END IF;
END $pol$;

-- RLS: Users can only UPDATE their own profile
DO $pol$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update'
  ) THEN
    EXECUTE $$CREATE POLICY profiles_update ON public.profiles
      FOR UPDATE USING (id = auth.uid());$$;
  END IF;
END $pol$;

-- Updated_at trigger (reuses existing function if available)
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_profile'
  ) THEN
    CREATE TRIGGER on_auth_user_created_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
  END IF;
END;
$$;

-- NOTE: No audit trigger for profiles - profiles table has no org_id
-- and audit_log_row_change requires org_id. Profile changes are tracked
-- via updated_at timestamp instead.

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);

-- Temporarily disable triggers for backfill (prevents any trigger issues)
ALTER TABLE public.profiles DISABLE TRIGGER ALL;

-- Backfill existing users
INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  )
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers
ALTER TABLE public.profiles ENABLE TRIGGER ALL;

-- Comments
COMMENT ON TABLE public.profiles IS 'User profile data - extends auth.users with app-specific fields';
COMMENT ON COLUMN public.profiles.display_name IS 'User-chosen display name, 1-100 characters';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for date/time display';

COMMIT;
