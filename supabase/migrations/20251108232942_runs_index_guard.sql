-- 20251108232941_runs_index_guard.sql
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='runs_uni_org_posture_iohash_polhash'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX runs_uni_org_posture_iohash_polhash ON public.runs (org_id, posture, input_hash, policy_hash)';
  END IF;
END $$;

COMMIT;