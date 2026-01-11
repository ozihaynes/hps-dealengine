-- ============================================================
-- Migration: Add avatar_url column to profiles table
-- Purpose: Fix v1-profile-get and v1-team-list 500 errors
-- Root Cause: Column was defined in migration but missing in actual table
-- Rollback: ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
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

-- Add avatar_url column if it doesn't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    RAISE NOTICE 'Added avatar_url column to profiles table';
  ELSE
    RAISE NOTICE 'avatar_url column already exists, skipping';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image, typically a Supabase storage URL';

-- ============================================================
-- ROLLBACK (run manually if needed):
-- ============================================================
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
-- ============================================================
