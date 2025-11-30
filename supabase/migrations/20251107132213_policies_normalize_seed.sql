-- Make this migration self-sufficient for shadow replays and fresh envs.
-- Safe on prod: all operations are idempotent.

-- 1) Ensure the column exists
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS is_active boolean;

-- 2) If legacy "active" exists, backfill is_active from it (only where is_active is null)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'policies'
      AND column_name  = 'active'
  ) THEN
    UPDATE public.policies
       SET is_active = COALESCE(is_active, active);
  END IF;
END $$;

-- 3) Create the unique partial index on is_active=true (drop legacy name if present)
DROP INDEX IF EXISTS policies_one_active_per_posture;
CREATE UNIQUE INDEX IF NOT EXISTS policies_one_active_per_posture
  ON public.policies (org_id, posture)
  WHERE is_active = true;
