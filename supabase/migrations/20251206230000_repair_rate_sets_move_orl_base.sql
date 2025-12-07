-- 20251206230000_repair_rate_sets_move_orl_base.sql
-- Move ORL/base repair_rate_sets from legacy org 6dc153c2... into the deals org ed6ae332...
-- and ensure exactly one active/default row exists for that org/market/posture.
-- This aligns sandbox-edited profiles with the org resolved via dealId in v1-repair-rates.

begin;

-- Set an audit actor for the trigger.
select set_config('request.jwt.claim.sub', '52a1b235-0761-4b05-b765-f3df1a324387', true);

do $$
declare
  v_target_org uuid := 'ed6ae332-2d15-44be-a8fb-36005522ad60';
  v_source_org uuid := '6dc153c2-6f6d-4076-afe1-e8b0aad97fe9';
  v_market     text := 'ORL';
  v_posture    text := 'base';
  v_choice     uuid;
begin
  -- Deactivate any active/default rows in the target org for this market/posture to avoid partial unique conflicts.
  update public.repair_rate_sets
    set is_active = false,
        is_default = false
    where org_id = v_target_org
      and market_code = v_market
      and posture = v_posture
      and (is_active or is_default);

  -- Also deactivate source rows before moving them.
  update public.repair_rate_sets
    set is_active = false,
        is_default = false
    where org_id = v_source_org
      and market_code = v_market
      and posture = v_posture
      and (is_active or is_default);

  -- Move all ORL/base rows from the legacy org into the target org (kept inactive for now).
  update public.repair_rate_sets
    set org_id = v_target_org
    where org_id = v_source_org
      and market_code = v_market
      and posture = v_posture;

  -- Pick the most recent row (by created_at) in the target org to be the sole active/default.
  select id
    into v_choice
    from public.repair_rate_sets
   where org_id = v_target_org
     and market_code = v_market
     and posture = v_posture
   order by created_at desc
   limit 1;

  if v_choice is not null then
    update public.repair_rate_sets
      set is_active  = true,
          is_default = true
      where id = v_choice;
  end if;
end $$;

commit;
