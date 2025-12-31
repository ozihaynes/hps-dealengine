-- =========================================================
-- O11Y Support Console: Support Cases + Append-only Events
-- RLS-first. No service_role required for app usage.
-- =========================================================

begin;

-- Ensure UUID helpers exist.
create extension if not exists "pgcrypto";

create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  title text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  status text not null check (status in ('open','in_progress','blocked','resolved','closed')),

  -- Correlation anchors (reference-only)
  deal_id uuid null references public.deals(id) on delete set null,
  run_id uuid null references public.runs(id) on delete set null,
  subject_user_id uuid null references auth.users(id) on delete set null,
  request_id text null,
  trace_id text null,

  -- “What changed” pointers (reference-only)
  policy_version_id uuid null references public.policy_versions(id) on delete set null,
  policy_hash text null,
  release_sha text null,
  environment text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz null
);

create index if not exists support_cases_org_created_at_idx on public.support_cases(org_id, created_at desc);
create index if not exists support_cases_org_status_idx on public.support_cases(org_id, status);
create index if not exists support_cases_org_deal_idx on public.support_cases(org_id, deal_id);
create index if not exists support_cases_org_run_idx on public.support_cases(org_id, run_id);
create index if not exists support_cases_org_subject_user_idx on public.support_cases(org_id, subject_user_id);
create index if not exists support_cases_request_id_idx on public.support_cases(request_id);
create index if not exists support_cases_trace_id_idx on public.support_cases(trace_id);

alter table public.support_cases enable row level security;

-- RLS: SELECT/INSERT/UPDATE restricted to privileged org roles.
drop policy if exists support_cases_select_admin on public.support_cases;
create policy support_cases_select_admin
on public.support_cases
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('owner','manager','vp')
  )
);

drop policy if exists support_cases_insert_admin on public.support_cases;
create policy support_cases_insert_admin
on public.support_cases
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('owner','manager','vp')
  )
);

drop policy if exists support_cases_update_admin on public.support_cases;
create policy support_cases_update_admin
on public.support_cases
for update
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('owner','manager','vp')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('owner','manager','vp')
  )
);

-- updated_at trigger (project-standard helper)
drop trigger if exists support_cases_set_updated_at on public.support_cases;
create trigger support_cases_set_updated_at
before update on public.support_cases
for each row execute function public.tg_set_updated_at();

-- Audit trigger for support_cases
drop trigger if exists support_cases_audit_row_change on public.support_cases;
create trigger support_cases_audit_row_change
after insert or update or delete on public.support_cases
for each row execute function public.audit_log_row_change();

create table if not exists public.support_case_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  support_case_id uuid not null references public.support_cases(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('created','note','status_changed','updated')),
  note text null,
  status_from text null,
  status_to text null,
  created_at timestamptz not null default now()
);

create index if not exists support_case_events_case_created_at_idx on public.support_case_events(support_case_id, created_at desc);
create index if not exists support_case_events_org_created_at_idx on public.support_case_events(org_id, created_at desc);

alter table public.support_case_events enable row level security;

-- RLS: SELECT/INSERT restricted to privileged org roles.
drop policy if exists support_case_events_select_admin on public.support_case_events;
create policy support_case_events_select_admin
on public.support_case_events
for select
to authenticated
using (
  exists (
    select 1
    from public.support_cases c
    join public.memberships m
      on m.org_id = c.org_id
     and m.user_id = auth.uid()
    where c.id = support_case_id
      and c.org_id = support_case_events.org_id
      and m.role in ('owner','manager','vp')
  )
);

drop policy if exists support_case_events_insert_admin on public.support_case_events;
create policy support_case_events_insert_admin
on public.support_case_events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.support_cases c
    join public.memberships m
      on m.org_id = c.org_id
     and m.user_id = auth.uid()
    where c.id = support_case_id
      and c.org_id = support_case_events.org_id
      and m.role in ('owner','manager','vp')
  )
);

-- Append-only: no UPDATE/DELETE policies.

-- Audit trigger for support_case_events (append-only insert)
drop trigger if exists support_case_events_audit_row_change on public.support_case_events;
create trigger support_case_events_audit_row_change
after insert on public.support_case_events
for each row execute function public.audit_log_row_change();

commit;
