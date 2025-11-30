-- 20251127220000_policy_overrides_manager_update_rls.sql
-- Sprint 2 Governance: allow managers/vp/owners to approve/reject overrides

DO $$
BEGIN
  -- Create or replace UPDATE policy for manager+ roles
  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'Managers approve overrides'
      AND polrelid = 'public.policy_overrides'::regclass
  ) THEN
    DROP POLICY "Managers approve overrides" ON public.policy_overrides;
  END IF;

  CREATE POLICY "Managers approve overrides" ON public.policy_overrides
    FOR UPDATE
    USING (
      org_id IN (
        SELECT org_id
        FROM public.memberships
        WHERE user_id = auth.uid()
          AND role IN ('manager','vp','owner')
      )
    )
    WITH CHECK (
      org_id IN (
        SELECT org_id
        FROM public.memberships
        WHERE user_id = auth.uid()
          AND role IN ('manager','vp','owner')
      )
    );
END
$$;
