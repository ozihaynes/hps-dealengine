-- supabase/migrations/20251128171500_sandbox_settings.sql
begin;

-- Table
create table if not exists public.sandbox_settings (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  posture     text not null check (posture in ('conservative','base','aggressive')),
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sandbox_settings_unique_org_posture unique (org_id, posture)
);

-- RLS
alter table public.sandbox_settings enable row level security;

-- Membership helper policies (auth.uid + org membership)
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_settings' and policyname='sandbox_settings_select'
  ) then
    execute $$create policy sandbox_settings_select on public.sandbox_settings
      for select
      using (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_settings' and policyname='sandbox_settings_insert'
  ) then
    execute $$create policy sandbox_settings_insert on public.sandbox_settings
      for insert
      with check (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_settings' and policyname='sandbox_settings_update'
  ) then
    execute $$create policy sandbox_settings_update on public.sandbox_settings
      for update
      using (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_settings.org_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sandbox_settings' and policyname='sandbox_settings_delete'
  ) then
    execute $$create policy sandbox_settings_delete on public.sandbox_settings
      for delete
      using (
        exists (
          select 1 from public.memberships m
          where m.org_id = sandbox_settings.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

-- updated_at trigger helper
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists set_sandbox_settings_updated_at on public.sandbox_settings;
create trigger set_sandbox_settings_updated_at
before update on public.sandbox_settings
for each row execute function public.tg_set_updated_at();

-- audit trigger (function already exists elsewhere)
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

drop trigger if exists audit_sandbox_settings on public.sandbox_settings;
create trigger audit_sandbox_settings
after insert or update or delete on public.sandbox_settings
for each row execute function public.audit_log_row_change();

commit;
