-- Make this migration self-sufficient for shadow replays.
-- It is safe on prod because all statements are IF NOT EXISTS or idempotent.

-- Ensure required columns exist before creating indexes
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS posture text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS input_hash text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS policy_hash text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS policy_version_id uuid;

-- Recreate the unique index on the four-hash identity (idempotent)
DROP INDEX IF EXISTS runs_uni_org_posture_iohash_polhash;
CREATE UNIQUE INDEX IF NOT EXISTS runs_uni_org_posture_iohash_polhash
  ON public.runs (org_id, posture, input_hash, policy_hash);
