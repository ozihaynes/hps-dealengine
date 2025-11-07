BEGIN;

-- S2) Drop any existing variant and recreate with the exact arg names PostgREST expects
DROP FUNCTION IF EXISTS public.is_org_manager(uuid, uuid);

CREATE FUNCTION public.is_org_manager(_org uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $FN$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.org_id = _org
      AND m.user_id = _uid
      AND m.role IN ('manager','vp')
  );
$FN$;

GRANT EXECUTE ON FUNCTION public.is_org_manager(uuid, uuid) TO anon, authenticated, service_role;

-- S1) Keep single-active partial unique index (idempotent)
DROP INDEX IF EXISTS public.policies_one_active_per_posture;
CREATE UNIQUE INDEX IF NOT EXISTS policies_one_active_per_posture
  ON public.policies (org_id, posture)
  WHERE is_active = true;

-- S3) Reload PostgREST schema so RPC signature is visible immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
