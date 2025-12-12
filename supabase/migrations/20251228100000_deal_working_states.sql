-- supabase/migrations/20251228100000_deal_working_states.sql
-- Persist per-user, per-org, per-deal working state for underwriting inputs.
begin;

create extension if not exists pgcrypto;

create table if not exists public.deal_working_states (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  deal_id uuid not null references public.deals(id) on delete cascade,
  posture text not null default 'base' check (posture in ('conservative','base','aggressive')),
  payload jsonb not null default '{}'::jsonb,
  source_run_id uuid references public.runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_working_states_unique_org_user_deal unique (org_id, user_id, deal_id)
);

create index if not exists idx_deal_working_states_org_user on public.deal_working_states (org_id, user_id);
create index if not exists idx_deal_working_states_deal on public.deal_working_states (deal_id, updated_at desc);
create index if not exists idx_deal_working_states_source_run on public.deal_working_states (source_run_id);

alter table public.deal_working_states enable row level security;

-- Updated-at trigger helper (shared)
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists set_deal_working_states_updated_at on public.deal_working_states;
create trigger set_deal_working_states_updated_at
before update on public.deal_working_states
for each row execute function public.tg_set_updated_at();

-- RLS: user must own the row and belong to the org via memberships
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_working_states' and policyname='deal_working_states_select'
  ) then
    execute $$create policy deal_working_states_select on public.deal_working_states
      for select
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = deal_working_states.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_working_states' and policyname='deal_working_states_insert'
  ) then
    execute $$create policy deal_working_states_insert on public.deal_working_states
      for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = deal_working_states.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_working_states' and policyname='deal_working_states_update'
  ) then
    execute $$create policy deal_working_states_update on public.deal_working_states
      for update
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = deal_working_states.org_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = deal_working_states.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_working_states' and policyname='deal_working_states_delete'
  ) then
    execute $$create policy deal_working_states_delete on public.deal_working_states
      for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = deal_working_states.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

-- Audit trail
create or replace function public.audit_log_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_org uuid;
  v_row uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if TG_OP = 'DELETE' then
    begin v_org := OLD.org_id; exception when others then v_org := null; end;
    begin v_row := OLD.id;     exception when others then v_row := null; end;
    v_old := to_jsonb(OLD);
    v_new := null;
  else
    begin v_org := NEW.org_id; exception when others then v_org := null; end;
    begin v_row := NEW.id;     exception when others then v_row := null; end;
    v_old := case when TG_OP='UPDATE' then to_jsonb(OLD) else null end;
    v_new := to_jsonb(NEW);
  end if;

  insert into public.audit_logs(
    org_id,
    actor_user_id,
    table_name,
    entity,
    row_id_uuid,
    action,
    diff
  )
  values (
    v_org,
    auth.uid(),
    TG_TABLE_NAME,
    TG_TABLE_NAME,
    v_row,
    TG_OP,
    jsonb_build_object('old', v_old, 'new', v_new)
  );

  return case when TG_OP='DELETE' then OLD else NEW end;
end
$fn$;

drop trigger if exists audit_deal_working_states on public.deal_working_states;
create trigger audit_deal_working_states
after insert or update or delete on public.deal_working_states
for each row execute function public.audit_log_row_change();

commit;
