# Instructions & Norms

Documents loaded:
- AGENTS.md (repo root): agent protocol (policy-driven underwriting, full determinism, auditability, RLS-first/zero-trust, no service_role in user flows, vertical-slice delivery, AI advisory-only with Zod contracts).
- docs/primer-hps-dealengine.md: architecture primer (Next.js + Supabase; policies in Postgres; runs table hashes; audit trail; AI strategist only; vertical slices UI→Edge→DB→Trace).
- docs/roadmap-v1-v2-v3.md: current baseline + roadmap (v1 deterministic engine, evidence, UI; v1.1 hardening; v2 connectors/valuation spine; v3 AVM/CRM/billing). Notes v1 valuation spine with property_snapshots/valuation_runs, QA env, agent routes, no service_role in user flows.

Must-follow engineering rules (from above docs):
- Policy-driven rules live in Postgres policies/policy_versions; do not hardcode business logic in UI.
- Determinism: identical inputs + policy + engine version produce identical outputs/hashes; runs table dedup on (org_id, posture, input_hash, policy_hash).
- Auditability: log runs, policy versions, audit_logs triggers on org-scoped tables.
- RLS-first: every org/user table gated by memberships + auth.uid(); client/Edge use anon key + caller JWT; service_role only for admin/seed tooling.
- AI guardrails: AI outputs cannot invent numbers; must trace to engine/policy/evidence; contracts enforced via packages/contracts Zod schemas.
- Vertical slices: changes should span UI → Edge Function → DB/trace with tests; prefer canonical hashing/canonicalJson helpers for reproducibility.