-- Create market_price_index cache table with RLS (insert-only, per org)

create table if not exists public.market_price_index (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  source text not null,
  provider text not null,
  series_id text not null,
  geo_key text not null,
  period text not null,
  index_value numeric not null,
  as_of timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, source, provider, series_id, geo_key, period)
);

alter table public.market_price_index enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='memberships') then
    perform public._ensure_policy_cmd(
      'market_price_index_sel',
      'public.market_price_index',
      'SELECT',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = market_price_index.org_id AND m.user_id = auth.uid())',
      null
    );
    perform public._ensure_policy_cmd(
      'market_price_index_ins',
      'public.market_price_index',
      'INSERT',
      null,
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = market_price_index.org_id AND m.user_id = auth.uid())'
    );
    -- No UPDATE/DELETE policies: cache is append-only for determinism.
  else
    raise notice 'RLS policies for market_price_index skipped (memberships missing)';
  end if;
end
$$;

-- Seed default market_time_adjustment token when missing (disabled by default)
update public.policies p
set policy_json = jsonb_set(
  policy_json,
  '{valuation,market_time_adjustment}',
  jsonb_build_object('enabled', false, 'min_days_old', 180),
  true
)
where is_active = true
  and (policy_json->'valuation'->'market_time_adjustment') is null;

update public.policy_versions pv
set policy_json = jsonb_set(
  policy_json,
  '{valuation,market_time_adjustment}',
  jsonb_build_object('enabled', false, 'min_days_old', 180),
  true
)
where (policy_json->'valuation'->'market_time_adjustment') is null
  and exists (
    select 1
    from public.policies p
    where p.org_id = pv.org_id
      and p.posture = pv.posture
      and p.is_active = true
  );
