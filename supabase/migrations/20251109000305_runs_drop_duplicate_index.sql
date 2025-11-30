-- 20251109000305_runs_drop_duplicate_index.sql
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='runs_uni_org_posture_iohash'
  ) THEN
    EXECUTE 'DROP INDEX public.runs_uni_org_posture_iohash';
  END IF;
END $$;

COMMIT;
