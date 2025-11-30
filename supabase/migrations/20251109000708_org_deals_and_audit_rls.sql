-- org_deals_and_audit_rls.sql
begin;

-- Extension commonly present on Supabase; safe if already there
create extension if not exists pgcrypto;

-- ========= deals (org-scoped) =========
create table if not exists public.deals (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  address      text,
  city         text,
  state        text,
  zip          text,
  payload      jsonb not null default '{}'::jsonb
);

alter table public.deals enable row level security;

-- SELECT policy
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deals' and policyname='deals_select_in_org'
  ) then
    execute $$create policy deals_select_in_org on public.deals
      for select
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deals.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- INSERT policy
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deals' and policyname='deals_insert_in_org'
  ) then
    execute $$create policy deals_insert_in_org on public.deals
      for insert
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = deals.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- UPDATE policy
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deals' and policyname='deals_update_in_org'
  ) then
    execute $$create policy deals_update_in_org on public.deals
      for update
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deals.org_id and m.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = deals.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- DELETE policy (manager/vp/owner)
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deals' and policyname='deals_delete_manager'
  ) then
    execute $$create policy deals_delete_manager on public.deals
      for delete
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deals.org_id and m.user_id = auth.uid()
          and m.role in ('manager','vp')
      ));$$;
  end if;
end $pol$;

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists set_deals_updated_at on public.deals;
create trigger set_deals_updated_at
before update on public.deals
for each row execute function public.tg_set_updated_at();

-- ========= audit_logs (coarse audit) =========
create table if not exists public.audit_logs (
  id              bigserial primary key,
  org_id          uuid not null,
  actor_user_id   uuid not null default auth.uid(),
  table_name      text not null,
  entity          text not null, -- ADDED: Matches database constraint
  row_id_uuid     uuid,
  action          text not null check (action in ('INSERT','UPDATE','DELETE')),
  diff            jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.audit_logs is 'Coarse audit via triggers; SELECT scoped by org membership.';
alter table public.audit_logs enable row level security;

-- SELECT policy for audit_logs
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_select_in_org'
  ) then
    execute $$create policy audit_logs_select_in_org on public.audit_logs
      for select
      using (exists (
        select 1 from public.memberships m
        where m.org_id = audit_logs.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

-- SECURITY DEFINER audit trigger (generic)
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

  -- UPDATED: Added 'entity' to INSERT columns and values
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
    TG_TABLE_NAME, -- Mapping entity to table name
    v_row, 
    TG_OP, 
    jsonb_build_object('old', v_old, 'new', v_new)
  );

  return case when TG_OP='DELETE' then OLD else NEW end;
end
$fn$;

-- Attach audit triggers
drop trigger if exists audit_policies        on public.policies;
create trigger audit_policies
after insert or update or delete on public.policies
for each row execute function public.audit_log_row_change();

drop trigger if exists audit_policy_versions on public.policy_versions;
create trigger audit_policy_versions
after insert or update or delete on public.policy_versions
for each row execute function public.audit_log_row_change();

drop trigger if exists audit_runs on public.runs;
create trigger audit_runs
after insert or update or delete on public.runs
for each row execute function public.audit_log_row_change();

drop trigger if exists audit_deals on public.deals;
create trigger audit_deals
after insert or update or delete on public.deals
for each row execute function public.audit_log_row_change();

commit;