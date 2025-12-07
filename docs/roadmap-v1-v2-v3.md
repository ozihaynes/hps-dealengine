# HPS DealEngine - Roadmap v1 / v2 / v3 (Updated 2025-12-15)

---

## 0 Alignment Check (Whats Already True in the Repo / DB)

This section is the grounding layer: it describes what already exists and is working in the repo and database. Everything else in this roadmap assumes these pieces are real and should **not** be re-invented from scratch.

When reading this as an agent (Codex / ChatGPT), treat this section as **facts about the current system**.

---

QA/E2E readiness: `docs/QA_ENV_V1.md` documents QA Supabase setup + env vars; Playwright specs (golden path, timeline/carry, risk/evidence) follow the v1 IA and skip cleanly when QA env is absent.

### 0.1 Key Tables Present

The following tables are **live with RLS and real data** and must be treated as the backbone of the system:

- `organizations` and `memberships`

  - Multi-tenant backbone: users belong to orgs via `memberships (org_id, user_id, role)`.
  - RLS consistently uses the pattern: `auth.uid()` joined through `memberships` to scope all org data.

- `runs`

  - Canonical execution log for engine runs.
  - Stores `org_id`, posture, `deal_id`, raw `input`, `output`, `trace`, `policy_snapshot`, plus deterministic hashes:

    - `input_hash`
    - `output_hash`
    - `policy_hash`

  - Uniqueness constraint on `(org_id, posture, input_hash, policy_hash)` enforces deterministic dedupe/replay.

- `repair_rate_sets` (and related normalized structures)

  - Live schema seeded with investor-grade ORL defaults per org/market.
  - ORL/base profiles normalized via migrations to maintain a single active+default profile per org/market/posture, with canonical profiles seeded for the deals org.
  - Used by `v1-repair-rates` to serve:

    - PSF tiers (light/medium/heavy).
    - Big 5 budget killers (roof, HVAC, repipe, electrical, foundation).

  - RLS tied to `organizations` + `memberships`.
  - Audit trigger wired into `audit_logs`.

- Canonical org-scoped deals table (from `20251109000708_org_deals_and_audit_rls.sql`)

  - This is the **single Source of Truth** for deals in v1.
  - Every underwrite, run, evidence artifact, and policy decision ultimately anchors to a row in this table.
  - Includes:

    - Identity: `id`, `org_id`.
    - Audit: `created_by`, `created_at`, `updated_at`.
    - Core deal fields (address, city, state, zip).
    - Normalized `payload` JSON for structured deal facts.

- `policies`, `policy_versions`, and `policy_versions_api` view

  - Store active/current policy JSON per org/posture and historical versions.
  - RLS applied so policies are org-scoped and posture-aware.
  - `policy_versions_api` is used by edge functions to consume policy snapshots.

- `user_settings` (new in this session)

  - Live table created by `20251128093000_user_settings.sql` migration.
  - Columns (high-level):

    - `id`, `org_id`, `user_id`
    - Preference fields: `default_posture`, `default_market`, `theme`, `ui_prefs`
    - Audit: `created_at`, `updated_at`

  - RLS:

    - Users can only see/update settings for `user_id = auth.uid()` within orgs where they have memberships.

  - Audit:

    - Tied into shared `audit_log_row_change()` trigger and `audit_logs` table.

- `sandbox_settings` (org/posture scoped)

  - Created by `20251128171500_sandbox_settings.sql`.
  - Columns: `id`, `org_id`, `posture`, `config` JSONB, `created_at`, `updated_at`.
  - Unique on `(org_id, posture)` with RLS (org membership) and audit + updated_at triggers.

- `sandbox_presets` (org/posture scoped saved sandbox configs)

  - Created by `20251201120000_sandbox_presets.sql`.
  - Columns: `id`, `org_id`, `name`, `posture` (enum check), `settings` JSONB, `created_at`, `updated_at`.
  - Unique on `(org_id, name, posture)`; RLS via `memberships` plus audit + `updated_at` triggers.

- Evidence table hardened

