-- supabase/migrations/20251128185000_evidence_ensure.sql
-- Ensure evidence table, constraints, RLS, and audit triggers exist.
begin;

create table if not exists public.evidence (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  deal_id     uuid not null references public.deals(id) on delete cascade,
  run_id      uuid references public.runs(id) on delete set null,
  kind        text not null,
  storage_key text not null,
  filename    text not null,
  mime_type   text not null,
  bytes       bigint not null,
  sha256      text not null,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- helpful indexes
create index if not exists idx_evidence_org_deal on public.evidence (org_id, deal_id);
create index if not exists idx_evidence_run on public.evidence (run_id);

alter table public.evidence enable row level security;

-- RLS policies (membership-based)
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='evidence' and policyname='evidence_select'
  ) then
    execute $$create policy evidence_select on public.evidence
      for select
      using (
        exists (
          select 1 from public.memberships m
          where m.org_id = evidence.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='evidence' and policyname='evidence_insert'
  ) then
    execute $$create policy evidence_insert on public.evidence
      for insert
      with check (
        created_by = auth.uid()
        and exists (
          select 1 from public.memberships m
          where m.org_id = evidence.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='evidence' and policyname='evidence_update'
  ) then
    execute $$create policy evidence_update on public.evidence
      for update
      using (
        created_by = auth.uid()
        and exists (
          select 1 from public.memberships m
          where m.org_id = evidence.org_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1 from public.memberships m
          where m.org_id = evidence.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='evidence' and policyname='evidence_delete'
  ) then
    execute $$create policy evidence_delete on public.evidence
      for delete
      using (
        created_by = auth.uid()
        and exists (
          select 1 from public.memberships m
          where m.org_id = evidence.org_id
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

drop trigger if exists set_evidence_updated_at on public.evidence;
create trigger set_evidence_updated_at
before update on public.evidence
for each row execute function public.tg_set_updated_at();

-- audit trigger
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

drop trigger if exists audit_evidence on public.evidence;
create trigger audit_evidence
after insert or update or delete on public.evidence
for each row execute function public.audit_log_row_change();

commit;
