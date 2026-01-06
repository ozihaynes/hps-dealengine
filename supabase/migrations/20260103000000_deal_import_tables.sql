-- BULK-IMPORT-v1 Slice 1: DB Foundation
-- Creates tables, RLS policies, triggers, storage bucket, and helper function
-- for the deal import pipeline.

begin;

-- ============================================================================
-- EXTENSION: pgcrypto for SHA256 hashing
-- ============================================================================
create extension if not exists pgcrypto;

-- ============================================================================
-- HELPER FUNCTION: compute_deal_dedupe_key
-- ============================================================================
-- Computes a deterministic SHA256 hash for address-based deduplication.
-- Normalizes inputs (uppercase, trim) and concatenates with pipe delimiter.
-- ZIP is normalized to first 5 digits only.
--
-- Example: compute_deal_dedupe_key('123 Main St', 'Orlando', 'FL', '32801-1234')
-- Returns: 64-character lowercase hex string (SHA256 hash)

create or replace function public.compute_deal_dedupe_key(
  p_street text,
  p_city text,
  p_state text,
  p_zip text
)
returns text
language sql
immutable
parallel safe
as $$
  select encode(
    sha256(
      convert_to(
        upper(trim(coalesce(p_street, ''))) || '|' ||
        upper(trim(coalesce(p_city, ''))) || '|' ||
        upper(trim(coalesce(p_state, ''))) || '|' ||
        left(regexp_replace(coalesce(p_zip, ''), '[^0-9]', '', 'g'), 5),
        'UTF8'
      )
    ),
    'hex'
  );
$$;

comment on function public.compute_deal_dedupe_key(text, text, text, text) is
  'Computes deterministic SHA256 hash for address-based deal deduplication. Normalizes: UPPER + TRIM, ZIP to 5 digits.';

grant execute on function public.compute_deal_dedupe_key(text, text, text, text) to authenticated, service_role;

-- ============================================================================
-- TABLE: deal_import_jobs (provenance container)
-- ============================================================================
create table if not exists public.deal_import_jobs (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  created_by            uuid not null default auth.uid() references auth.users(id),
  source_route          text not null check (source_route in ('startup', 'deals', 'import')),
  import_kind           text not null default 'deals' check (import_kind in ('deals', 'contacts')),
  file_type             text not null check (file_type in ('csv', 'xlsx', 'json')),
  file_name             text not null,
  file_size_bytes       bigint not null check (file_size_bytes > 0),
  file_sha256           text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  storage_bucket        text not null default 'imports',
  storage_path          text not null,
  column_mapping        jsonb,
  status                text not null default 'draft' check (status in ('draft', 'mapped', 'validating', 'ready', 'promoting', 'complete', 'failed', 'archived')),
  status_message        text,
  rows_total            int not null default 0 check (rows_total >= 0),
  rows_valid            int not null default 0 check (rows_valid >= 0),
  rows_needs_fix        int not null default 0 check (rows_needs_fix >= 0),
  rows_promoted         int not null default 0 check (rows_promoted >= 0),
  rows_skipped_duplicate int not null default 0 check (rows_skipped_duplicate >= 0),
  rows_skipped_other    int not null default 0 check (rows_skipped_other >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint deal_import_jobs_org_file_unique unique (org_id, file_sha256)
);

-- Indexes for deal_import_jobs
create index if not exists deal_import_jobs_org_id_idx on public.deal_import_jobs (org_id);
create index if not exists deal_import_jobs_org_status_idx on public.deal_import_jobs (org_id, status);
create index if not exists deal_import_jobs_created_at_idx on public.deal_import_jobs (created_at desc);
create index if not exists deal_import_jobs_created_by_idx on public.deal_import_jobs (created_by);

-- Enable RLS
alter table public.deal_import_jobs enable row level security;

-- RLS Policies for deal_import_jobs
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_jobs' and policyname='deal_import_jobs_select_in_org'
  ) then
    execute $$create policy deal_import_jobs_select_in_org on public.deal_import_jobs
      for select
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_jobs.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_jobs' and policyname='deal_import_jobs_insert_in_org'
  ) then
    execute $$create policy deal_import_jobs_insert_in_org on public.deal_import_jobs
      for insert
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_jobs.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_jobs' and policyname='deal_import_jobs_update_in_org'
  ) then
    execute $$create policy deal_import_jobs_update_in_org on public.deal_import_jobs
      for update
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_jobs.org_id and m.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_jobs.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_jobs' and policyname='deal_import_jobs_delete_in_org'
  ) then
    execute $$create policy deal_import_jobs_delete_in_org on public.deal_import_jobs
      for delete
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_jobs.org_id and m.user_id = auth.uid()
          and m.role in ('manager', 'vp')
      ));$$;
  end if;
