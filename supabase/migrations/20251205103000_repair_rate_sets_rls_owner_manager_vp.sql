-- 20251205103000_repair_rate_sets_rls_owner_manager_vp.sql
-- Expand repair_rate_sets RLS so owner/manager/vp can insert/update/delete (analyst stays read-only).

begin;

-- Insert policy: owner/manager/vp
do $pol$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_insert_manager'
  ) then
    drop policy repair_rate_sets_insert_manager on public.repair_rate_sets;
  end if;

  create policy repair_rate_sets_insert_manager on public.repair_rate_sets
    for insert
    with check (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('owner','manager','vp')
      )
    );
end
$pol$;

-- Update policy: owner/manager/vp
do $pol$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_update_manager'
  ) then
    drop policy repair_rate_sets_update_manager on public.repair_rate_sets;
  end if;

  create policy repair_rate_sets_update_manager on public.repair_rate_sets
    for update
    using (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('owner','manager','vp')
      )
    )
    with check (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('owner','manager','vp')
      )
    );
end
$pol$;

-- Delete policy: owner/manager/vp
do $pol$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'repair_rate_sets'
      and policyname = 'repair_rate_sets_delete_manager'
  ) then
    drop policy repair_rate_sets_delete_manager on public.repair_rate_sets;
  end if;

  create policy repair_rate_sets_delete_manager on public.repair_rate_sets
    for delete
    using (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
          and m.role in ('owner','manager','vp')
      )
    );
end
$pol$;

-- Select policy remains unchanged (org members).

commit;
