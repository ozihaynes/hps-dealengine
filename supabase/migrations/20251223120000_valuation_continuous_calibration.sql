-- HPS DealEngine: Continuous Calibration Flywheel (bucketed strategy weights)
-- Creates:
--   - public.valuation_calibration_buckets (per-strategy aggregated error metrics by bucket)
--   - public.valuation_weights (versioned per-strategy weight publishes by bucket)
--
-- Notes:
--   - RLS-first: all user flows must go through RLS (no service_role).
--   - Audit: row-change audit trigger attached to both tables.
--   - Deterministic: weights are computed in application code, tables store the published result + metrics.
--
begin;

-- Ensure UUID helpers exist (Supabase generally has this already, but this is safe).
create extension if not exists "pgcrypto";

create table if not exists public.valuation_calibration_buckets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  market_key text not null,
  home_band text not null,
  strategy text not null,

  -- Aggregates (running means / EMAs maintained by edge function)
  n integer not null default 0 check (n >= 0),
  mae numeric null check (mae is null or mae >= 0),
  mape numeric null check (mape is null or mape >= 0),              -- stored as fraction (e.g. 0.12 for 12%)
  mae_norm numeric null check (mae_norm is null or mae_norm >= 0),  -- mae / median_arv (approx)
  median_arv numeric null check (median_arv is null or median_arv >= 0),
  score_ema numeric null check (score_ema is null or score_ema >= 0),

  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create unique index if not exists valuation_calibration_buckets_uq
  on public.valuation_calibration_buckets (org_id, market_key, home_band, strategy);

create index if not exists valuation_calibration_buckets_bucket_idx
  on public.valuation_calibration_buckets (org_id, market_key, home_band);

create index if not exists valuation_calibration_buckets_strategy_idx
  on public.valuation_calibration_buckets (org_id, strategy);

alter table public.valuation_calibration_buckets enable row level security;

-- RLS: SELECT requires org membership.
drop policy if exists valuation_calibration_buckets_select on public.valuation_calibration_buckets;
create policy valuation_calibration_buckets_select
on public.valuation_calibration_buckets
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
  )
);

-- RLS: INSERT/UPDATE/DELETE requires privileged org role.
drop policy if exists valuation_calibration_buckets_write on public.valuation_calibration_buckets;
create policy valuation_calibration_buckets_write
on public.valuation_calibration_buckets
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('manager','vp','owner')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('manager','vp','owner')
  )
);

-- Keep updated_at fresh on updates (project-standard helper).
drop trigger if exists set_valuation_calibration_buckets_updated_at on public.valuation_calibration_buckets;
create trigger set_valuation_calibration_buckets_updated_at
before update on public.valuation_calibration_buckets
for each row execute function public.tg_set_updated_at();

-- Audit trail (project-standard helper).
drop trigger if exists audit_valuation_calibration_buckets on public.valuation_calibration_buckets;
create trigger audit_valuation_calibration_buckets
after insert or update or delete on public.valuation_calibration_buckets
for each row execute function public.audit_log_row_change();

create table if not exists public.valuation_weights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  market_key text not null,
  home_band text not null,
  strategy text not null,

  weight numeric not null check (weight >= 0 and weight <= 1),
  version integer not null check (version > 0),
  effective_at timestamptz not null default now(),
  note text null,

  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create unique index if not exists valuation_weights_uq
  on public.valuation_weights (org_id, market_key, home_band, strategy, version);

-- Query pattern: latest version per bucket, then pull all strategy rows for that version.
create index if not exists valuation_weights_bucket_latest_idx
  on public.valuation_weights (org_id, market_key, home_band, version desc);

create index if not exists valuation_weights_strategy_idx
  on public.valuation_weights (org_id, strategy);

alter table public.valuation_weights enable row level security;

drop policy if exists valuation_weights_select on public.valuation_weights;
create policy valuation_weights_select
on public.valuation_weights
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists valuation_weights_write on public.valuation_weights;
create policy valuation_weights_write
on public.valuation_weights
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('manager','vp','owner')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('manager','vp','owner')
  )
);

drop trigger if exists audit_valuation_weights on public.valuation_weights;
create trigger audit_valuation_weights
after insert or update or delete on public.valuation_weights
for each row execute function public.audit_log_row_change();


-- Atomic publish helper to avoid version races in concurrent calibration updates.
-- Uses an advisory xact lock on (org_id, market_key, home_band) to serialize version increments.
create or replace function public.publish_valuation_weights(
  p_org_id uuid,
  p_market_key text,
  p_home_band text,
  p_weights jsonb,
  p_note text default null,
  p_effective_at timestamptz default now()
) returns int
language plpgsql
as $fn$
declare
  v_next int;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_org_id::text || '|' || p_market_key || '|' || p_home_band, 0)
  );

  select coalesce(max(version), 0) + 1
    into v_next
    from public.valuation_weights
   where org_id = p_org_id
     and market_key = p_market_key
     and home_band = p_home_band;

  insert into public.valuation_weights (org_id, market_key, home_band, strategy, weight, version, effective_at, note)
  select p_org_id,
         p_market_key,
         p_home_band,
         w.key,
         (w.value)::numeric,
         v_next,
         p_effective_at,
         p_note
    from jsonb_each_text(p_weights) as w(key, value);

  return v_next;
end;
$fn$;

-- In locked-down environments, explicitly grant execute to authenticated users.
grant execute on function public.publish_valuation_weights(uuid, text, text, jsonb, text, timestamptz) to authenticated;
commit;
