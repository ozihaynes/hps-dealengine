-- 20251127215900_membership_role_owner.sql
-- Sprint 2 Governance: add "owner" to membership_role enum so RLS policies can reference it.

ALTER TYPE public.membership_role ADD VALUE 'owner';