end $pol$;

-- Triggers for deal_import_jobs
drop trigger if exists set_deal_import_jobs_updated_at on public.deal_import_jobs;
create trigger set_deal_import_jobs_updated_at
before update on public.deal_import_jobs
for each row execute function public.tg_set_updated_at();

drop trigger if exists audit_deal_import_jobs on public.deal_import_jobs;
create trigger audit_deal_import_jobs
after insert or update or delete on public.deal_import_jobs
for each row execute function public.audit_log_row_change();

-- ============================================================================
-- TABLE: deal_import_items (per-row staging)
-- ============================================================================
create table if not exists public.deal_import_items (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  job_id                uuid not null references public.deal_import_jobs(id) on delete cascade,
  row_number            int not null check (row_number > 0),
  raw_payload           jsonb not null,
  normalized_payload    jsonb not null,
  validation_errors     jsonb not null default '[]'::jsonb,
  dedupe_key            text not null check (dedupe_key ~ '^[0-9a-f]{64}$'),
  status                text not null default 'pending' check (status in ('pending', 'valid', 'needs_fix', 'promoted', 'skipped_duplicate', 'skipped_other', 'failed')),
  skip_reason           text check (skip_reason is null or skip_reason in ('duplicate_within_file', 'duplicate_queued_item', 'duplicate_existing_deal', 'validation_failed', 'promotion_failed', 'user_skipped')),
  matching_item_id      uuid references public.deal_import_items(id),
  matching_deal_id      uuid references public.deals(id),
  error_message         text,
  promoted_deal_id      uuid references public.deals(id),
  promoted_at           timestamptz,
  promoted_by           uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint deal_import_items_job_row_unique unique (job_id, row_number)
);

-- Indexes for deal_import_items
create index if not exists deal_import_items_org_id_idx on public.deal_import_items (org_id);
create index if not exists deal_import_items_job_id_idx on public.deal_import_items (job_id);
create index if not exists deal_import_items_job_status_idx on public.deal_import_items (job_id, status);
create index if not exists deal_import_items_org_dedupe_idx on public.deal_import_items (org_id, dedupe_key);
create index if not exists deal_import_items_status_idx on public.deal_import_items (status);

-- Enable RLS
alter table public.deal_import_items enable row level security;

-- RLS Policies for deal_import_items
do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_items' and policyname='deal_import_items_select_in_org'
  ) then
    execute $$create policy deal_import_items_select_in_org on public.deal_import_items
      for select
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_items.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_items' and policyname='deal_import_items_insert_in_org'
  ) then
    execute $$create policy deal_import_items_insert_in_org on public.deal_import_items
      for insert
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_items.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_items' and policyname='deal_import_items_update_in_org'
  ) then
    execute $$create policy deal_import_items_update_in_org on public.deal_import_items
      for update
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_items.org_id and m.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_items.org_id and m.user_id = auth.uid()
      ));$$;
  end if;
end $pol$;

