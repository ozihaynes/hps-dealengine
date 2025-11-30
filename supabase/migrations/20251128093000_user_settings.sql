-- supabase/migrations/20251128093000_user_settings.sql
begin;

-- Ensure UUID generation is available
create extension if not exists pgcrypto;

-- User settings (per user per org)
create table if not exists public.user_settings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  org_id           uuid not null references public.organizations(id) on delete cascade,
  default_posture  text not null default 'base' check (default_posture in ('conservative','base','aggressive')),
  default_market   text not null default 'ORL',
  theme            text not null default 'system' check (theme in ('dark','light','system')),
  ui_prefs         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint user_settings_unique_user_org unique (user_id, org_id)
);

-- Helpful index for lookups (redundant with unique, but explicit)
create index if not exists idx_user_settings_user_org on public.user_settings (user_id, org_id);

alter table public.user_settings enable row level security;

-- Updated-at trigger helper
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.tg_set_updated_at();

-- RLS policies: user must own the row and be in org memberships
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_settings' and policyname='user_settings_select'
  ) then
    execute $$create policy user_settings_select on public.user_settings
      for select
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = user_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_settings' and policyname='user_settings_insert'
  ) then
    execute $$create policy user_settings_insert on public.user_settings
      for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = user_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_settings' and policyname='user_settings_update'
  ) then
    execute $$create policy user_settings_update on public.user_settings
      for update
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = user_settings.org_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = user_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_settings' and policyname='user_settings_delete'
  ) then
    execute $$create policy user_settings_delete on public.user_settings
      for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = user_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

-- Ensure audit trigger function exists (matches existing pattern)
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

drop trigger if exists audit_user_settings on public.user_settings;
create trigger audit_user_settings
after insert or update or delete on public.user_settings
for each row execute function public.audit_log_row_change();

commit;
