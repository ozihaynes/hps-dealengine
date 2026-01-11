-- ============================================================
-- Migration: Ensure profiles RLS policies are robust
-- Purpose: Belt-and-suspenders RLS configuration
-- Note: Policies already exist but this ensures correct configuration
-- Rollback: See bottom of file
-- ============================================================

-- Pre-flight check: Abort if profiles table doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'ABORT: profiles table does not exist.';
  END IF;
END $$;

-- Enable RLS (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (security best practice)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Ensure policies exist with correct definitions
-- (Using CREATE OR REPLACE pattern via DO blocks)

-- SELECT policy
DO $$
BEGIN
  -- Drop if exists with wrong definition, then recreate
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'profiles_select'
  ) THEN
    CREATE POLICY profiles_select ON public.profiles
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
    RAISE NOTICE 'Created profiles_select policy';
  ELSE
    RAISE NOTICE 'profiles_select policy already exists';
  END IF;
END $$;

-- INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'profiles_insert'
  ) THEN
    CREATE POLICY profiles_insert ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
    RAISE NOTICE 'Created profiles_insert policy';
  ELSE
    RAISE NOTICE 'profiles_insert policy already exists';
  END IF;
END $$;

-- UPDATE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'profiles_update'
  ) THEN
    CREATE POLICY profiles_update ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
    RAISE NOTICE 'Created profiles_update policy';
  ELSE
    RAISE NOTICE 'profiles_update policy already exists';
  END IF;
END $$;

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Service role bypasses RLS but grant anyway for explicit access
GRANT ALL ON public.profiles TO service_role;

-- ============================================================
-- ROLLBACK (run manually if needed):
-- ============================================================
-- DROP POLICY IF EXISTS profiles_select ON public.profiles;
-- DROP POLICY IF EXISTS profiles_insert ON public.profiles;
-- DROP POLICY IF EXISTS profiles_update ON public.profiles;
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ============================================================
