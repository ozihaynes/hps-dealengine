BEGIN;

-- Keep single-active partial unique index on (org_id, posture) WHERE is_active = true
DROP INDEX IF EXISTS public.policies_one_active_per_posture;
CREATE UNIQUE INDEX IF NOT EXISTS policies_one_active_per_posture
  ON public.policies (org_id, posture)
  WHERE is_active = true;

-- Drop any legacy "active" column if it exists (normalize to is_active only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='policies' AND column_name='active'
  ) THEN
    EXECUTE 'ALTER TABLE public.policies DROP COLUMN IF EXISTS active';
  END IF;
END$$;

-- No seeding here; DB already has a single active base policy

-- Ensure PostgREST sees the updated schema immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
