-- ============================================================================
-- MIGRATION: 20260101190000_intake_storage_bucket.sql
-- FEATURE: CLIENT-INTAKE-AUTOFILL-v1 (Slice 6: File Upload Flow)
-- DESCRIPTION: Creates intake storage bucket with RLS policies for file uploads
-- ============================================================================

-- ============================================================================
-- 1. CREATE INTAKE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'intake',
    'intake',
    false,  -- Private bucket
    26214400,  -- 25MB limit
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================================

-- Policy: Anon users can upload to quarantine folder
-- Note: Actual token validation happens in Edge Function before returning signed URL
CREATE POLICY "intake_anon_upload_quarantine" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
    bucket_id = 'intake'
    AND (storage.foldername(name))[1] = 'quarantine'
);

-- Policy: Anon users can update their own uploads (for resumable uploads)
CREATE POLICY "intake_anon_update_quarantine" ON storage.objects
FOR UPDATE TO anon
USING (
    bucket_id = 'intake'
    AND (storage.foldername(name))[1] = 'quarantine'
)
WITH CHECK (
    bucket_id = 'intake'
    AND (storage.foldername(name))[1] = 'quarantine'
);

-- Policy: Staff (authenticated) can read all intake files
CREATE POLICY "intake_staff_select" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'intake'
    AND EXISTS (
        SELECT 1 FROM public.intake_submission_files isf
        JOIN public.memberships m ON m.org_id = isf.org_id
        WHERE m.user_id = auth.uid()
        AND isf.object_key = name
    )
);

-- Policy: Staff can delete files (for cleanup)
CREATE POLICY "intake_staff_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'intake'
    AND EXISTS (
        SELECT 1 FROM public.intake_submission_files isf
        JOIN public.memberships m ON m.org_id = isf.org_id
        WHERE m.user_id = auth.uid()
        AND isf.object_key = name
    )
);

-- Policy: Service role (Edge Functions) has full access
-- This is implicit via service role key, no explicit policy needed

-- ============================================================================
-- 3. HELPER FUNCTION FOR FILE DELETION CLEANUP
-- ============================================================================

-- Function to delete orphaned files from storage when intake_submission_files row is deleted
CREATE OR REPLACE FUNCTION public.intake_file_cleanup_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Note: Actual storage deletion should be done via Edge Function
    -- This trigger just logs for audit purposes
    RAISE NOTICE 'Intake file deleted: bucket=%, key=%', OLD.bucket_id, OLD.object_key;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cleanup logging
CREATE TRIGGER trg_intake_submission_files_cleanup
    BEFORE DELETE ON public.intake_submission_files
    FOR EACH ROW
    EXECUTE FUNCTION public.intake_file_cleanup_trigger();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
--   1. Storage bucket 'intake' with 25MB limit and allowed MIME types
--   2. RLS policies:
--      - Anon can upload to quarantine folder
--      - Staff can read files for their org
--      - Staff can delete files for their org
--   3. Cleanup trigger for file deletion logging
-- ============================================================================
