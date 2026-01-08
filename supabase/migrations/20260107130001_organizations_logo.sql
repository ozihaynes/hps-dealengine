-- Migration: Add logo_url and updated_at to organizations
-- Slice: 3 (Business Settings & Logo)

-- Add logo_url column
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add updated_at column with auto-update trigger
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Comment for documentation
COMMENT ON COLUMN organizations.logo_url IS 'Public URL to org logo in org-assets bucket';
COMMENT ON COLUMN organizations.updated_at IS 'Auto-updated timestamp on any change';