- Evidence / audit tables

  - `audit_logs` is live and wired as the common sink for row-level changes across org-scoped tables.
  - Evidence tables (for uploads and artifacts) exist and are RLS-guarded; idempotent ensure migrations guarantee `filename` and `updated_at` columns plus triggers used by the UI and `v1-evidence-*` functions.

---

### 0.2 Edge Functions

**Already deployed / live Supabase Edge Functions:**

- `v1-ping`

  - Simple health check; used by `/debug/ping` and dev sanity tests.

- `v1-analyze`

  - Deterministic underwriting entrypoint.
  - Uses `_vendor/engine` bundle (mirrors `packages/engine`) for all core math.
  - Accepts normalized input + policy snapshot and returns:

    - `output` (underwriting numbers)
    - `trace` (explainable steps)
    - hashes for deterministic replay.

- `v1-policy-get` / `v1-policy-put`

  - Policy retrieval and updates:

    - `v1-policy-get` loads the active policy per org/posture.
    - `v1-policy-put` writes updated policies (respecting RLS and audit).

- `v1-runs-save`

  - Persists `v1-analyze` outputs into the `runs` table.
  - Enforces the uniqueness constraint via hashes and ties runs to `deal_id` + `org_id`.

- `v1-repair-rates`

  - Normalized PSF + Big 5 delivery function.
  - Uses `repair_rate_sets` to return:

    - `as_of`, `market`, `source`, `version`
    - `psfTiers` (light/medium/heavy PSF)
    - `big5` array/object with per-sqft increments.

**Implemented in the repo (wired but still iterating / deploying as needed):**

- `v1-ai-bridge`

  - AI strategist interface on top of engine outputs/trace.
  - Uses Zod contracts from `packages/contracts`.

- `v1-evidence-start` / `v1-evidence-url`

  - Evidence upload orchestration:

    - `v1-evidence-start`: creates metadata row, returns upload URL and storage path.
    - `v1-evidence-url`: returns signed URL for viewing evidence.

  - RLS and storage protection wired to orgs.

  - `v1-runs-relay` / `v1-runs-replay`

    - Relay patterns and deterministic run replays (hash-based).

  - `v1-policy-override-request` / `v1-policy-override-approve`

    - Governance interface for sensitive policy changes; tied to `policy_override_requests` and `policy_versions`.

  - `v1-user-settings`

    - JWT-verified via `verify_jwt = true`; anon Supabase client with caller JWT.
    - Resolves `org_id` via `memberships` and optional `orgId` query parameter (must validate membership).
    - Supports:

      - `GET` - returns current settings for `(user_id, org_id)` or `null`.
      - `PUT` - upserts settings for `(user_id, org_id)`.

  - `v1-sandbox-settings`

    - JWT + anon client with caller JWT.
    - Org resolution via memberships; GET/PUT upsert of org/posture-scoped config JSON.

- `v1-sandbox-presets`

  - GET/POST/DELETE for sandbox presets stored in `sandbox_presets`, scoped by caller JWT + memberships with optional posture filter.

- `v1-sandbox-strategist`

  - POST-only Strategist helper that validates sandbox payloads, enforces JWT membership, and calls OpenAI with strict guardrails (no new numbers, only reference provided sandbox settings). Currently calls OpenAI directly rather than the shared AI bridge.

- `v1-repair-profiles`

  - GET/POST/PUT for repair rate profiles (org/market/posture scoped) with caller JWT, membership/org resolution, and CORS headers shared via `_shared/cors.ts`.

---

### 0.3 App Structure

- Frontend is a **Next.js 14 App Router** app under `apps/hps-dealengine`.

- `(app)` group forms the **protected dashboard shell**:

  - Routes include:

    - `/deals`
    - `/overview`
    - `/underwrite`
    - `/repairs`
    - `/trace`
    - `/runs`
    - `/settings` and nested settings routes
    - `/sandbox`
    - `/sources`
    - `/ai-bridge/debug`
    - `/debug/ping`

  - Public/top-level:

    - `/`
    - `/login`
    - `/startup`
    - `/logout`

  - Entry + deal selection:

    - `/startup` is the post-login hub (empty state + "View all deals").
    - `/deals` lists org-scoped deals via `get_caller_org` + RLS; create/select sets `DealSession` and routes to `/overview?dealId=...` (Dashboard).
    - `DealGuard` (in `(app)` layout) defers redirect during deep-link hydration and bounces protected routes to `/startup` when no active deal is present.

  - Labels and nav:

    - `/overview` is labeled **Dashboard** in UI; route path remains `/overview`.
    - Nav split: Dashboard on the left; right cluster `Repairs  Underwrite  Deals  Trace  Sandbox  Settings`. Deal-required routes append `?dealId=` and preserve active deal when switching tabs.

