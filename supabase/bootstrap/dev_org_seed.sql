-- supabase/bootstrap/dev_org_seed.sql
-- Idempotent seed for a canonical dev org + underwriter@test.local membership.

do $$
declare
  v_user_id uuid;
  v_org_id  uuid;
begin
  -- 1) Look up the dev user in auth.users
  select id
  into v_user_id
  from auth.users
  where email = 'underwriter@test.local'
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception
      using message = 'dev_org_seed: user underwriter@test.local not found in auth.users';
  end if;

  -- 2) Ensure the dev organization exists
  select id
  into v_org_id
  from public.organizations
  where name = 'HPS Dev Org'
  order by created_at asc
  limit 1;

  if v_org_id is null then
    insert into public.organizations (name)
    values ('HPS Dev Org')
    returning id into v_org_id;
  end if;

  -- 3) Ensure the membership exists (role = analyst by default)
  if not exists (
    select 1
    from public.memberships m
    where m.org_id = v_org_id
      and m.user_id = v_user_id
  ) then
    insert into public.memberships (org_id, user_id, role)
    values (v_org_id, v_user_id, 'analyst');
  end if;
end
$$ language plpgsql;