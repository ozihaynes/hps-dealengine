-- 20251123172000_audit_logs_add_diff.sql
-- Ensure public.audit_logs has the "diff" column expected by audit_log_row_change().
-- Safe to run multiple times.

alter table public.audit_logs
  add column if not exists diff jsonb;