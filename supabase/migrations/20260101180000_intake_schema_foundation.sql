-- ============================================================================
-- MIGRATION: 20260101180000_intake_schema_foundation.sql
-- FEATURE: CLIENT-INTAKE-AUTOFILL-v1 (Slice 1: Config-First Foundation)
-- DESCRIPTION: Creates intake schema tables with RLS, audit triggers, and
--              immutability enforcement for deterministic client data intake.
-- ============================================================================

-- ============================================================================
-- 1. INTAKE_SCHEMA_VERSIONS (Config-first schema definitions)
-- ============================================================================
-- Stores versioned form schemas and field mappings. Immutable after creation.
-- Only one active version per org at a time.

CREATE TABLE IF NOT EXISTS public.intake_schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Versioning
    semantic_version TEXT NOT NULL,  -- e.g., "1.0.0", "1.1.0"
    display_name TEXT NOT NULL,       -- e.g., "Standard Client Intake v1"
    description TEXT,
    
    -- Schema definitions (immutable after creation)
    schema_public_json JSONB NOT NULL,    -- Client-rendered form definition (fields, validation, UI hints)
    mapping_private_json JSONB NOT NULL,  -- Staff-only mapping rules (source → target deal paths)
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT false,  -- Only 1 active per org
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(org_id, semantic_version)
);

-- Index for active version lookup (hot path)
CREATE INDEX IF NOT EXISTS idx_intake_schema_versions_org_active 
    ON public.intake_schema_versions(org_id, is_active) WHERE is_active = true;

-- RLS: Staff (authenticated) can read/write for their org
ALTER TABLE public.intake_schema_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_schema_versions_select_org_members" ON public.intake_schema_versions
    FOR SELECT TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_schema_versions_insert_org_members" ON public.intake_schema_versions
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- IMMUTABILITY TRIGGER: Prevent updates to schema/mapping JSON after creation
CREATE OR REPLACE FUNCTION public.intake_schema_versions_immutable_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.schema_public_json IS DISTINCT FROM NEW.schema_public_json THEN
        RAISE EXCEPTION 'Cannot modify schema_public_json after creation (immutable)';
    END IF;
    IF OLD.mapping_private_json IS DISTINCT FROM NEW.mapping_private_json THEN
        RAISE EXCEPTION 'Cannot modify mapping_private_json after creation (immutable)';
    END IF;
    IF OLD.semantic_version IS DISTINCT FROM NEW.semantic_version THEN
        RAISE EXCEPTION 'Cannot modify semantic_version after creation (immutable)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_intake_schema_versions_immutable
    BEFORE UPDATE ON public.intake_schema_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.intake_schema_versions_immutable_guard();

-- ACTIVE VERSION ENFORCEMENT: Ensure only one active version per org
CREATE OR REPLACE FUNCTION public.intake_schema_versions_active_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        -- Deactivate any other active versions for this org
        UPDATE public.intake_schema_versions
        SET is_active = false
        WHERE org_id = NEW.org_id 
          AND id != NEW.id 
          AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_intake_schema_versions_active_enforcement
    BEFORE INSERT OR UPDATE OF is_active ON public.intake_schema_versions
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION public.intake_schema_versions_active_guard();

-- Audit trigger (uses existing audit_log_row_change function)
CREATE TRIGGER trg_intake_schema_versions_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.intake_schema_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_row_change();


-- ============================================================================
-- 2. INTAKE_LINKS (Token-gated access links)
-- ============================================================================
-- Stores hashed tokens for public client access. Links expire and are one-time-use.

CREATE TYPE public.intake_link_status AS ENUM (
    'SENT',
    'IN_PROGRESS',
    'SUBMITTED',
    'EXPIRED',
    'REVOKED',
    'REJECTED'
);

