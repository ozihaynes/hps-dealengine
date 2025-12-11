-- supabase/migrations/20251208133000_ai_chat_history.sql
-- Persist AI chat threads and messages with 30-day retention and org/user scoping.
begin;

-- Extensions used elsewhere; ensure available for UUIDs + cron cleanup.
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- Threads are user/org scoped and partitioned by persona.
create table if not exists public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  persona text not null check (persona in ('dealAnalyst','dealStrategist','dealNegotiator')),
  title text,
  tone text,
  deal_id uuid,
  run_id uuid,
  posture text,
  last_message_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_threads_user_persona on public.ai_chat_threads (user_id, persona, last_message_at desc);
create index if not exists idx_ai_chat_threads_org on public.ai_chat_threads (org_id, persona);
create index if not exists idx_ai_chat_threads_expires on public.ai_chat_threads (expires_at);

-- Messages live under a thread; org/user/persona are copied from the parent thread for RLS + querying.
create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  user_id uuid not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  persona text not null check (persona in ('dealAnalyst','dealStrategist','dealNegotiator')),
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_messages_thread on public.ai_chat_messages (thread_id, created_at);
create index if not exists idx_ai_chat_messages_user_persona on public.ai_chat_messages (user_id, persona, created_at);
create index if not exists idx_ai_chat_messages_org on public.ai_chat_messages (org_id, persona, created_at);

-- Updated-at helper (shared across tables)
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists set_ai_chat_threads_updated_at on public.ai_chat_threads;
create trigger set_ai_chat_threads_updated_at
before update on public.ai_chat_threads
for each row execute function public.tg_set_updated_at();

-- Copy org/user/persona from the parent thread to each message automatically.
create or replace function public.tg_ai_chat_messages_fill()
returns trigger language plpgsql as $fn$
declare
  v_thread record;
begin
  select user_id, org_id, persona into v_thread
  from public.ai_chat_threads
  where id = new.thread_id;

  if not found then
    raise exception 'ai_chat_messages thread_id % not found', new.thread_id;
  end if;

  new.user_id := v_thread.user_id;
  new.org_id := v_thread.org_id;
  new.persona := v_thread.persona;
  return new;
end
$fn$;

drop trigger if exists ai_chat_messages_fill on public.ai_chat_messages;
create trigger ai_chat_messages_fill
before insert on public.ai_chat_messages
for each row execute function public.tg_ai_chat_messages_fill();

-- Bump thread timestamps/expiry when a message is added.
create or replace function public.tg_ai_chat_threads_bump()
returns trigger language plpgsql as $fn$
begin
  update public.ai_chat_threads
     set updated_at = now(),
         last_message_at = coalesce(new.created_at, now()),
         expires_at = greatest(expires_at, now() + interval '30 days')
   where id = new.thread_id;
  return null;
end
$fn$;

drop trigger if exists ai_chat_messages_bump_thread on public.ai_chat_messages;
create trigger ai_chat_messages_bump_thread
after insert on public.ai_chat_messages
for each row execute function public.tg_ai_chat_threads_bump();

-- RLS: user must own the thread and belong to the org via memberships.
alter table public.ai_chat_threads enable row level security;
alter table public.ai_chat_messages enable row level security;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_threads' and policyname='ai_chat_threads_select'
  ) then
    execute $$create policy ai_chat_threads_select on public.ai_chat_threads
      for select
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_threads.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_threads' and policyname='ai_chat_threads_insert'
  ) then
    execute $$create policy ai_chat_threads_insert on public.ai_chat_threads
      for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_threads.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_threads' and policyname='ai_chat_threads_update'
  ) then
    execute $$create policy ai_chat_threads_update on public.ai_chat_threads
      for update
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_threads.org_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_threads.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_threads' and policyname='ai_chat_threads_delete'
  ) then
    execute $$create policy ai_chat_threads_delete on public.ai_chat_threads
      for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_threads.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

-- Messages inherit ownership from the parent thread.
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_messages' and policyname='ai_chat_messages_select'
  ) then
    execute $$create policy ai_chat_messages_select on public.ai_chat_messages
      for select
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_messages.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_messages' and policyname='ai_chat_messages_insert'
  ) then
    execute $$create policy ai_chat_messages_insert on public.ai_chat_messages
      for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_messages.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_messages' and policyname='ai_chat_messages_update'
  ) then
    execute $$create policy ai_chat_messages_update on public.ai_chat_messages
      for update
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_messages.org_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_messages.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_chat_messages' and policyname='ai_chat_messages_delete'
  ) then
    execute $$create policy ai_chat_messages_delete on public.ai_chat_messages
      for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1
          from public.memberships m
          where m.org_id = ai_chat_messages.org_id
            and m.user_id = auth.uid()
        )
      );$$;
  end if;
end $pol$;

-- Audit trails (re-use shared function)
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

drop trigger if exists audit_ai_chat_threads on public.ai_chat_threads;
create trigger audit_ai_chat_threads
after insert or update or delete on public.ai_chat_threads
for each row execute function public.audit_log_row_change();

drop trigger if exists audit_ai_chat_messages on public.ai_chat_messages;
create trigger audit_ai_chat_messages
after insert or update or delete on public.ai_chat_messages
for each row execute function public.audit_log_row_change();

-- Daily cron to drop expired threads/messages (30-day retention)
create or replace function public.delete_expired_ai_chat()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  delete from public.ai_chat_threads where expires_at < now();
end
$fn$;

do $cron$ declare
  v_job_id int;
begin
  select jobid into v_job_id from cron.job where jobname = 'ai_chat_expiration_daily';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'ai_chat_expiration_daily',
    '30 4 * * *',
    $$select public.delete_expired_ai_chat();$$
  );
end $cron$;

commit;