do $pol$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='deal_import_items' and policyname='deal_import_items_delete_in_org'
  ) then
    execute $$create policy deal_import_items_delete_in_org on public.deal_import_items
      for delete
      using (exists (
        select 1 from public.memberships m
        where m.org_id = deal_import_items.org_id and m.user_id = auth.uid()
          and m.role in ('manager', 'vp')
      ));$$;
  end if;
end $pol$;

-- Triggers for deal_import_items
drop trigger if exists set_deal_import_items_updated_at on public.deal_import_items;
create trigger set_deal_import_items_updated_at
before update on public.deal_import_items
for each row execute function public.tg_set_updated_at();

drop trigger if exists audit_deal_import_items on public.deal_import_items;
create trigger audit_deal_import_items
after insert or update or delete on public.deal_import_items
for each row execute function public.audit_log_row_change();

-- ============================================================================
-- STORAGE BUCKET: imports
-- ============================================================================
-- Create private 'imports' bucket with 50MB limit and restricted MIME types.
-- Path pattern: org/{org_id}/imports/{job_id}/{filename}

do $$
declare
  v_has_storage boolean;
begin
  -- Check if storage schema and functions exist
  select exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'storage' and p.proname = 'foldername'
  ) into v_has_storage;

  if v_has_storage then
    -- Check if buckets table exists
    if exists (
      select 1 from pg_tables
      where schemaname = 'storage' and tablename = 'buckets'
    ) then
      -- Create bucket if it doesn't exist
      if not exists (select 1 from storage.buckets where id = 'imports') then
        insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values (
          'imports',
          'imports',
          false,
          52428800, -- 50MB
          array['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json']
        );
      else
        -- Update existing bucket settings
        update storage.buckets
        set
          public = false,
          file_size_limit = 52428800,
          allowed_mime_types = array['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json']
        where id = 'imports';
      end if;
    end if;
  end if;
end $$;

-- ============================================================================
-- STORAGE RLS POLICIES: imports bucket
-- ============================================================================
-- Path pattern expected: org/{org_id}/imports/{job_id}/{filename}
-- Extract org_id from path and verify membership

do $storage$
begin
  -- Check if storage.objects table exists before creating policies
  if exists (
    select 1 from pg_tables
    where schemaname = 'storage' and tablename = 'objects'
  ) then
    -- SELECT policy for imports bucket
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'imports_select_org_member'
    ) then
      execute $$
        create policy imports_select_org_member on storage.objects
        for select
        using (
          bucket_id = 'imports'
          and exists (
            select 1 from public.memberships m
            where m.org_id = (storage.foldername(name))[1]::uuid
              and m.user_id = auth.uid()
          )
        );
      $$;
    end if;

    -- INSERT policy for imports bucket
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'imports_insert_org_member'
    ) then
      execute $$
        create policy imports_insert_org_member on storage.objects
        for insert
        with check (
          bucket_id = 'imports'
          and exists (
            select 1 from public.memberships m
            where m.org_id = (storage.foldername(name))[1]::uuid
              and m.user_id = auth.uid()
          )
        );
      $$;
    end if;

    -- UPDATE policy for imports bucket
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'imports_update_org_member'
    ) then
      execute $$
        create policy imports_update_org_member on storage.objects
        for update
        using (
          bucket_id = 'imports'
          and exists (
            select 1 from public.memberships m
            where m.org_id = (storage.foldername(name))[1]::uuid
              and m.user_id = auth.uid()
          )
        );
      $$;
    end if;

    -- DELETE policy for imports bucket (manager/vp only)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'imports_delete_org_manager'
    ) then
      execute $$
        create policy imports_delete_org_manager on storage.objects
        for delete
        using (
          bucket_id = 'imports'
          and exists (
            select 1 from public.memberships m
            where m.org_id = (storage.foldername(name))[1]::uuid
              and m.user_id = auth.uid()
              and m.role in ('manager', 'vp')
          )
        );
      $$;
    end if;
  end if;
end $storage$;

commit;
