# DB Schema & RLS

DB tech: Supabase Postgres with RLS; Edge Functions use anon key + caller JWT (verify_jwt implied). Canonical hashing via supabase/functions/_shared/contracts.ts.

Relevant schema/migrations:
- property_snapshots: supabase/migrations/20251212120000_property_snapshots_and_valuation_runs.sql lines 6-60. Columns include org_id, address_fingerprint, source/provider, comps jsonb, market jsonb, raw, stub, expires_at; indexes on (org_id,address_fingerprint,source,created_at); RLS select/insert policies require memberships.org_id=auth.uid(); append-only; audit_log_row_change trigger.
- valuation_runs: same migration lines 62-119. Columns org_id, deal_id, posture, address_fingerprint, property_snapshot_id, input/output/provenance JSON, status, failure_reason, hashes (input/output/policy/run), created_by/at; unique index idx_valuation_runs_dedupe (org_id, deal_id, posture, input_hash, coalesce(policy_hash,'')); RLS select/insert via memberships; append-only; audit trigger.
- Valuation policy defaults: supabase/migrations/20251212150000_valuation_policy_tokens_and_defaults.sql seeds valuation.min_closed_comps_required=3, snapshot_ttl_hours=24, confidence_rubric A/B/C; ensures valuation object exists in policies/policy_versions.
- Deals table (org-scoped) defined earlier (e.g., 20251109000708_org_deals_and_audit_rls.sql per roadmap) with RLS via memberships; used by valuation functions to read/update payload.market.*.
- Runs table (core engine): migrations 20251107130500_create_runs_if_missing.sql, 20251107130610_runs_policy_hash.sql, 20251108232942_runs_index_guard.sql define runs uniqueness on (org_id, posture, input_hash, policy_hash), hashes for determinism, RLS + audit (see docs/primer-hps-dealengine.md and supabase-schema dumps).

Service role usage search:
- Only in documentation/schema grants (AGENTS.md, primer, schema dumps under supabase-schema-*.sql) and admin scripts (tools/seed-qa-membership.ps1 prompt). No service_role usage in client/Edge code paths inspected (valuation functions use anon client with caller Authorization).
- Classification: occurrences are backend/admin-only guidance; no user-flow risk detected.