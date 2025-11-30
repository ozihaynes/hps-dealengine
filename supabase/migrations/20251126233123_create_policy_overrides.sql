-- Create policy_overrides to match snapshot schema (with policy_version_id)

-- Ensure required enum exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'policy_override_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.policy_override_status AS ENUM ('pending','approved','rejected');
  END IF;
END$$;

-- Create table if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'policy_overrides'
  ) THEN
    CREATE TABLE public.policy_overrides (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      org_id uuid NOT NULL,
      run_id uuid,
      posture text NOT NULL,
      token_key text NOT NULL,
      requested_by uuid DEFAULT auth.uid(),
      requested_at timestamp with time zone DEFAULT now(),
      approved_by uuid,
      approved_at timestamp with time zone,
      status public.policy_override_status DEFAULT 'pending',
      justification text,
      new_value jsonb NOT NULL,
      policy_version_id uuid REFERENCES public.policy_versions(id)
    );
  END IF;
END$$;

-- Primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'policy_overrides'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.policy_overrides
      ADD CONSTRAINT policy_overrides_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- Enable RLS
ALTER TABLE public.policy_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: analysts/org members can insert (request overrides)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Analysts request overrides'
      AND polrelid = 'public.policy_overrides'::regclass
  ) THEN
    DROP POLICY "Analysts request overrides" ON public.policy_overrides;
  END IF;

  CREATE POLICY "Analysts request overrides" ON public.policy_overrides
    FOR INSERT
    WITH CHECK (
      org_id IN (
        SELECT org_id FROM public.memberships
        WHERE user_id = auth.uid()
      )
    );
END$$;

-- RLS: org members can select their overrides
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Org members view overrides'
      AND polrelid = 'public.policy_overrides'::regclass
  ) THEN
    DROP POLICY "Org members view overrides" ON public.policy_overrides;
  END IF;

  CREATE POLICY "Org members view overrides" ON public.policy_overrides
    FOR SELECT
    USING (
      org_id IN (
        SELECT org_id FROM public.memberships
        WHERE user_id = auth.uid()
      )
    );
END$$;
