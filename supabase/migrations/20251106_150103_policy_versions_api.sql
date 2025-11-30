DO $blk$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'policy_versions'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $v$
CREATE OR REPLACE VIEW public.policy_versions_api
WITH (security_invoker = on)
AS
SELECT
  pv.id         AS version_id,
  pv.org_id     AS org_id,
  pv.posture    AS posture,
  pv.created_by AS actor_user_id,
  pv.created_at AS created_at,
  pv.change_summary
FROM public.policy_versions pv;
$v$;
  ELSE
    RAISE NOTICE 'Skipping policy_versions_api: public.policy_versions not yet present';
  END IF;
END
$blk$;
