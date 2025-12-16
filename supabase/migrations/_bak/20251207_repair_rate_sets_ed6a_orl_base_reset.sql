-- 20251207_repair_rate_sets_ed6a_orl_base_reset.sql
-- Hard reset ORL/base repair profiles for the canonical deals org and remove legacy ORL/base rows.

begin;

-- Set audit actor for downstream triggers
select set_config(
  'request.jwt.claim.sub',
  '52a1b235-0761-4b05-b765-f3df1a324387',
  true
);

-- Remove ORL/base profiles from the canonical deals org
delete from public.repair_rate_sets
 where org_id      = 'ed6ae332-2d15-44be-a8fb-36005522ad60'
   and market_code = 'ORL'
   and posture     = 'base';

-- Remove ORL/base profiles from the legacy org to avoid cross-org leakage
delete from public.repair_rate_sets
 where org_id      = '6dc153c2-6f6d-4076-afe1-e8b0aad97fe9'
   and market_code = 'ORL'
   and posture     = 'base';

-- Seed a single active/default ORL/base profile for the deals org
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
) values (
  'f5b95d23-c92a-4f0f-9981-bb7f2a6004a1',
  'ed6ae332-2d15-44be-a8fb-36005522ad60',
  'ORL base default (reset)',
  'ORL',
  'base',
  current_date,
  'normalized-reset',
  'v1',
  true,
  true,
  jsonb_build_object('none', 0, 'light', 25, 'medium', 40, 'heavy', 60),
  jsonb_build_object('roof', 6, 'hvac', 6, 'repipe', 5, 'electrical', 5.5, 'foundation', 15),
  '{}'::jsonb
);

commit;
