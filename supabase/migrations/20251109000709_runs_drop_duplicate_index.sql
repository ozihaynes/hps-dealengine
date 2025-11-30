-- runs_drop_duplicate_index.sql
begin;
do $$
begin
  -- Keep canonical: runs_uni_org_posture_iohash_polhash
  if exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='runs_dedupe_unique'
  ) then
    execute 'drop index if exists public.runs_dedupe_unique';
  end if;
end$$;
commit;
