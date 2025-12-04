-- 20251206120000_repair_rate_sets_org_normalization.sql
-- Ensure every org with deals has at least one active/default repair rate set for ORL/base.

begin;

-- Insert a minimal normalized profile for orgs that have deals but lack an active ORL/base profile.
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
select
  gen_random_uuid(),
  d.org_id,
  'Default (normalized)',
  'ORL',
  'base',
  current_date,
  'normalized',
  'v1',
  true,
  true,
  jsonb_build_object('none', 0, 'light', 25, 'medium', 40, 'heavy', 60),
  jsonb_build_object('roof', 6, 'hvac', 6, 'repipe', 5, 'electrical', 5.5, 'foundation', 15),
  '{}'::jsonb
from (
  select distinct org_id
  from public.deals
) d
where not exists (
  select 1
  from public.repair_rate_sets r
  where r.org_id = d.org_id
    and r.market_code = 'ORL'
    and r.posture = 'base'
    and r.is_active = true
);

commit;
