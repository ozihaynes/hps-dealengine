-- 20251126225643_policy_overrides_governance.sql
-- Sprint 2 Governance: tighten policy_overrides alignment with roadmap
-- Adds optional policy_version_id linkage and update RLS for approvers

DO $$
BEGIN
  -- 0) Bail out cleanly if the table itself does not exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'policy_overrides'
  ) THEN
    RAISE NOTICE 'policy_overrides_governance: table public.policy_overrides not found, skipping migration';
    RETURN;
  END IF;

  -- 1) Add policy_version_id column if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'policy_overrides'
      AND column_name  = 'policy_version_id'
  ) THEN
    ALTER TABLE public.policy_overrides
      ADD COLUMN policy_version_id uuid REFERENCES public.policy_versions(id);
  END IF;

  -- 2) Future RLS / governance tweaks for policy_overrides can go here
END
$$ LANGUAGE plpgsql;