CREATE TABLE IF NOT EXISTS public.intake_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    intake_schema_version_id UUID NOT NULL REFERENCES public.intake_schema_versions(id),
    
    -- Recipient
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    
    -- Token security (NEVER store plaintext - SHA-256 hash only)
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Lifecycle
    status public.intake_link_status NOT NULL DEFAULT 'SENT',
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,  -- Set when submission completes (one-time-use)
    
    -- Rate limiting
    send_count INTEGER NOT NULL DEFAULT 1,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Email tracking (optional)
    email_send_id TEXT,  -- Resend API message ID
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for hot paths
CREATE INDEX IF NOT EXISTS idx_intake_links_token_hash ON public.intake_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_intake_links_org_deal ON public.intake_links(org_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_intake_links_org_status ON public.intake_links(org_id, status);

-- RLS: Staff can manage, anon can read via token
ALTER TABLE public.intake_links ENABLE ROW LEVEL SECURITY;

-- Staff: org-scoped access
CREATE POLICY "intake_links_select_org_members" ON public.intake_links
    FOR SELECT TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_links_insert_org_members" ON public.intake_links
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_links_update_org_members" ON public.intake_links
    FOR UPDATE TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Anon: token-gated read access (for public form)
-- Token passed via header: x-intake-token
CREATE POLICY "intake_links_select_by_token" ON public.intake_links
    FOR SELECT TO anon
    USING (
        token_hash = encode(
            sha256(
                convert_to(
                    coalesce(
                        current_setting('request.headers', true)::json->>'x-intake-token',
                        ''
                    ),
                    'UTF8'
                )
            ),
            'hex'
        )
        AND status IN ('SENT', 'IN_PROGRESS')
        AND expires_at > now()
    );

-- Updated_at trigger
CREATE TRIGGER trg_intake_links_updated_at
    BEFORE UPDATE ON public.intake_links
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_set_updated_at();

-- Audit trigger
CREATE TRIGGER trg_intake_links_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.intake_links
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_row_change();


-- ============================================================================
-- 3. INTAKE_SUBMISSIONS (Client submissions - immutable after SUBMITTED)
-- ============================================================================

CREATE TYPE public.intake_submission_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'PENDING_REVIEW',
    'REVISION_REQUESTED',
    'COMPLETED',
    'REJECTED',
    'ARCHIVED'
);

CREATE TYPE public.intake_submission_source AS ENUM (
    'public_token',
    'staff_assisted'
);

