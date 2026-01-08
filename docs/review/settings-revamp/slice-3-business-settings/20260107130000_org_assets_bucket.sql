-- Migration: Create org-assets storage bucket for logos
-- Slice: 3 (Business Settings & Logo)
-- Security: Public read (for header display), VP-only upload

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-assets',
  'org-assets',
  true,  -- Public read for logo display in header
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: Only VP can upload/update/delete logos
-- Path format: {org_id}/logo.{ext}

-- Policy: VP can insert logos for their org
-- P1-001 FIX: Add DROP IF EXISTS for idempotency
DROP POLICY IF EXISTS "VP can upload org logos" ON storage.objects;
CREATE POLICY "VP can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
);

-- Policy: VP can update logos for their org
DROP POLICY IF EXISTS "VP can update org logos" ON storage.objects;
CREATE POLICY "VP can update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
)
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
);

-- Policy: VP can delete logos for their org
DROP POLICY IF EXISTS "VP can delete org logos" ON storage.objects;
CREATE POLICY "VP can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
);

-- Policy: Anyone can read org logos (public bucket)
DROP POLICY IF EXISTS "Anyone can read org logos" ON storage.objects;
CREATE POLICY "Anyone can read org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-assets');
