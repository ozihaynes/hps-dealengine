-- ============================================================
-- Migration: Add FK from memberships.user_id to profiles.id
-- Purpose: Enable PostgREST embedded resource queries in v1-team-list
-- Root Cause: FK was never created, PostgREST can't resolve join
-- Rollback: See bottom of file
-- ============================================================

-- Pre-flight check: Abort if profiles table doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'ABORT: profiles table does not exist. Run profiles migration first.';
  END IF;
END $$;

-- Pre-flight check: Skip if FK already exists (idempotent safety)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.memberships'::regclass
    AND conname = 'memberships_user_id_profiles_fkey'
  ) THEN
    RAISE NOTICE 'FK memberships_user_id_profiles_fkey already exists. Skipping.';
    RETURN;
  END IF;
END $$;

-- Step 1: Backfill missing profiles from auth.users
-- (Required so FK constraint doesn't fail on existing data)
INSERT INTO public.profiles (id, display_name, timezone, created_at, updated_at)
SELECT
  m.user_id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1),
    'User'
  ),
  'America/New_York',
  NOW(),
  NOW()
FROM public.memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = m.user_id
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Add the foreign key constraint
ALTER TABLE public.memberships
ADD CONSTRAINT memberships_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Step 3: Add index for FK performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_memberships_user_id_fk
ON public.memberships(user_id);

-- Documentation
COMMENT ON CONSTRAINT memberships_user_id_profiles_fkey ON public.memberships IS
'FK to profiles.id - enables PostgREST embedded joins for team member queries. Added 2026-01-08.';

-- ============================================================
-- ROLLBACK (run manually if needed):
-- ============================================================
-- DROP INDEX IF EXISTS public.idx_memberships_user_id_fk;
-- ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_profiles_fkey;
-- ============================================================