CREATE TABLE IF NOT EXISTS public.intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    intake_link_id UUID REFERENCES public.intake_links(id),
    intake_schema_version_id UUID NOT NULL REFERENCES public.intake_schema_versions(id),
    
    -- Source tracking
    source public.intake_submission_source NOT NULL DEFAULT 'public_token',
    
    -- Payload (immutable after SUBMITTED status)
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload_hash TEXT,  -- SHA-256 of canonicalized payload (set on submit)
    
    -- Status lifecycle
    status public.intake_submission_status NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    submitted_by_user_id UUID REFERENCES auth.users(id),  -- For staff_assisted
    completed_at TIMESTAMPTZ,
    
    -- Revision tracking
    prior_submission_id UUID REFERENCES public.intake_submissions(id),
    revision_cycle INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intake_submissions_org_deal ON public.intake_submissions(org_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_org_status ON public.intake_submissions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_link ON public.intake_submissions(intake_link_id);

-- RLS
ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;

-- Staff: org-scoped full access
CREATE POLICY "intake_submissions_select_org_members" ON public.intake_submissions
    FOR SELECT TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_submissions_insert_org_members" ON public.intake_submissions
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_submissions_update_org_members" ON public.intake_submissions
    FOR UPDATE TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Anon: token-gated access (read own submission, insert/update drafts)
CREATE POLICY "intake_submissions_select_by_token" ON public.intake_submissions
    FOR SELECT TO anon
    USING (
        intake_link_id IN (
            SELECT id FROM public.intake_links
            WHERE token_hash = encode(
                sha256(
                    convert_to(
                        coalesce(
                            current_setting('request.headers', true)::json->>'x-intake-token',
                            ''
                        ),
                        'UTF8'
                    )
                ),
                'hex'
            )
            AND expires_at > now()
        )
    );

CREATE POLICY "intake_submissions_insert_by_token" ON public.intake_submissions
    FOR INSERT TO anon
    WITH CHECK (
        intake_link_id IN (
            SELECT id FROM public.intake_links
            WHERE token_hash = encode(
                sha256(
                    convert_to(
                        coalesce(
                            current_setting('request.headers', true)::json->>'x-intake-token',
                            ''
                        ),
                        'UTF8'
                    )
                ),
                'hex'
            )
            AND status IN ('SENT', 'IN_PROGRESS')
            AND expires_at > now()
        )
    );

CREATE POLICY "intake_submissions_update_by_token" ON public.intake_submissions
    FOR UPDATE TO anon
    USING (
        status = 'DRAFT'  -- Can only update drafts
        AND intake_link_id IN (
            SELECT id FROM public.intake_links
            WHERE token_hash = encode(
                sha256(
                    convert_to(
                        coalesce(
                            current_setting('request.headers', true)::json->>'x-intake-token',
                            ''
                        ),
                        'UTF8'
                    )
                ),
                'hex'
            )
            AND status IN ('SENT', 'IN_PROGRESS')
            AND expires_at > now()
        )
    );

-- IMMUTABILITY TRIGGER: Freeze payload after SUBMITTED
CREATE OR REPLACE FUNCTION public.intake_submissions_immutable_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- If transitioning away from DRAFT, freeze the payload
    IF OLD.status = 'DRAFT' AND NEW.status != 'DRAFT' THEN
        -- Compute payload hash on submit
        NEW.payload_hash := encode(
            sha256(convert_to(NEW.payload_json::text, 'UTF8')),
            'hex'
        );
        NEW.submitted_at := now();
    END IF;
    
    -- If already submitted, prevent payload changes
    IF OLD.status != 'DRAFT' AND OLD.payload_json IS DISTINCT FROM NEW.payload_json THEN
        RAISE EXCEPTION 'Cannot modify payload_json after submission (immutable)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_intake_submissions_immutable
    BEFORE UPDATE ON public.intake_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.intake_submissions_immutable_guard();

-- Updated_at trigger
CREATE TRIGGER trg_intake_submissions_updated_at
    BEFORE UPDATE ON public.intake_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_set_updated_at();

-- Audit trigger
CREATE TRIGGER trg_intake_submissions_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.intake_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_row_change();


-- ============================================================================
-- 4. INTAKE_SUBMISSION_FILES (Evidence uploads - quarantine model)
-- ============================================================================

CREATE TYPE public.intake_file_storage_state AS ENUM (
    'QUARANTINE',
    'CLEAN',
    'INFECTED',
    'REJECTED'
);

CREATE TYPE public.intake_file_scan_status AS ENUM (
    'PENDING',
    'CLEAN',
    'INFECTED',
    'SCAN_FAILED'
);

CREATE TABLE IF NOT EXISTS public.intake_submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    intake_submission_id UUID NOT NULL REFERENCES public.intake_submissions(id) ON DELETE CASCADE,
    intake_link_id UUID REFERENCES public.intake_links(id),
    
    -- Storage location
    bucket_id TEXT NOT NULL DEFAULT 'intake',
    object_key TEXT NOT NULL,  -- intake/quarantine/{submission_id}/{file_id}.{ext}
    
    -- File metadata
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    
    -- Security states
    storage_state public.intake_file_storage_state NOT NULL DEFAULT 'QUARANTINE',
    scan_status public.intake_file_scan_status NOT NULL DEFAULT 'PENDING',
    scanned_at TIMESTAMPTZ,
    scan_details_json JSONB,
    
    -- Evidence conversion (after populate)
    converted_to_evidence_id UUID,  -- FK to evidence table after promotion
    converted_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(bucket_id, object_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intake_submission_files_submission 
    ON public.intake_submission_files(intake_submission_id);
CREATE INDEX IF NOT EXISTS idx_intake_submission_files_org_deal 
    ON public.intake_submission_files(org_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_intake_submission_files_scan_status 
    ON public.intake_submission_files(scan_status) WHERE scan_status = 'PENDING';

-- RLS
ALTER TABLE public.intake_submission_files ENABLE ROW LEVEL SECURITY;

-- Staff: org-scoped full access
CREATE POLICY "intake_submission_files_select_org_members" ON public.intake_submission_files
    FOR SELECT TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_submission_files_insert_org_members" ON public.intake_submission_files
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_submission_files_update_org_members" ON public.intake_submission_files
    FOR UPDATE TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Anon: token-gated insert (for uploads)
CREATE POLICY "intake_submission_files_insert_by_token" ON public.intake_submission_files
    FOR INSERT TO anon
    WITH CHECK (
        intake_link_id IN (
            SELECT id FROM public.intake_links
            WHERE token_hash = encode(
                sha256(
                    convert_to(
                        coalesce(
                            current_setting('request.headers', true)::json->>'x-intake-token',
                            ''
                        ),
                        'UTF8'
                    )
                ),
                'hex'
            )
            AND status IN ('SENT', 'IN_PROGRESS')
            AND expires_at > now()
        )
    );

-- Anon: token-gated read (own files)
CREATE POLICY "intake_submission_files_select_by_token" ON public.intake_submission_files
    FOR SELECT TO anon
    USING (
        intake_link_id IN (
            SELECT id FROM public.intake_links
            WHERE token_hash = encode(
                sha256(
                    convert_to(
                        coalesce(
                            current_setting('request.headers', true)::json->>'x-intake-token',
                            ''
                        ),
                        'UTF8'
                    )
                ),
                'hex'
            )
            AND expires_at > now()
        )
    );

-- Updated_at trigger
CREATE TRIGGER trg_intake_submission_files_updated_at
    BEFORE UPDATE ON public.intake_submission_files
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_set_updated_at();

-- Audit trigger
CREATE TRIGGER trg_intake_submission_files_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.intake_submission_files
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_row_change();


-- ============================================================================
-- 5. INTAKE_POPULATION_EVENTS (Deterministic + idempotent population log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.intake_population_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    intake_submission_id UUID NOT NULL REFERENCES public.intake_submissions(id),
    
    -- Idempotency enforcement
    idempotency_key TEXT NOT NULL UNIQUE,  -- SHA-256(submission_id + payload_hash + mapping_version + overwrite_mode)
    
    -- Population config
    overwrite_mode TEXT NOT NULL DEFAULT 'skip',  -- 'skip' | 'overwrite'
    overwrite_reasons_json JSONB,  -- Required if overwrite_mode = 'overwrite'
    
    -- Results (for audit + replay)
    field_results_json JSONB NOT NULL,  -- [{field_key, target_path, value_before, value_after, action, reason}]
    summary_json JSONB NOT NULL,        -- {created_count, skipped_count, overwritten_count, error_count, evidence_converted_count}
    
    -- Audit
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intake_population_events_submission 
    ON public.intake_population_events(intake_submission_id);
CREATE INDEX IF NOT EXISTS idx_intake_population_events_org_deal 
    ON public.intake_population_events(org_id, deal_id);

-- RLS: Staff only (no anon access to population events)
ALTER TABLE public.intake_population_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_population_events_select_org_members" ON public.intake_population_events
    FOR SELECT TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_population_events_insert_org_members" ON public.intake_population_events
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Audit trigger
CREATE TRIGGER trg_intake_population_events_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.intake_population_events
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_row_change();


-- ============================================================================
-- 6. INTAKE_REVISION_REQUESTS (Revision tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.intake_revision_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    intake_submission_id UUID NOT NULL REFERENCES public.intake_submissions(id),
    
    -- Request details
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    request_notes TEXT NOT NULL,
    
    -- New link for revision
    new_link_id UUID REFERENCES public.intake_links(id),
    
    -- Response tracking
    responded_at TIMESTAMPTZ,  -- When client submitted revision
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intake_revision_requests_submission 
    ON public.intake_revision_requests(intake_submission_id);

-- RLS: Staff only
ALTER TABLE public.intake_revision_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_revision_requests_select_org_members" ON public.intake_revision_requests
    FOR SELECT TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_revision_requests_insert_org_members" ON public.intake_revision_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Audit trigger
CREATE TRIGGER trg_intake_revision_requests_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.intake_revision_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_row_change();


-- ============================================================================
-- 7. INTAKE_REJECTIONS (Rejection tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.intake_rejections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    intake_submission_id UUID NOT NULL REFERENCES public.intake_submissions(id),
    
    -- Rejection details
    rejected_by UUID NOT NULL REFERENCES auth.users(id),
    rejection_reason TEXT NOT NULL,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intake_rejections_submission 
    ON public.intake_rejections(intake_submission_id);

-- RLS: Staff only
ALTER TABLE public.intake_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_rejections_select_org_members" ON public.intake_rejections
    FOR SELECT TO authenticated
    USING (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "intake_rejections_insert_org_members" ON public.intake_rejections
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Audit trigger
CREATE TRIGGER trg_intake_rejections_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.intake_rejections
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_row_change();


-- ============================================================================
-- 8. PUBLIC VIEWS (Safe for anon - no private mapping data)
-- ============================================================================

-- Public-safe view of schema versions (excludes mapping_private_json)
CREATE OR REPLACE VIEW public.intake_schema_versions_public AS
SELECT 
    id,
    org_id,
    semantic_version,
    display_name,
    description,
    schema_public_json,
    -- mapping_private_json explicitly excluded
    is_active,
    created_at
FROM public.intake_schema_versions;

-- Grant anon access to public view
GRANT SELECT ON public.intake_schema_versions_public TO anon;

-- Public-safe view of links (excludes token_hash for non-matching queries)
CREATE OR REPLACE VIEW public.intake_links_public AS
SELECT 
    id,
    org_id,
    deal_id,
    intake_schema_version_id,
    recipient_name,  -- Include name for personalization
    status,
    expires_at,
    created_at
FROM public.intake_links;

-- Note: RLS on base table still enforces token-gated access


-- ============================================================================
-- 9. STORAGE BUCKET POLICIES (for intake file uploads)
-- ============================================================================

-- Create intake bucket if not exists (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'intake',
--     'intake',
--     false,  -- Private bucket
--     26214400,  -- 25MB limit
--     ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies will be added in a separate migration after bucket creation


-- ============================================================================
-- 10. SEED: Default schema version for dev org (optional - comment out for prod)
-- ============================================================================

-- Uncomment and adjust org_id for local dev seeding:
/*
INSERT INTO public.intake_schema_versions (
    org_id,
    semantic_version,
    display_name,
    description,
    schema_public_json,
    mapping_private_json,
    is_active,
    created_by
)
VALUES (
    '033ff93d-ff97-4af9-b3a1-a114d3c04da6',  -- Dev org ID
    '1.0.0',
    'Standard Client Intake v1',
    'Initial intake form for distressed SFR deals - collects seller info, property details, and financial situation.',
    '{
        "version": "1.0.0",
        "title": "Property Information Form",
        "sections": [
            {
                "id": "seller_info",
                "title": "Seller Information",
                "fields": [
                    {"key": "seller_name", "label": "Full Name", "type": "text", "required": true},
                    {"key": "seller_email", "label": "Email Address", "type": "email", "required": true},
                    {"key": "seller_phone", "label": "Phone Number", "type": "phone", "required": true},
                    {"key": "seller_address", "label": "Current Address", "type": "text", "required": false}
                ]
            },
            {
                "id": "property_info",
                "title": "Property Details",
                "fields": [
                    {"key": "property_address", "label": "Property Address", "type": "text", "required": true},
                    {"key": "property_city", "label": "City", "type": "text", "required": true},
                    {"key": "property_state", "label": "State", "type": "select", "required": true, "options": ["FL"]},
                    {"key": "property_zip", "label": "ZIP Code", "type": "text", "required": true},
                    {"key": "property_type", "label": "Property Type", "type": "select", "required": true, "options": ["Single Family", "Townhome", "Condo"]},
                    {"key": "bedrooms", "label": "Bedrooms", "type": "number", "required": true},
                    {"key": "bathrooms", "label": "Bathrooms", "type": "number", "required": true},
                    {"key": "sqft", "label": "Square Footage", "type": "number", "required": false},
                    {"key": "year_built", "label": "Year Built", "type": "number", "required": false}
                ]
            },
            {
                "id": "financial_info",
                "title": "Financial Situation",
                "fields": [
                    {"key": "asking_price", "label": "Asking Price", "type": "currency", "required": false},
                    {"key": "mortgage_balance", "label": "Mortgage Balance Owed", "type": "currency", "required": false},
                    {"key": "monthly_payment", "label": "Monthly Mortgage Payment", "type": "currency", "required": false},
                    {"key": "behind_on_payments", "label": "Behind on Payments?", "type": "select", "required": false, "options": ["No", "1-2 months", "3-6 months", "6+ months"]},
                    {"key": "in_foreclosure", "label": "Currently in Foreclosure?", "type": "boolean", "required": true},
                    {"key": "foreclosure_sale_date", "label": "Foreclosure Sale Date", "type": "date", "required": false}
                ]
            },
            {
                "id": "condition_info",
                "title": "Property Condition",
                "fields": [
                    {"key": "overall_condition", "label": "Overall Condition", "type": "select", "required": true, "options": ["Excellent", "Good", "Fair", "Poor", "Needs Major Repairs"]},
                    {"key": "roof_age", "label": "Roof Age (years)", "type": "number", "required": false},
                    {"key": "hvac_age", "label": "HVAC Age (years)", "type": "number", "required": false},
                    {"key": "repair_notes", "label": "Known Repairs Needed", "type": "textarea", "required": false}
                ]
            },
            {
                "id": "motivation_info",
                "title": "Selling Situation",
                "fields": [
                    {"key": "reason_for_selling", "label": "Reason for Selling", "type": "select", "required": true, "options": ["Foreclosure", "Divorce", "Relocation", "Inherited", "Financial Hardship", "Other"]},
                    {"key": "timeline", "label": "Desired Timeline", "type": "select", "required": true, "options": ["ASAP", "30 days", "60 days", "90+ days", "Flexible"]},
                    {"key": "additional_notes", "label": "Anything Else We Should Know?", "type": "textarea", "required": false}
                ]
            }
        ],
        "evidence_uploads": [
            {"key": "photos", "label": "Property Photos", "accept": ["image/jpeg", "image/png"], "max_files": 10, "required": false},
            {"key": "mortgage_statement", "label": "Recent Mortgage Statement", "accept": ["application/pdf", "image/jpeg", "image/png"], "max_files": 2, "required": false},
            {"key": "foreclosure_docs", "label": "Foreclosure Documents (if applicable)", "accept": ["application/pdf"], "max_files": 5, "required": false}
        ]
    }'::jsonb,
    '{
        "version": "1.0.0",
        "mappings": [
            {"source_field_key": "seller_name", "target_deal_path": "payload.client.name", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "seller_email", "target_deal_path": "payload.client.email", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "seller_phone", "target_deal_path": "payload.client.phone", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "property_address", "target_deal_path": "address", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "property_city", "target_deal_path": "city", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "property_state", "target_deal_path": "state", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "property_zip", "target_deal_path": "zip", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "property_type", "target_deal_path": "payload.property.type", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "bedrooms", "target_deal_path": "payload.property.bedrooms", "transform": "parseInt", "overwrite_policy": "skip"},
            {"source_field_key": "bathrooms", "target_deal_path": "payload.property.bathrooms", "transform": "parseFloat", "overwrite_policy": "skip"},
            {"source_field_key": "sqft", "target_deal_path": "payload.property.sqft", "transform": "parseInt", "overwrite_policy": "skip"},
            {"source_field_key": "year_built", "target_deal_path": "payload.property.year_built", "transform": "parseInt", "overwrite_policy": "skip"},
            {"source_field_key": "asking_price", "target_deal_path": "payload.financial.asking_price", "transform": "parseCurrency", "overwrite_policy": "skip"},
            {"source_field_key": "mortgage_balance", "target_deal_path": "payload.financial.mortgage_balance", "transform": "parseCurrency", "overwrite_policy": "skip"},
            {"source_field_key": "monthly_payment", "target_deal_path": "payload.financial.monthly_payment", "transform": "parseCurrency", "overwrite_policy": "skip"},
            {"source_field_key": "behind_on_payments", "target_deal_path": "payload.financial.behind_on_payments", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "in_foreclosure", "target_deal_path": "payload.financial.in_foreclosure", "transform": "parseBoolean", "overwrite_policy": "skip"},
            {"source_field_key": "foreclosure_sale_date", "target_deal_path": "payload.financial.foreclosure_sale_date", "transform": "parseDate", "overwrite_policy": "skip"},
            {"source_field_key": "overall_condition", "target_deal_path": "payload.condition.overall", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "roof_age", "target_deal_path": "payload.condition.roof_age_years", "transform": "parseInt", "overwrite_policy": "skip"},
            {"source_field_key": "hvac_age", "target_deal_path": "payload.condition.hvac_age_years", "transform": "parseInt", "overwrite_policy": "skip"},
            {"source_field_key": "repair_notes", "target_deal_path": "payload.condition.repair_notes", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "reason_for_selling", "target_deal_path": "payload.motivation.reason", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "timeline", "target_deal_path": "payload.motivation.timeline", "transform": null, "overwrite_policy": "skip"},
            {"source_field_key": "additional_notes", "target_deal_path": "payload.motivation.notes", "transform": null, "overwrite_policy": "skip"}
        ],
        "evidence_mappings": [
            {"source_upload_key": "photos", "target_evidence_kind": "property_photos"},
            {"source_upload_key": "mortgage_statement", "target_evidence_kind": "mortgage_statement"},
            {"source_upload_key": "foreclosure_docs", "target_evidence_kind": "foreclosure_docs"}
        ]
    }'::jsonb,
    true,  -- is_active
    NULL   -- created_by (system seed)
)
ON CONFLICT (org_id, semantic_version) DO NOTHING;
*/


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created:
--   1. intake_schema_versions (immutable schemas + mappings)
--   2. intake_links (token-gated access)
--   3. intake_submissions (client payloads, immutable after submit)
--   4. intake_submission_files (quarantine + scan model)
--   5. intake_population_events (deterministic population log)
--   6. intake_revision_requests (revision tracking)
--   7. intake_rejections (rejection tracking)
--
-- Security:
--   - RLS enabled on all tables
--   - Staff access via org membership
--   - Anon access via token hash (header-based)
--   - Immutability triggers prevent tampering
--   - Audit triggers on all tables
--
-- Next steps:
--   - Create storage bucket 'intake' with size/type limits
--   - Add storage.objects RLS policies
--   - Deploy Edge Functions for API endpoints
--   - Build UI components
-- ============================================================================