- Core layout components:

  - `app/layout.tsx` - global HTML shell, theme, fonts, and **root-level `DealSessionProvider`** (all routes share session context, including `/startup` and `/login`).
  - `app/(app)/layout.tsx` - authenticated dashboard shell (no nested session provider):

    - `AuthGate` for session guard.
    - `DealGuard` (requires active deal for protected routes).
    - `AppTopNav` for desktop nav.
    - `MobileBottomNav` for mobile nav (now implemented + wired).

- UI-v2 decoupling for deploys:

  - `.tmp/ui-v2` is prototype-only and excluded from Vercel uploads via `.vercelignore`.
  - App imports now use the stable bridge `apps/hps-dealengine/lib/ui-v2-constants.ts` (Icons, estimator sections, sandbox config) backed by committed `apps/hps-dealengine/constants*` files, not `.tmp`.
  - Runtime UI types live in `apps/hps-dealengine/types.ts`; `@ui-v2/types` imports have been removed from active app code, with cleanup still needed in legacy tests/backups (in progress). Vercel builds no longer fail on missing constants; remaining risk is lingering `@ui-v2/types` alias/type drift.

---

### 0.4 Multi-Tenant & RLS Shape

- Multi-tenant design:

  - `organizations`  one portfolio / business entity per row.
  - `memberships`  link users to orgs with a role; RLS anchored here:

    - Pattern: `auth.uid()`  `memberships`  `org_id` filter.

- RLS invariants:

  - Every org-scoped table (deals, runs, repair_rate_sets, user_settings, policies, evidence) uses:

    - `org_id` column.
    - RLS policy referencing `memberships`.

- Engine & runs semantics:

  - `runs` is the **canonical execution log**.
  - For a given `(org_id, posture, input_hash, policy_hash)`:

    - There should be a unique run row (or enforced dedupe).
    - Replays must produce bit-identical results.

This alignment section is the **baseline**. Any new code or refactor must respect this as the Source of Truth.

---

## 1 V1 Definition of Done (Field-Ready) - Done

V1 is shipped and usable in the field. It includes:

- **Core single-deal underwriting**
  - Engine/Edge: `v1-analyze` uses the shared `buildUnderwritingPolicyFromOptions` builder; `runs` store outputs, traces, hashes, and policy snapshots; determinism enforced on `(org_id, posture, input_hash, policy_hash)`.
  - Repairs: `repair_rate_sets` + `v1-repair-rates` and `v1-repair-profiles` serve org/market/posture-aware pricing; RepairsTab consumes live rates.

- **Business Sandbox v1**
  - 196 knobs with KEEP/DROP/DROP_BACKLOG classifications in `docs/knobs-audit-v1.md`; coverage map in `tools/knob-coverage-report.cjs/json`.
  - All KEEP knobs runtime-wired (runtime_math/risk_gate/workflow) except the explicit UX-only trio: `abcConfidenceGradeRubric`, `allowAdvisorOverrideWorkflowState`, `buyerCostsLineItemModelingMethod` (surfaced as UX context, no math impact).
  - `BusinessLogicSandbox` hides DROP backlog knobs, shows UX-only band; `KnobFamilySummary` surfaces policy context on Dashboard/Trace.

- **Dashboard, nav, and flows**
  - `/overview` labeled Dashboard with TopDealKpis (ARV, MAO, discount, assignment vs target/max, DTM/speed, risk/confidence/workflow) plus Strategy/Guardrails, Timeline & Carry, Risk & Evidence cards driven by `AnalyzeOutputs` + traces.
  - Nav split: Dashboard (left) and `Repairs  Underwrite  Deals  Trace  Sandbox  Settings` (right); deal-required routes append `?dealId=` and fall back to `/startup` when unset. `/startup` hub (empty state + View all deals) and `/deals` list set DealSession and route to Dashboard.

