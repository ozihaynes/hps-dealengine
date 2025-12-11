-- 20251209120000_agent_runs.sql
-- Introduce agent_runs logging table with RLS and audit trigger.
-- Apply with your standard Supabase migration command (e.g. pnpm supabase:migrate:dev or equivalent for this repo).
begin;

create extension if not exists pgcrypto;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  persona text not null check (persona in ('dealAnalyst','dealStrategist','dealNegotiator')),
  agent_name text not null,
  workflow_version text not null,
  deal_id uuid references public.deals (id) on delete set null,
  run_id uuid references public.runs (id) on delete set null,
  thread_id uuid references public.ai_chat_threads (id) on delete set null,
  trace_id text,
  model text,
  status text not null default 'succeeded',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error jsonb,
  latency_ms integer,
  total_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_org_persona_created_desc
  on public.agent_runs (org_id, persona, created_at desc);

create index if not exists agent_runs_user_persona_created_desc
  on public.agent_runs (user_id, persona, created_at desc);

create index if not exists agent_runs_deal_created_desc
  on public.agent_runs (deal_id, created_at desc);

create index if not exists agent_runs_run_created_desc
  on public.agent_runs (run_id, created_at desc);

alter table public.agent_runs enable row level security;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='agent_runs' and policyname='agent_runs_select'
  ) then
    execute $$create policy agent_runs_select on public.agent_runs
      for select
      using (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and user_id = auth.uid()
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='agent_runs' and policyname='agent_runs_insert'
  ) then
    execute $$create policy agent_runs_insert on public.agent_runs
      for insert
      with check (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and user_id = auth.uid()
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='agent_runs' and policyname='agent_runs_update'
  ) then
    execute $$create policy agent_runs_update on public.agent_runs
      for update
      using (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and user_id = auth.uid()
      )
      with check (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and user_id = auth.uid()
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='agent_runs' and policyname='agent_runs_delete'
  ) then
    execute $$create policy agent_runs_delete on public.agent_runs
      for delete
      using (
        org_id in (
          select m.org_id from public.memberships m where m.user_id = auth.uid()
        )
        and user_id = auth.uid()
      );$$;
  end if;
end $pol$;

-- Audit trail
drop trigger if exists audit_agent_runs on public.agent_runs;
create trigger audit_agent_runs
after insert or update or delete on public.agent_runs
for each row execute function public.audit_log_row_change();

commit;
