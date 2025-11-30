-- Enable RLS + idempotent policies. Shadow-safe.
DO $p$
BEGIN
  -- Enable RLS only if tables exist
  PERFORM 1 FROM pg_tables WHERE schemaname='public' AND tablename='policies';
  IF FOUND THEN EXECUTE 'ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY'; END IF;

  PERFORM 1 FROM pg_tables WHERE schemaname='public' AND tablename='policy_versions';
  IF FOUND THEN EXECUTE 'ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY'; END IF;

  PERFORM 1 FROM pg_tables WHERE schemaname='public' AND tablename='runs';
  IF FOUND THEN EXECUTE 'ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY'; END IF;

  -- Helper: create policy if missing, with correct USING / CHECK by command
  CREATE OR REPLACE FUNCTION public._ensure_policy_cmd(
    _name  text,
    _table regclass,
    _cmd   text,
    _using text,
    _check text
  ) RETURNS void AS $$
  DECLARE exists_policy boolean;
          sql           text;
          c             text := upper(_cmd);
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename  = split_part(_table::text, '.', 2)
        AND policyname = _name
    ) INTO exists_policy;

    IF NOT exists_policy THEN
      IF c IN ('SELECT','DELETE') THEN
        -- SELECT/DELETE: USING only
        sql := format('CREATE POLICY %I ON %s FOR %s USING (%s)',
                      _name, _table, _cmd, COALESCE(_using,'true'));
      ELSIF c = 'INSERT' THEN
        -- INSERT: CHECK only
        sql := format('CREATE POLICY %I ON %s FOR %s WITH CHECK (%s)',
                      _name, _table, _cmd, COALESCE(_check,'true'));
      ELSIF c = 'UPDATE' THEN
        -- UPDATE: USING + CHECK
        sql := format('CREATE POLICY %I ON %s FOR %s USING (%s) WITH CHECK (%s)',
                      _name, _table, _cmd, COALESCE(_using,'true'), COALESCE(_check,'true'));
      ELSE
        RAISE EXCEPTION 'Unsupported command % for CREATE POLICY', _cmd;
      END IF;
      EXECUTE sql;
    END IF;
  END;
  $$ LANGUAGE plpgsql;

  -- Only proceed if memberships exists (shadow-safety)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='memberships') THEN
    -- policies
    PERFORM public._ensure_policy_cmd('policies_sel', 'public.policies', 'SELECT',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = policies.org_id AND m.user_id = auth.uid())',
      NULL);
    PERFORM public._ensure_policy_cmd('policies_ins', 'public.policies', 'INSERT',
      NULL,
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = policies.org_id AND m.user_id = auth.uid() AND m.role IN (''manager'',''vp''))');
    PERFORM public._ensure_policy_cmd('policies_upd', 'public.policies', 'UPDATE',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = policies.org_id AND m.user_id = auth.uid() AND m.role IN (''manager'',''vp''))',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = policies.org_id AND m.user_id = auth.uid() AND m.role IN (''manager'',''vp''))');
    PERFORM public._ensure_policy_cmd('policies_del', 'public.policies', 'DELETE',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = policies.org_id AND m.user_id = auth.uid() AND m.role = ''vp'')',
      NULL);

    -- policy_versions
    PERFORM public._ensure_policy_cmd('policy_versions_sel', 'public.policy_versions', 'SELECT',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = policy_versions.org_id AND m.user_id = auth.uid())',
      NULL);
    PERFORM public._ensure_policy_cmd('policy_versions_ins', 'public.policy_versions', 'INSERT',
      NULL,
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = policy_versions.org_id AND m.user_id = auth.uid() AND m.role IN (''manager'',''vp''))');

    -- runs
    PERFORM public._ensure_policy_cmd('runs_sel', 'public.runs', 'SELECT',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = runs.org_id AND m.user_id = auth.uid())',
      NULL);
    PERFORM public._ensure_policy_cmd('runs_ins', 'public.runs', 'INSERT',
      NULL,
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = runs.org_id AND m.user_id = auth.uid())');
    PERFORM public._ensure_policy_cmd('runs_upd', 'public.runs', 'UPDATE',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = runs.org_id AND m.user_id = auth.uid())',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = runs.org_id AND m.user_id = auth.uid())');
  ELSE
    RAISE NOTICE 'RLS policies skipped (public.memberships not present).';
  END IF;
END
$p$;
