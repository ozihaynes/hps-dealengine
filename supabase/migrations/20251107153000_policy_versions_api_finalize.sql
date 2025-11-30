-- Finalize: only (re)create the view when base table exists.
DO $blk$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='policy_versions'
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
    RAISE NOTICE 'Skipping policy_versions_api finalize: table not present';
  END IF;
END
$blk$;
