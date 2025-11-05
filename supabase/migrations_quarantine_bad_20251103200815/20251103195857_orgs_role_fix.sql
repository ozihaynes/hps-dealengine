-- RLS policies (idempotent)
drop policy if exists orgs_select_members on public.organizations;
create policy orgs_select_members on public.organizations
  for select using (
    exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists mships_select_self on public.memberships;
create policy mships_select_self on public.memberships
  for select using (user_id = auth.uid());

-- Ensure the org exists
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'HPS Test Org')
on conflict (id) do nothing;

-- ✅ Seed membership using a role that exists in most enums: 'member'
-- (If your enum has a different label, we’ll switch to it next.)
insert into public.memberships (org_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', '391ec2a5-4330-497a-b4ff-f510ab61fddf', 'member')
on conflict (org_id, user_id) do nothing;
