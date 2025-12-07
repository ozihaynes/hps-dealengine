---
doc_id: "engine.architecture-overview"
category: "engine"
audience: ["ai-assistant", "engineer", "exec"]
trust_tier: 1
summary: "Maps the Next.js app, Supabase Edge Functions, engine package, RLS model, and deterministic underwriting flow UI → Edge → DB."
---

# Engine & Architecture Overview — HPS DealEngine

## Purpose
- Define the underwriting engine’s role and how the system pieces fit together: Next.js app, Supabase Edge Functions, Postgres (RLS), `packages/engine`, evidence/repairs, and AI.
- Anchor determinism, auditability, and RLS as non-negotiables (see `docs/primer-hps-dealengine.md`, `docs/product/vision-and-positioning.md`).
- Provide developers and AI agents a concise map of execution flow, data boundaries, and extension guardrails.

## High-Level Architecture

| Component | Responsibility | Notes |
| --- | --- | --- |
| `apps/hps-dealengine` (Next.js App Router) | UI, routing, DealSession, auth guards, pages `/overview`, `/underwrite`, `/repairs`, `/trace`, `/sandbox`, `/settings`, `/deals`, `/runs` | Uses Edge Functions; no service-role usage in user flows. |
| Supabase Edge Functions | Domain APIs (underwriting, runs, repairs, evidence, AI bridge) | Examples below; all enforce JWT + RLS and call engine. |
| `supabase/functions/v1-analyze` | Underwriting entrypoint; resolves org/policy, calls `packages/engine`, returns outputs + trace | Deterministic; no persistence. |
| `supabase/functions/v1-runs-save` | Persists runs (inputs/output/trace/policy snapshot + hashes) | Enforces uniqueness/determinism; RLS-scoped. |
| `supabase/functions/v1-repair-rates`, `v1-repair-profiles` | Fetch/maintain repair rate profiles (org/market/posture) | Supplies PSF/Big5/line-item rates. |
| `supabase/functions/v1-evidence-*` | Evidence upload/start/view URLs | Org/role-scoped; evidence rows stored with RLS. |
| `supabase/functions/v1-ai-bridge` (strategist) | Advisory-only layer; reads outputs/trace, never recomputes math | Must cite engine outputs; no overrides. |
| `packages/engine` | Pure deterministic underwriting math + policy evaluation; emits outputs + trace | Bundled into `_vendor/engine` for Edge Functions. |
| Postgres (Supabase) | System of record: orgs, memberships, deals, runs, policies/policy_versions, sandbox_settings/presets, repair_rate_sets, evidence, audit_logs | RLS on all org-scoped tables. |

**Data flow (one pass)**: UI (/underwrite) → build AnalyzeInput + policy opts → `v1-analyze` → `packages/engine` → outputs/trace → user reviews → `v1-runs-save` persists → `/overview` & `/trace` read run/trace → AI (via `v1-ai-bridge`) explains using same run.

## Underwriting Execution Flow (UI → Engine → DB → UI)
1. User edits deal inputs (/underwrite, /repairs; DealSession provides org/deal/posture).
2. Client builds AnalyzeInput + sandbox/policy options; calls `v1-analyze` (JWT required).
3. `v1-analyze` resolves org + active policy, invokes `packages/engine`:
   - Returns `AnalyzeOutput` + `trace` (valuation, floors/ceilings, spreads, risk gates, timeline, strategy, repairs, evidence).
4. User can preview; to persist, client calls `v1-runs-save` with outputs/trace/policy snapshot/hashes/deal_id/posture.
5. `runs` row stored with hashes and metadata; RLS enforces org membership.
6. `/overview`, `/trace`, `/runs`, `/repairs` read latest run; `/sandbox` shows policy context; AI uses same outputs via `v1-ai-bridge` (no recompute).
7. Evidence and repairs profiles fetched as needed via `v1-evidence-*`, `v1-repair-*`.

Related docs: contracts (`docs/engine/analyze-contracts.md` planned), trace (`docs/engine/trace-anatomy.md` planned), domain policies (`docs/domain/*.md`).

## Determinism & Runs
- Guarantee: Same inputs + same policy snapshot → identical outputs and trace.
- `runs` store: org_id, deal_id, posture, input/output/trace, policy_snapshot, hashes (input/policy/output), workflow_state, created_by/at.
- Uniqueness/dedupe enforced via hashes (see devlog/roadmap for index details).
- External data: When connectors appear (MLS/tax/insurance), snapshotting (e.g., property_snapshots) is required to preserve determinism (CEO default until connectors land).
- Replay/regression: hashes + policy_versions enable reruns and comparison; future golden-replay harnesses align with roadmap v2/v3.

## Multi-Tenant Model & RLS
- Auth via Supabase JWT; org resolved via memberships; passed through Next.js → Edge → Postgres.
- RLS on org-scoped tables: organizations, memberships, deals, runs, policies/policy_versions, sandbox_settings/presets, repair_rate_sets, evidence, audit_logs, etc.
- Service role forbidden in user-facing flows (per `AGENTS.md`); only migrations/admin scripts/maintenance may use service role, separate from app/Edge code.

## Edge Function Inventory (v1)
- `v1-analyze`: Underwriting; input = deal + policy options; output = AnalyzeOutput + trace; no persistence.
- `v1-runs-save`: Persist run with hashes/policy snapshot/workflow_state; RLS enforced.
- `v1-repair-rates`: Return active repair profile (PSF/Big5/line items + meta).
- `v1-repair-profiles`: Manage/list/create/update repair profiles (org/market/posture); governed.
- `v1-evidence-start` / `v1-evidence-url`: Evidence metadata + signed URLs; org-scoped.
- `v1-ai-bridge`: AI advisory; uses contracts; must not invent numbers or bypass gates.
- Other sandbox/policy helpers (e.g., `v1-policy-get/put`, `v1-sandbox-*`) follow same JWT+RLS pattern.

## AI Integration Layer
- Position: Above engine/DB; reads runs, trace, policies, sandbox, evidence.
- Allowed: Explain KPIs/trace, summarize risks/evidence gaps, prep IC/negotiation briefs.
- Forbidden: Recompute MAO/spreads, override policies/knobs, bypass risk gates, write to core policy tables.
- Trust tiers: Must cite run/trace/policy/evidence; aligns with planned `docs/ai/data-sources-and-trust-tiers.md`.

## Extending the Engine & Edge Functions Safely
- New Edge Function:
  - Enforce JWT + RLS; no service role in user flows.
  - Preserve determinism: avoid unsnapshotted external calls; log/audit as needed.
  - Follow existing patterns for org resolution via memberships.
- New engine capabilities:
  - Add pure functions in `packages/engine`; update Analyze contracts if shape changes.
  - Emit trace frames for explainability; update trace docs.
  - Add tests (unit + contract) and doc updates (contracts, trace, knobs, this overview).
- No UI-only business logic for underwriting decisions; UI presents engine/Edge results only.

## Notes & CEO Defaults (when repo is silent)
- External connectors must snapshot data to preserve determinism when introduced.
- Hash uniqueness expected on `(org_id, posture, input_hash, policy_hash)`; if schema differs, keep the intent of dedupe + replay.
- Speed/Market Temp, carry, and spread policies are documented in domain docs and should be treated as single sources for business rules; UI should not diverge.
