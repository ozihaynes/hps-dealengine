# Repairs Org / Profile Diagnosis (2025-12-08)

## What we attempted
- Intended diagnostic queries (to run against the hosted Postgres) to spot org/profile mismatches:
  - Memberships by org/role:
    ```sql
    select org_id, role, count(*) as members
    from public.memberships
    group by org_id, role
    order by org_id, role;
    ```
  - Repair profiles by org/market/posture:
    ```sql
    select org_id, market_code, posture, is_active, is_default, count(*) as count
    from public.repair_rate_sets
    group by org_id, market_code, posture, is_active, is_default
    order by org_id, market_code, posture;
    ```
  - Deals (latest 10) to correlate deal orgs:
    ```sql
    select id, org_id, address, city, state, zip
    from public.deals
    order by created_at desc
    limit 10;
    ```
  - Profiles for the deal org(s):
    ```sql
    select id, org_id, name, market_code, posture, is_active, is_default, as_of, source, version
    from public.repair_rate_sets
    where org_id = <deal_org_id>
    order by market_code, posture, name;
    ```
  - Profiles under other orgs:
    ```sql
    select id, org_id, name, market_code, posture, is_active, is_default
    from public.repair_rate_sets
    where org_id <> <deal_org_id>;
    ```

## Environment note
- Live DB access was not available in this environment, so the above queries could not be executed here.
- To validate in hosted Supabase, run the queries above (or `supabase db remote ...`) and confirm the active deal org has an active/default ORL/base profile.

## Remediation applied
- Added migration `20251208104500_repair_rate_sets_org_alignment.sql` to:
  - Ensure every org that has deals gets one active/default ORL/base profile.
  - Clone the latest ORL/base profile as a seed when an org has none.
  - Deactivate other profiles for that org/market/posture so the active/default is deterministic.
