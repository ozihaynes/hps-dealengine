BEGIN;

-- Invoker-secured view so underlying RLS applies
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

-- Ensure RLS and org-scoped SELECT policy on base table
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'policy_versions'
      AND policyname = 'pv_select_same_org'
  ) THEN
    CREATE POLICY pv_select_same_org
      ON public.policy_versions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.memberships m
          WHERE m.org_id = policy_versions.org_id
            AND m.user_id = auth.uid()
        )
      );
  END IF;
END$$;

-- Allow authenticated users to read the view (RLS still filters rows)
GRANT SELECT ON public.policy_versions_api TO authenticated;

COMMIT;
