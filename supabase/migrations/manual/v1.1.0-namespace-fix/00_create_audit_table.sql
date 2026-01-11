-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration Audit Table
-- Purpose: Track all changes made by namespace migration for auditability
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS _migration_audit_v1_1_0 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  migration_step TEXT NOT NULL,
  field_path TEXT NOT NULL,
  value_before JSONB,
  value_after JSONB,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  migrated_by TEXT DEFAULT current_user
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_migration_audit_deal_id
  ON _migration_audit_v1_1_0(deal_id);

COMMENT ON TABLE _migration_audit_v1_1_0 IS
  'Audit trail for intake namespace migration v1.0.0 → v1.1.0. Delete after verification.';
