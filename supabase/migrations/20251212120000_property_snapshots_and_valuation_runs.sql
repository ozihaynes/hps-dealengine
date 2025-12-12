-- property_snapshots and valuation_runs with RLS + audit, plus default policy token for min comps
begin;

create extension if not exists pgcrypto;

-- ========= property_snapshots (org-scoped cache) =========
create table if not exists public.property_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  address_fingerprint text not null,
  source text not null, -- e.g., rentcast, stub
  provider text,
  as_of timestamptz not null default now(),
  window_days integer,
  sample_n integer,
  comps jsonb,
  market jsonb,
  raw jsonb,
  stub boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_property_snapshots_org_addr_source on public.property_snapshots (org_id, address_fingerprint, source, created_at desc);
create index if not exists idx_property_snapshots_org_created_at on public.property_snapshots (org_id, created_at desc);

alter table public.property_snapshots enable row level security;

-- Select policy
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='property_snapshots' and policyname='property_snapshots_select_in_org'
  ) then
    execute $$create policy property_snapshots_select_in_org on public.property_snapshots
      for select
      using (exists (
        select 1 from public.memberships m
        where m.org_id = property_snapshots.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- Insert policy
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='property_snapshots' and policyname='property_snapshots_insert_in_org'
  ) then
    execute $$create policy property_snapshots_insert_in_org on public.property_snapshots
      for insert
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = property_snapshots.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- No update/delete policies -> append-only

-- ========= valuation_runs (append-only valuation artifacts) =========
create table if not exists public.valuation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  posture text not null check (posture in ('conservative','base','aggressive')),
  address_fingerprint text not null,
  property_snapshot_id uuid references public.property_snapshots(id),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  status text not null check (status in ('queued','running','succeeded','failed')),
  failure_reason text,
  input_hash text not null,
  output_hash text not null,
  policy_hash text,
  run_hash text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_valuation_runs_org_deal_created_at on public.valuation_runs (org_id, deal_id, created_at desc);
create index if not exists idx_valuation_runs_org_addr on public.valuation_runs (org_id, address_fingerprint, created_at desc);
create unique index if not exists idx_valuation_runs_dedupe on public.valuation_runs (org_id, deal_id, posture, input_hash, coalesce(policy_hash, ''));

alter table public.valuation_runs enable row level security;

-- Select policy
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='valuation_runs' and policyname='valuation_runs_select_in_org'
  ) then
    execute $$create policy valuation_runs_select_in_org on public.valuation_runs
      for select
      using (exists (
        select 1 from public.memberships m
        where m.org_id = valuation_runs.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- Insert policy
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='valuation_runs' and policyname='valuation_runs_insert_in_org'
  ) then
    execute $$create policy valuation_runs_insert_in_org on public.valuation_runs
      for insert
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = valuation_runs.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- No update/delete policies -> append-only

-- ========= audit triggers =========
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists audit_property_snapshots on public.property_snapshots;
create trigger audit_property_snapshots
after insert or update or delete on public.property_snapshots
for each row execute function public.audit_log_row_change();

drop trigger if exists audit_valuation_runs on public.valuation_runs;
create trigger audit_valuation_runs
after insert or update or delete on public.valuation_runs
for each row execute function public.audit_log_row_change();

-- ========= policy default for min closed comps =========
-- Ensure valuation.min_closed_comps_required exists with default 3 where absent.
update public.policy_versions
set policy_json = jsonb_set(
  policy_json,
  '{valuation}',
  coalesce(policy_json->'valuation', '{}'::jsonb)
)
where policy_json->'valuation' is null;

update public.policy_versions
set policy_json = jsonb_set(
  policy_json,
  '{valuation,min_closed_comps_required}',
  to_jsonb(3),
  true
)
where (policy_json->'valuation'->'min_closed_comps_required') is null;

commit;
