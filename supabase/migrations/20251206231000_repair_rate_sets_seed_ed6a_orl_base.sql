-- 20251206231000_repair_rate_sets_seed_ed6a_orl_base.sql
-- Guarantee an ORL/base repair profile exists for org ed6ae332... and mark it active/default.
-- Safe to run even if rows already exist; inserts only when missing.

begin;

select set_config('request.jwt.claim.sub', '52a1b235-0761-4b05-b765-f3df1a324387', true);

do $$
declare
  v_org uuid := 'ed6ae332-2d15-44be-a8fb-36005522ad60';
  v_market text := 'ORL';
  v_posture text := 'base';
  v_exists boolean;
begin
  select exists(
    select 1 from public.repair_rate_sets
    where org_id = v_org
      and market_code = v_market
      and posture = v_posture
  ) into v_exists;

  if not v_exists then
    insert into public.repair_rate_sets (
      id,
      org_id,
      name,
      market_code,
      posture,
      as_of,
      source,
      version,
      is_active,
      is_default,
      repair_psf_tiers,
      repair_big5,
      line_item_rates
    )
    values (
      gen_random_uuid(),
      v_org,
      'ORL base (seed)',
      v_market,
      v_posture,
      current_date,
      'seed',
      'v1',
      true,
      true,
      jsonb_build_object('none', 0, 'light', 25, 'medium', 40, 'heavy', 60),
      jsonb_build_object('roof', 6, 'hvac', 6, 'repipe', 5, 'electrical', 5.5, 'foundation', 15),
      '{}'::jsonb
    );
  else
    -- If rows exist, ensure one is active/default; pick the most recent.
    update public.repair_rate_sets
      set is_active = false,
          is_default = false
      where org_id = v_org
        and market_code = v_market
        and posture = v_posture
        and (is_active or is_default);

    update public.repair_rate_sets
      set is_active = true,
          is_default = true
      where id = (
        select id
        from public.repair_rate_sets
        where org_id = v_org
          and market_code = v_market
          and posture = v_posture
        order by created_at desc
        limit 1
      );
  end if;
end $$;

commit;
