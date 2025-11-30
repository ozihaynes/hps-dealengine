-- Guarded creation of is_org_manager(); safe for prod and shadow replays.
DO $blk$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'memberships'
  ) THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.is_org_manager(_org uuid, _uid uuid)
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
    $f$;
  ELSE
    RAISE NOTICE 'Skipping is_org_manager(): public.memberships not present yet';
  END IF;
END
$blk$;