- **Risk, evidence, workflow**
  - Placeholder knob controls evidence gaps, confidence downgrade, workflow state, and traces (allowed/used/kinds); workflow line explains Ready/Review/Info with reasons; risk pills include disabled/failing states; confidence badge follows rubric.
  - Trace shows EVIDENCE_FRESHNESS_POLICY, RISK_GATES_POLICY, CONFIDENCE_POLICY, WORKFLOW_STATE_POLICY with thresholds, placeholders, rubric text, and gate enablement.

- **Governance and audit**
  - RLS-first across deals/policies/runs/repairs/evidence/sandbox settings; audit_logs cover org-scoped tables; policy overrides/governance tables live.
  - Evidence uploads and overrides attach to real deals/runs with org/user context.

- **QA environment and E2E harness**
  - `docs/QA_ENV_V1.md` documents QA Supabase setup and required env vars (QA user + READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals).
  - Playwright specs (`golden-path`, `timeline-and-carry`, `risk-and-evidence`) follow `/login -> /startup -> /deals -> /overview?dealId=...`, assert Dashboard heading and current risk/evidence/workflow surfaces, and skip cleanly when env vars are absent.
  - Core commands green: `pnpm -w typecheck`, `pnpm -w build` (Sentry/require-in-the-middle warning only), `pnpm -w test`.

V1 is complete; new slices should come from v1.1 hardening or v2/v3 themes below.

---

## 2 V1.1 / Hardening (Near-Term)

Fast-follow items that do not change V1 behavior:

- Stand up QA Supabase with seeded READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals; run env-gated Playwright specs and consider enabling in CI.
- Repairs UX/ergonomics: fix org alignment for repair profiles/rates, tighten RepairsTab meta and presentation.
- Overrides/governance: light UI for override request/review, keep governance RLS and trace visibility.
- Minor ergonomics: Sandbox/Startup/Deals copy and hints; numeric/UX-only knob presentation where safe (rounding, buyer-cost presentation) without changing math.

## 3 V2 Themes (Planned)

- **Portfolio and analytics**: multi-deal/org dashboards, pipeline analytics, reporting/export.
- **Connectors and data quality**: MLS/public records/FEMA/tax/insurance connectors; auto-populate evidence/risk inputs; automate comps/hazard signals.
- **Deeper economics and policy refinements**: uninsurable margin adders in offer selection; deterministic hold-cost per track/speed/zip; deterministic repairs totals by track; explicit AIV override % knob; richer DTM/gap tokens; doc-stamp/closing-cost tables feeding disposition math.
- **UX/presentation refinements**: full consumption of UX-only knobs (bankers rounding, buyer-cost dual scenarios, line-item vs aggregate); richer cost stack/scenario presentation.
- **Observability/support (v2 level)**: improved Sentry/OTel posture, lightweight support tooling.
- **Dashboard KPI Expansion (post Dual-Agent)**:
  - Promote selected candidates from `docs/dashboard/kpi-candidates.md` into real cards on `/dashboard`.
  - Close high-value gaps surfaced by `check:dashboard-coverage` (e.g., occupancy, structural flags, payoff buffer, Market Temp).
- **Policy Docs Hardening**:
  - Fill in placeholders: `domain.risk-gates-and-compliance`, `engine.knobs-and-sandbox-mapping`, `app.routes-overview`.
  - Confirm each gate/knob is wired to trace and KPIs.
- **AI Persona Voice Tuning**:
  - Refine default tones for Deal Analyst (candid, direct) and Deal Strategist (visionary, strategic).
  - Add copy guidelines and examples to `docs/ai/assistant-behavior-guide.md`.

## 4 V3 Themes (Planned)

- **Advanced financing and ROI layers**: cash-on-cash, IRR, financing scenarios, lender views.
- **Deep SRE/ops**: replay tooling, expanded OTel pipelines, advanced monitoring.
- **Ecosystem integrations**: CRM, billing/plan limits, larger integrations beyond underwriting core.
