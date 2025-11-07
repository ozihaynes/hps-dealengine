BEGIN;

-- Columns (idempotent)
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS policy_version_id uuid;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS policy_hash text;

-- Drop prior unique index on (org_id, posture, input_hash) if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relkind = 'i'
    AND    n.nspname = 'public'
    AND    c.relname = 'runs_uni_org_posture_iohash'
  ) THEN
    EXECUTE 'DROP INDEX public.runs_uni_org_posture_iohash';
  END IF;
END $$;

-- New uniqueness: also consider policy_hash so different policy snapshots can coexist per input
CREATE UNIQUE INDEX IF NOT EXISTS runs_uni_org_posture_iohash_polhash
  ON public.runs (org_id, posture, input_hash, policy_hash);

COMMIT;
