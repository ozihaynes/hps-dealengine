-- ============================================================================
-- ESTIMATE REQUESTS TABLE + RLS POLICIES
-- ============================================================================
-- Migration: 20260108200000_estimate_requests.sql
-- Purpose: Store GC estimate request lifecycle data
-- RLS: org-scoped access only
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENSURE TRIGGER FUNCTION EXISTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE ESTIMATE_REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.estimate_requests (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization + Deal Reference (RLS keys)
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- GC Contact Information
  gc_name text NOT NULL,
  gc_email text NOT NULL,
  gc_phone text,
  gc_company text,

  -- Request Lifecycle State
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'viewed', 'submitted', 'expired', 'cancelled')),

  -- Magic Link Token (for secure GC submission access)
  submission_token uuid NOT NULL DEFAULT gen_random_uuid(),
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  -- Lifecycle Timestamps
  sent_at timestamptz,
  viewed_at timestamptz,
  submitted_at timestamptz,

  -- File Reference (populated after GC uploads)
  estimate_file_path text,
  estimate_file_name text,
  estimate_file_size_bytes bigint,
  estimate_file_type text,

  -- Notes
  request_notes text,  -- Notes from user to GC
  gc_notes text,       -- Notes from GC with submission

  -- Audit Fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_gc_email CHECK (gc_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_file_size CHECK (estimate_file_size_bytes IS NULL OR estimate_file_size_bytes <= 10485760)
);

COMMENT ON TABLE public.estimate_requests IS 'Tracks GC estimate request lifecycle from send through submission';
COMMENT ON COLUMN public.estimate_requests.submission_token IS 'Magic link token for GC access - expires after 7 days';
COMMENT ON COLUMN public.estimate_requests.status IS 'Lifecycle: pending -> sent -> viewed -> submitted | expired | cancelled';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_estimate_requests_deal_id
  ON public.estimate_requests(deal_id);

CREATE INDEX IF NOT EXISTS idx_estimate_requests_org_id
  ON public.estimate_requests(org_id);

-- Partial index for active token lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_estimate_requests_token_active
  ON public.estimate_requests(submission_token)
  WHERE status NOT IN ('submitted', 'expired', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_estimate_requests_status
  ON public.estimate_requests(status);

-- Composite index for deal-scoped status queries
CREATE INDEX IF NOT EXISTS idx_estimate_requests_deal_status
  ON public.estimate_requests(deal_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.estimate_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: Org members can read their org's requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'estimate_requests'
      AND policyname = 'estimate_requests_org_select'
  ) THEN
    CREATE POLICY estimate_requests_org_select ON public.estimate_requests
      FOR SELECT
      USING (
        org_id IN (
          SELECT m.org_id
          FROM public.memberships m
          WHERE m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERT: Org members can create requests for their org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'estimate_requests'
      AND policyname = 'estimate_requests_org_insert'
  ) THEN
    CREATE POLICY estimate_requests_org_insert ON public.estimate_requests
      FOR INSERT
      WITH CHECK (
        org_id IN (
          SELECT m.org_id
          FROM public.memberships m
          WHERE m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- UPDATE: Org members can update their org's requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'estimate_requests'
      AND policyname = 'estimate_requests_org_update'
  ) THEN
    CREATE POLICY estimate_requests_org_update ON public.estimate_requests
      FOR UPDATE
      USING (
        org_id IN (
          SELECT m.org_id
          FROM public.memberships m
          WHERE m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        org_id IN (
          SELECT m.org_id
          FROM public.memberships m
          WHERE m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- DELETE: Org members can delete their org's requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'estimate_requests'
      AND policyname = 'estimate_requests_org_delete'
  ) THEN
    CREATE POLICY estimate_requests_org_delete ON public.estimate_requests
      FOR DELETE
      USING (
        org_id IN (
          SELECT m.org_id
          FROM public.memberships m
          WHERE m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS estimate_requests_updated_at ON public.estimate_requests;

CREATE TRIGGER estimate_requests_updated_at
  BEFORE UPDATE ON public.estimate_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repair-estimates',
  'repair-estimates',
  false,  -- Private bucket
  10485760,  -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS "repair_estimates_org_read" ON storage.objects;
DROP POLICY IF EXISTS "repair_estimates_org_insert" ON storage.objects;

-- SELECT: Org members can read files in their org's folder
CREATE POLICY "repair_estimates_org_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'repair-estimates'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text
      FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Org members can upload to their org's folder
CREATE POLICY "repair_estimates_org_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'repair-estimates'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text
      FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Validate submission token (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_estimate_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  deal_id uuid,
  gc_name text,
  gc_email text,
  status text,
  token_expires_at timestamptz,
  property_address text,
  is_valid boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_deal RECORD;
BEGIN
  -- Find the request
  SELECT er.* INTO v_request
  FROM public.estimate_requests er
  WHERE er.submission_token = p_token
  LIMIT 1;

  -- Token not found
  IF v_request IS NULL THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::text,
      NULL::text, NULL::timestamptz, NULL::text,
      false, 'Token not found'::text;
    RETURN;
  END IF;

  -- Check if already submitted
  IF v_request.status IN ('submitted', 'cancelled') THEN
    RETURN QUERY SELECT
      v_request.id, v_request.org_id, v_request.deal_id,
      v_request.gc_name, v_request.gc_email, v_request.status,
      v_request.token_expires_at, NULL::text,
      false, ('Request already ' || v_request.status)::text;
    RETURN;
  END IF;

  -- Check if expired
  IF v_request.token_expires_at < now() THEN
    -- Update status to expired
    UPDATE public.estimate_requests
    SET status = 'expired', updated_at = now()
    WHERE estimate_requests.id = v_request.id;

    RETURN QUERY SELECT
      v_request.id, v_request.org_id, v_request.deal_id,
      v_request.gc_name, v_request.gc_email, 'expired'::text,
      v_request.token_expires_at, NULL::text,
      false, 'Token has expired'::text;
    RETURN;
  END IF;

  -- Get deal info (address column)
  SELECT d.address INTO v_deal
  FROM public.deals d
  WHERE d.id = v_request.deal_id;

  -- Mark as viewed if first view
  IF v_request.status IN ('pending', 'sent') THEN
    UPDATE public.estimate_requests
    SET status = 'viewed', viewed_at = now(), updated_at = now()
    WHERE estimate_requests.id = v_request.id;
  END IF;

  -- Return valid token info
  RETURN QUERY SELECT
    v_request.id, v_request.org_id, v_request.deal_id,
    v_request.gc_name, v_request.gc_email,
    CASE WHEN v_request.status IN ('pending', 'sent') THEN 'viewed' ELSE v_request.status END,
    v_request.token_expires_at, v_deal.address,
    true, NULL::text;
END;
$$;

COMMENT ON FUNCTION public.validate_estimate_token IS
  'Validates magic link token, marks as viewed, returns request info. SECURITY DEFINER for anon access.';

-- Grant execute to anon for portal access
GRANT EXECUTE ON FUNCTION public.validate_estimate_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_estimate_token(uuid) TO authenticated;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
