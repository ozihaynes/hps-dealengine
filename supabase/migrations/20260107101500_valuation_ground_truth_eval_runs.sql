-- valuation ground truth + evaluation runs tables (idempotent, RLS-first)
begin;

create extension if not exists pgcrypto;

-- ========= valuation_ground_truth =========
create table if not exists public.valuation_ground_truth (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  subject_key text not null,
  source text not null,
  realized_price numeric not null,
  realized_date date,
  as_of timestamptz not null default now(),
  notes text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_valuation_ground_truth_org_subject_source_date
  on public.valuation_ground_truth (org_id, subject_key, source, coalesce(realized_date, '0001-01-01'::date));

alter table public.valuation_ground_truth enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'memberships') then
    perform public._ensure_policy_cmd(
      'valuation_ground_truth_sel',
      'public.valuation_ground_truth',
      'SELECT',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_ground_truth.org_id AND m.user_id = auth.uid())',
      null
    );
    perform public._ensure_policy_cmd(
      'valuation_ground_truth_ins',
      'public.valuation_ground_truth',
      'INSERT',
      null,
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_ground_truth.org_id AND m.user_id = auth.uid() AND m.role IN (''manager'',''vp'',''owner''))'
    );
    perform public._ensure_policy_cmd(
      'valuation_ground_truth_upd',
      'public.valuation_ground_truth',
      'UPDATE',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_ground_truth.org_id AND m.user_id = auth.uid() AND m.role IN (''manager'',''vp'',''owner''))',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_ground_truth.org_id AND m.user_id = auth.uid() AND m.role IN (''manager'',''vp'',''owner''))'
    );
    -- No DELETE policy: corrections should happen via updates for auditability.
  else
    raise notice 'RLS policies for valuation_ground_truth skipped (memberships missing)';
  end if;
end
$$;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists set_valuation_ground_truth_updated_at on public.valuation_ground_truth;
create trigger set_valuation_ground_truth_updated_at
before update on public.valuation_ground_truth
for each row execute function public.tg_set_updated_at();

drop trigger if exists audit_valuation_ground_truth on public.valuation_ground_truth;
create trigger audit_valuation_ground_truth
after insert or update or delete on public.valuation_ground_truth
for each row execute function public.audit_log_row_change();

-- ========= valuation_eval_runs =========
create table if not exists public.valuation_eval_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  dataset_name text not null,
  posture text,
  policy_version_id uuid references public.policy_versions(id),
  policy_hash text,
  as_of timestamptz not null default now(),
  params jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  output_hash text
);

create index if not exists idx_valuation_eval_runs_org_created_at on public.valuation_eval_runs (org_id, created_at desc);
create index if not exists idx_valuation_eval_runs_dataset on public.valuation_eval_runs (dataset_name, created_at desc);

alter table public.valuation_eval_runs enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'memberships') then
    perform public._ensure_policy_cmd(
      'valuation_eval_runs_sel',
      'public.valuation_eval_runs',
      'SELECT',
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_eval_runs.org_id AND m.user_id = auth.uid())',
      null
    );
    perform public._ensure_policy_cmd(
      'valuation_eval_runs_ins',
      'public.valuation_eval_runs',
      'INSERT',
      null,
      'EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = valuation_eval_runs.org_id AND m.user_id = auth.uid())'
    );
    -- Append-only: no UPDATE/DELETE policies.
  else
    raise notice 'RLS policies for valuation_eval_runs skipped (memberships missing)';
  end if;
end
$$;

drop trigger if exists audit_valuation_eval_runs on public.valuation_eval_runs;
create trigger audit_valuation_eval_runs
after insert or update or delete on public.valuation_eval_runs
for each row execute function public.audit_log_row_change();

commit;
