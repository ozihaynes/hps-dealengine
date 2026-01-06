-- Rollback Migration: 20260102000001_dashboard_snapshots_rollback.sql
-- Purpose: Rollback dashboard_snapshots table (use only if needed)
-- Author: Claude Code
-- Date: 2026-01-02
--
-- USAGE: Only execute this migration if you need to completely remove
-- the dashboard_snapshots table. This is a destructive operation.
--
-- To execute: Rename this file to remove the _rollback suffix and run
-- supabase db push, OR execute directly in SQL Editor.

-- Drop trigger first
DROP TRIGGER IF EXISTS dashboard_snapshots_updated_at ON public.dashboard_snapshots;

-- Drop RLS policy
DROP POLICY IF EXISTS "dashboard_snapshots_org_isolation" ON public.dashboard_snapshots;

-- Drop indexes
DROP INDEX IF EXISTS idx_dashboard_snapshots_deal_latest;
DROP INDEX IF EXISTS idx_dashboard_snapshots_portfolio;
DROP INDEX IF EXISTS idx_dashboard_snapshots_as_of;
DROP INDEX IF EXISTS idx_dashboard_snapshots_urgency_band;
DROP INDEX IF EXISTS idx_dashboard_snapshots_verdict;
DROP INDEX IF EXISTS idx_dashboard_snapshots_run_id;
DROP INDEX IF EXISTS idx_dashboard_snapshots_deal_id;
DROP INDEX IF EXISTS idx_dashboard_snapshots_org_id;

-- Drop table
DROP TABLE IF EXISTS public.dashboard_snapshots;
