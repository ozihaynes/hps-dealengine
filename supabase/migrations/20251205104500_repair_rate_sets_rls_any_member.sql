-- 20251205104500_repair_rate_sets_rls_any_member.sql
-- Allow any org member (any role) to insert/update/delete repair_rate_sets; select unchanged.

begin;

-- Insert policy: any membership in org
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
      )
    );
end
$pol$;

-- Update policy: any membership in org
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
      )
    )
    with check (
      exists (
        select 1 from public.memberships m
        where m.org_id = repair_rate_sets.org_id
          and m.user_id = auth.uid()
      )
    );
end
$pol$;

-- Delete policy: any membership in org
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
      )
    );
end
$pol$;

-- Select policy remains unchanged.

commit;
