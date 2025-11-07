BEGIN;

DROP VIEW IF EXISTS public.policy_versions_api;

CREATE VIEW public.policy_versions_api AS
SELECT
  pv.id          AS version_id,
  pv.org_id      AS org_id,
  pv.posture     AS posture,
  pv.created_by  AS actor_user_id,
  pv.created_at  AS created_at,
  pv.change_summary
FROM public.policy_versions pv;

GRANT SELECT ON public.policy_versions_api TO anon, authenticated;

-- Reload PostgREST schema so the view is immediately visible
NOTIFY pgrst, 'reload schema';

COMMIT;
