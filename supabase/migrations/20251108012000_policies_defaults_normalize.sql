-- Idempotent defaults + normalization for policies
DO $blk$
BEGIN
  -- Ensure columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='policies' AND column_name='is_active') THEN
    ALTER TABLE public.policies ADD COLUMN is_active boolean;
  END IF;

  -- Backfill is_active from legacy "active" if present (and only where null)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='policies' AND column_name='active') THEN
    UPDATE public.policies SET is_active = COALESCE(is_active, active);
  END IF;

  -- Reasonable defaults (safe, idempotent)
  ALTER TABLE public.policies
    ALTER COLUMN posture SET DEFAULT 'base',
    ALTER COLUMN is_active SET DEFAULT false;

  -- Enforce at most one active per (org_id, posture) via partial unique index
  DROP INDEX IF EXISTS policies_one_active_per_posture;
  CREATE UNIQUE INDEX IF NOT EXISTS policies_one_active_per_posture
    ON public.policies (org_id, posture) WHERE is_active = true;
END
$blk$;
