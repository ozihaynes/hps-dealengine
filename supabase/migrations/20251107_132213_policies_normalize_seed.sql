BEGIN;

-- S1) Ensure single-active partial unique index on policies
DROP INDEX IF EXISTS public.policies_one_active_per_posture;
CREATE UNIQUE INDEX IF NOT EXISTS policies_one_active_per_posture
  ON public.policies (org_id, posture)
  WHERE is_active = true;

-- S2) RLS helper: keep EXISTING arg names to avoid 42P13 on replace
CREATE OR REPLACE FUNCTION public.is_org_manager(_org uuid, _usr uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $FN$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.org_id = _org
      AND m.user_id = _usr
      AND m.role IN ('manager','vp')
  );
$FN$;

GRANT EXECUTE ON FUNCTION public.is_org_manager(uuid, uuid) TO anon, authenticated, service_role;

-- S4) Idempotent seed/activate base policy for org
UPDATE public.policies
SET is_active = false
WHERE org_id = '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2'
  AND posture = 'base';

WITH up AS (
  UPDATE public.policies p
  SET policy_json = jsonb_build_object(
        'AIV_CAP_PCT',        0.97,
        'DOM_TO_MONTHS_RULE', 'DOM/30',
        'CARRY_MONTHS_CAP',   5,
        'LIST_COMM_PCT',      0.03,
        'CONCESSIONS_PCT',    0.02,
        'SELL_CLOSE_PCT',     0.015
      ),
      is_active = true
  WHERE p.org_id = '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2'
    AND p.posture = 'base'
  RETURNING 1
)
INSERT INTO public.policies (org_id, posture, policy_json, is_active)
SELECT
  '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2',
  'base',
  jsonb_build_object(
    'AIV_CAP_PCT',        0.97,
    'DOM_TO_MONTHS_RULE', 'DOM/30',
    'CARRY_MONTHS_CAP',   5,
    'LIST_COMM_PCT',      0.03,
    'CONCESSIONS_PCT',    0.02,
    'SELL_CLOSE_PCT',     0.015
  ),
  true
WHERE NOT EXISTS (SELECT 1 FROM up);

-- Seed a policy_versions snapshot only if not already present
INSERT INTO public.policy_versions (org_id, posture, policy_json, change_summary)
SELECT
  '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2',
  'base',
  jsonb_build_object(
    'AIV_CAP_PCT',        0.97,
    'DOM_TO_MONTHS_RULE', 'DOM/30',
    'CARRY_MONTHS_CAP',   5,
    'LIST_COMM_PCT',      0.03,
    'CONCESSIONS_PCT',    0.02,
    'SELL_CLOSE_PCT',     0.015
  ),
  'Seed base tokens'
WHERE NOT EXISTS (
  SELECT 1 FROM public.policy_versions
  WHERE org_id='6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2'
    AND posture='base'
    AND change_summary='Seed base tokens'
);

-- S3) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
