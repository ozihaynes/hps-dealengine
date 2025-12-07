-- 20251127215900_membership_role_owner.sql
-- Sprint 2 Governance: add "owner" to membership_role enum so RLS policies can reference it.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'membership_role'
      AND e.enumlabel = 'owner'
  ) THEN
    ALTER TYPE public.membership_role ADD VALUE 'owner';
  END IF;
END
$$;
