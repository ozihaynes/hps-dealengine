# HPS DealEngine - Roadmap v1 / v2 / v3 (Updated 2026-01-06)

---

## Version History

| Version | Status | Release Date | Key Features |
|---------|--------|--------------|--------------|
| V1.0 | ✅ Released | 2025-10 | Core underwriting engine |
| V1.5 | ✅ Released | 2025-11 | Client intake forms |
| V2.0 | ✅ Released | 2025-12 | Deal overview page |
| V2.1 | ✅ Complete | 2026-01 | Command Center |
| V2.5 | ⚠️ Code Complete | 2026-01 | Wholesaler Dashboard (integration pending) |
| V2.2 | 📋 Planned | 2026-02 | Timeline enhancements |
| V3.0 | 📋 Planned | 2026-Q2 | AI recommendations |

---

## 0 Alignment Check (Whats Already True in the Repo / DB)

This section is the grounding layer: it describes what already exists and is working in the repo and database. Everything else in this roadmap assumes these pieces are real and should **not** be re-invented from scratch.

When reading this as an agent (Codex / ChatGPT), treat this section as **facts about the current system**.

---

QA/E2E readiness: `docs/QA_ENV_V1.md` documents QA Supabase setup + env vars; Playwright specs (golden path, timeline/carry, risk/evidence) follow the v1 IA and skip cleanly when QA env is absent.

### 0.1 Key Tables Present

The following tables are **live with RLS and real data** and must be treated as the backbone of the system:

- ✅ `organizations` and `memberships`

  - ✅ Multi-tenant backbone: users belong to orgs via `memberships (org_id, user_id, role)`.
  - ✅ RLS consistently uses the pattern: `auth.uid()` joined through `memberships` to scope all org data.

- ✅ `runs`

  - ✅ Canonical execution log for engine runs.
  - ✅ Stores `org_id`, posture, `deal_id`, raw `input`, `output`, `trace`, `policy_snapshot`, plus deterministic hashes:

    - ✅ `input_hash`
    - ✅ `output_hash`
    - ✅ `policy_hash`

  - ✅ Uniqueness constraint on `(org_id, posture, input_hash, policy_hash)` enforces deterministic dedupe/replay.

- ✅ `valuation_calibration_buckets`

  - ✅ RLS + audit; bucketed calibration rows keyed by market/home band.

- ✅ `valuation_weights`

  - ✅ RLS + audit; versioned weights per bucket.

- ✅ `valuation_calibration_freezes`

  - ✅ RLS + audit; market_key freeze switch for publishing.

- ✅ `agent_runs`

  - ✅ Logging table for persona agents (Analyst/Strategist/Negotiator).
  - ✅ Columns include org_id, user_id, persona, agent_name, workflow_version, deal_id/run_id/thread_id/trace_id, model, status, input/output/error, latency_ms, total_tokens, created_at.
  - ✅ Indexed by org/persona, user/persona, deal, run. RLS via memberships + `auth.uid()`; audit trigger enabled.

- ✅ `repair_rate_sets` (and related normalized structures)

  - ✅ Live schema seeded with investor-grade ORL defaults per org/market.
  - ✅ ORL/base profiles normalized via migrations to maintain a single active+default profile per org/market/posture, with canonical profiles seeded for the deals org.
  - ✅ Used by `v1-repair-rates` to serve:

    - ✅ PSF tiers (light/medium/heavy).
    - ✅ Big 5 budget killers (roof, HVAC, repipe, electrical, foundation).

  - ✅ RLS tied to `organizations` + `memberships`.
  - ✅ Audit trigger wired into `audit_logs`.

- ✅ Canonical org-scoped deals table (from `20251109000708_org_deals_and_audit_rls.sql`)

  - ✅ This is the **single Source of Truth** for deals in v1.
  - ✅ Every underwrite, run, evidence artifact, and policy decision ultimately anchors to a row in this table.
  - ✅ Includes:

    - ✅ Identity: `id`, `org_id`.
    - ✅ Audit: `created_by`, `created_at`, `updated_at`.
    - ✅ Core deal fields (address, city, state, zip).
    - ✅ Normalized `payload` JSON for structured deal facts.

- ✅ `policies`, `policy_versions`, and `policy_versions_api` view

  - ✅ Store active/current policy JSON per org/posture and historical versions.
  - ✅ RLS applied so policies are org-scoped and posture-aware.
  - ✅ `policy_versions_api` is used by edge functions to consume policy snapshots.

- ✅ `user_settings` (new in this session)

  - ✅ Live table created by `20251128093000_user_settings.sql` migration.
  - ✅ Columns (high-level):

    - ✅ `id`, `org_id`, `user_id`
    - ✅ Preference fields: `default_posture`, `default_market`, `theme`, `ui_prefs`
    - ✅ Audit: `created_at`, `updated_at`

  - ✅ RLS:

    - ✅ Users can only see/update settings for `user_id = auth.uid()` within orgs where they have memberships.

  - ✅ Audit:

    - ✅ Tied into shared `audit_log_row_change()` trigger and `audit_logs` table.

- ✅ `sandbox_settings` (org/posture scoped)

  - ✅ Created by `20251128171500_sandbox_settings.sql`.
  - ✅ Columns: `id`, `org_id`, `posture`, `config` JSONB, `created_at`, `updated_at`.
  - ✅ Unique on `(org_id, posture)` with RLS (org membership) and audit + updated_at triggers.

- ✅ `sandbox_presets` (org/posture scoped saved sandbox configs)

  - ✅ Created by `20251201120000_sandbox_presets.sql`.
  - ✅ Columns: `id`, `org_id`, `name`, `posture` (enum check), `settings` JSONB, `created_at`, `updated_at`.
  - ✅ Unique on `(org_id, name, posture)`; RLS via `memberships` plus audit + `updated_at` triggers.

- ✅ Evidence table hardened

- ✅ Evidence / audit tables

  - ✅ `audit_logs` is live and wired as the common sink for row-level changes across org-scoped tables.
  - ✅ Evidence tables (for uploads and artifacts) exist and are RLS-guarded; idempotent ensure migrations guarantee `filename` and `updated_at` columns plus triggers used by the UI and `v1-evidence-*` functions.

---

### 0.2 Edge Functions

**Already deployed / live Supabase Edge Functions:**

- ✅ `v1-ping`

  - ✅ Simple health check; used by `/debug/ping` and dev sanity tests.

- ✅ `v1-analyze`

  - ✅ Deterministic underwriting entrypoint.
  - ✅ Uses `_vendor/engine` bundle (mirrors `packages/engine`) for all core math.
  - ✅ Accepts normalized input + policy snapshot and returns:

    - ✅ `output` (underwriting numbers)
    - ✅ `trace` (explainable steps)
    - ✅ hashes for deterministic replay.

- ✅ `v1-policy-get` / `v1-policy-put`

  - ✅ Policy retrieval and updates:

    - ✅ `v1-policy-get` loads the active policy per org/posture.
    - ✅ `v1-policy-put` writes updated policies (respecting RLS and audit).

- ✅ `v1-runs-save`

  - ✅ Persists `v1-analyze` outputs into the `runs` table.
  - ✅ Enforces the uniqueness constraint via hashes and ties runs to `deal_id` + `org_id`.

- ✅ `v1-repair-rates`

  - ✅ Normalized PSF + Big 5 delivery function.
  - ✅ Uses `repair_rate_sets` to return:

    - ✅ `as_of`, `market`, `source`, `version`
    - ✅ `psfTiers` (light/medium/heavy PSF)
    - ✅ `big5` array/object with per-sqft increments.

- ✅ `v1-valuation-continuous-calibrate`

  - ✅ Publishes bucketed calibration weights and respects freeze + blending guardrails.
  - ⚠️ **PAUSED_V2**: Feature-flagged OFF via `FEATURE_CALIBRATION_ENABLED`. Returns `{ ok: true, reason: "calibration_feature_paused_v2" }`. Re-enable by setting env var to `true`.

- ✅ `v1-valuation-run`

  - ✅ Applies published weights when ensemble is enabled; emits output.calibration.* for traceability.
  - ⚠️ **PAUSED_V2**: Ensemble/Uncertainty/Ceiling feature-flagged OFF via `FEATURE_ENSEMBLE_ENABLED`. Comp Overrides remain ACTIVE.

- ✅ `v1-valuation-eval-run`

  - ✅ Ground-truth evaluation harness; compares predictions to realized prices. **ACTIVE** (operates independently of paused providers).

**Implemented in the repo (wired but still iterating / deploying as needed):**

- ✅ `v1-ai-bridge`

  - ✅ AI strategist interface on top of engine outputs/trace.
  - ✅ Uses Zod contracts from `packages/contracts`.
  - ✅ All persona traffic now routes through the OpenAI-backed bridge (Gemini experiment removed).

- ✅ `v1-evidence-start` / `v1-evidence-url`

  - ✅ Evidence upload orchestration:

    - ✅ `v1-evidence-start`: creates metadata row, returns upload URL and storage path.
    - ✅ `v1-evidence-url`: returns signed URL for viewing evidence.

  - ✅ RLS and storage protection wired to orgs.

  - ✅ `v1-policy-override-request` / `v1-policy-override-approve`

    - ✅ Governance interface for sensitive policy changes; tied to `policy_override_requests` and `policy_versions`.

  - ✅ Not shipped in V1 (planned for V1.1): `v1-runs-relay` / `v1-runs-replay` (deterministic relays/replays).

  - ✅ `v1-user-settings`

    - ✅ JWT-verified via `verify_jwt = true`; anon Supabase client with caller JWT.
    - ✅ Resolves `org_id` via `memberships` and optional `orgId` query parameter (must validate membership).
    - ✅ Supports:

      - ✅ `GET` - returns current settings for `(user_id, org_id)` or `null`.
      - ✅ `PUT` - upserts settings for `(user_id, org_id)`.

  - ✅ `v1-sandbox-settings`

    - ✅ JWT + anon client with caller JWT.
    - ✅ Org resolution via memberships; GET/PUT upsert of org/posture-scoped config JSON.

- ✅ `v1-sandbox-presets`

  - ✅ GET/POST/DELETE for sandbox presets stored in `sandbox_presets`, scoped by caller JWT + memberships with optional posture filter.

- ✅ `v1-sandbox-strategist`

  - ✅ POST-only Strategist helper that validates sandbox payloads, enforces JWT membership, and calls OpenAI with strict guardrails (no new numbers, only reference provided sandbox settings). Currently calls OpenAI directly rather than the shared AI bridge.

- ✅ `v1-repair-profiles`

  - ✅ GET/POST/PUT for repair rate profiles (org/market/posture scoped) with caller JWT, membership/org resolution, and CORS headers shared via `_shared/cors.ts`.

### Agent / MCP Infra (runtime endpoints)

- ✅ `/api/agents/{analyst|strategist|negotiator}` are Next.js runtime routes (node) that require `Authorization: Bearer <Supabase access_token>`, resolve org_id via memberships, guard deal orgs, and log to `agent_runs`; no `service_role` in user flows.
- ✅ `@hps/agents` backs the personas (RLS Supabase client, Strategist KB resolver tolerant to missing registry, Negotiator dataset loader + rate-limit handling).
- ✅ `@hps/hps-mcp` server runs on stdio + Streamable HTTP (`pnpm --filter "@hps/hps-mcp" start:http` or root `dev:hps-mcp:http`), HTTP auth via `HPS_MCP_HTTP_TOKEN`; tools include `hps_get_deal_by_id`, `hps_get_latest_run_for_deal`, `hps_list_evidence_for_run`, `hps_get_negotiation_strategy`, `hps_get_kpi_snapshot`, `hps_get_risk_gate_stats`, `hps_get_sandbox_settings`, `hps_kb_search_strategist`; dev client: `packages/hps-mcp/dev/mcpClient.cjs`. No tunnel script present.

---

### 0.3 App Structure

- ✅ Frontend is a **Next.js 14 App Router** app under `apps/hps-dealengine`.

- ✅ `(app)` group forms the **protected dashboard shell**:

  - ✅ Routes include:

    - ✅ `/deals`
    - ✅ `/overview`
    - ✅ `/underwrite`
    - ✅ `/repairs`
    - ✅ `/trace`
    - ✅ `/runs`
    - ✅ `/settings` and nested settings routes
    - ✅ `/sandbox`
    - ✅ `/sources`
    - ✅ `/ai-bridge/debug`
    - ✅ `/debug/ping`

  - ✅ Public/top-level:

    - ✅ `/`
    - ✅ `/login`
    - ✅ `/startup`
    - ✅ `/logout`

  - ✅ Entry + deal selection:

    - ✅ `/startup` is the post-login hub (empty state + "View all deals").
    - ✅ `/deals` lists org-scoped deals via `get_caller_org` + RLS; create/select sets `DealSession` and routes to `/overview?dealId=...` (Dashboard).
    - ✅ `DealGuard` (in `(app)` layout) defers redirect during deep-link hydration and bounces protected routes to `/startup` when no active deal is present.

  - ✅ Labels and nav:

    - ✅ `/overview` is labeled **Dashboard** in UI; route path remains `/overview`.
    - ✅ Nav split: Dashboard on the left; right cluster `Repairs  Underwrite  Deals  Trace  Sandbox  Settings`. Deal-required routes append `?dealId=` and preserve active deal when switching tabs.

- ✅ Core layout components:

  - ✅ `app/layout.tsx` - global HTML shell, theme, fonts, and **root-level `DealSessionProvider`** (all routes share session context, including `/startup` and `/login`).
  - ✅ `app/(app)/layout.tsx` - authenticated dashboard shell (no nested session provider):

    - ✅ `AuthGate` for session guard.
    - ✅ `DealGuard` (requires active deal for protected routes).
    - ✅ `AppTopNav` for desktop nav.
    - ✅ `MobileBottomNav` for mobile nav (now implemented + wired).

- ✅ UI-v2 decoupling for deploys:

  - ✅ `.tmp/ui-v2` is prototype-only and excluded from Vercel uploads via `.vercelignore`.
  - ✅ App imports now use the stable bridge `apps/hps-dealengine/lib/ui-v2-constants.ts` (Icons, estimator sections, sandbox config) backed by committed `apps/hps-dealengine/constants*` files, not `.tmp`.
  - ✅ Runtime UI types live in `apps/hps-dealengine/types.ts`; `@ui-v2/types` imports have been removed from active app code, with cleanup still needed in legacy tests/backups (in progress). Vercel builds no longer fail on missing constants; remaining risk is lingering `@ui-v2/types` alias/type drift.

---

### 0.4 Multi-Tenant & RLS Shape

- ✅ Multi-tenant design:

  - ✅ `organizations`  one portfolio / business entity per row.
  - ✅ `memberships`  link users to orgs with a role; RLS anchored here:

    - ✅ Pattern: `auth.uid()`  `memberships`  `org_id` filter.

- ✅ RLS invariants:

  - ✅ Every org-scoped table (deals, runs, repair_rate_sets, user_settings, policies, evidence) uses:

    - ✅ `org_id` column.
    - ✅ RLS policy referencing `memberships`.

- ✅ Engine & runs semantics:

  - ✅ `runs` is the **canonical execution log**.
  - ✅ For a given `(org_id, posture, input_hash, policy_hash)`:

    - ✅ There should be a unique run row (or enforced dedupe).
    - ✅ Replays must produce bit-identical results.

This alignment section is the **baseline**. Any new code or refactor must respect this as the Source of Truth.

---

## 1 V1 Definition of Done (Field-Ready) - Done

V1 is shipped and usable in the field. It includes:

- ✅ **Core single-deal underwriting**
  - ✅ Engine/Edge: `v1-analyze` uses the shared `buildUnderwritingPolicyFromOptions` builder; `runs` store outputs, traces, hashes, and policy snapshots; determinism enforced on `(org_id, posture, input_hash, policy_hash)`.
  - ✅ Repairs: `repair_rate_sets` + `v1-repair-rates` and `v1-repair-profiles` serve org/market/posture-aware pricing; RepairsTab consumes live rates.

- ✅ **Business Sandbox v1**
  - ✅ 196 knobs with KEEP/DROP/DROP_BACKLOG classifications in `docs/knobs-audit-v1.md`; coverage map in `tools/knob-coverage-report.cjs/json`.
  - ✅ All KEEP knobs runtime-wired (runtime_math/risk_gate/workflow) except the explicit UX-only trio: `abcConfidenceGradeRubric`, `allowAdvisorOverrideWorkflowState`, `buyerCostsLineItemModelingMethod` (surfaced as UX context, no math impact).
  - ✅ `BusinessLogicSandbox` hides DROP backlog knobs, shows UX-only band; `KnobFamilySummary` surfaces policy context on Dashboard/Trace.

- ✅ **Dashboard, nav, and flows**
  - ✅ `/overview` labeled Dashboard with TopDealKpis (ARV, MAO, discount, assignment vs target/max, DTM/speed, risk/confidence/workflow) plus Strategy/Guardrails, Timeline & Carry, Risk & Evidence cards driven by `AnalyzeOutputs` + traces.
  - ✅ Nav split: Dashboard (left) and `Repairs  Underwrite  Deals  Trace  Sandbox  Settings` (right); deal-required routes append `?dealId=` and fall back to `/startup` when unset. `/startup` hub (empty state + View all deals) and `/deals` list set DealSession and route to Dashboard.

- ✅ **Risk, evidence, workflow**
  - ✅ Placeholder knob controls evidence gaps, confidence downgrade, workflow state, and traces (allowed/used/kinds); workflow line explains Ready/Review/Info with reasons; risk pills include disabled/failing states; confidence badge follows rubric.
  - ✅ Trace shows EVIDENCE_FRESHNESS_POLICY, RISK_GATES_POLICY, CONFIDENCE_POLICY, WORKFLOW_STATE_POLICY with thresholds, placeholders, rubric text, and gate enablement.

- ✅ **Governance and audit**
  - ✅ RLS-first across deals/policies/runs/repairs/evidence/sandbox settings; audit_logs cover org-scoped tables; policy overrides/governance tables live.
  - ✅ Evidence uploads and overrides attach to real deals/runs with org/user context.

- ✅ **QA environment and E2E harness**
  - ✅ `docs/QA_ENV_V1.md` documents QA Supabase setup and required env vars (QA user + READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals).
  - ✅ Playwright specs (`golden-path`, `timeline-and-carry`, `risk-and-evidence`) follow `/login -> /startup -> /deals -> /overview?dealId=...`, assert Dashboard heading and current risk/evidence/workflow surfaces, and skip cleanly when env vars are absent.
  - ✅ Core commands green: `pnpm -w typecheck`, `pnpm -w build` (Sentry/require-in-the-middle warning only), `pnpm -w test`.
  - ✅ Added `scripts/qa-preflight.ps1` to validate QA env + function reachability before running Playwright.
  - ✅ Centralized Playwright QA login in `tests/e2e/_helpers/qaAuth.ts`; refreshed pixel snapshots for core pages (including `/ai-bridge/debug`).

V1 is complete; new slices should come from v1.1 hardening or v2/v3 themes below.

---

## 2 V1.1 / Hardening (Near-Term)

Recently shipped (Dec 2025 - Jan 2026):

- ✅ **CLIENT-INTAKE-AUTOFILL v2.0** (Jan 2026): Token-gated client intake form system with full save/resume/resubmit workflow:
  - **v1 Foundation (7 slices):** Config-first schema (intake_schema_versions, intake_links, intake_submissions, intake_submission_files, intake_population_events + RLS + immutability triggers), token-gated public API (v1-intake-validate-token, v1-intake-save-draft, v1-intake-submit), multi-section wizard form, staff inbox (/intake-inbox with filters, status badges, SendIntakeLinkModal), population engine (lib/populationEngine.ts + v1-intake-populate + PopulateSubmissionModal), file upload flow (quarantine model, v1-intake-upload-start/complete, FileUploadZone/FileListDisplay), E2E test + polish.
  - **v2.0 Enhancements:** 2-second auto-save with visual SaveIndicator (idle/saving/saved/error states), resume at saved section index when returning via same link, edit-in-place model (SUBMITTED reverts to DRAFT on edit, resubmit with revision_cycle increment), "Save & Continue Later" button with toast confirmation, form locking when PENDING_REVIEW/COMPLETED/REJECTED, contact prefill from deal payload, FileUploadZone stale closure fix.
  - Evidence: `pnpm -w typecheck` ✅, `pnpm -w build` ✅, Vercel deployment ✅, Edge functions deployed ✅.
  - Key files: `supabase/migrations/2026010118*_intake_*.sql`, `supabase/functions/v1-intake-*`, `apps/hps-dealengine/components/intake/*`, `apps/hps-dealengine/hooks/useIntakeAutoSave.ts`, `apps/hps-dealengine/app/intake/*`, `apps/hps-dealengine/app/(app)/intake-inbox/*`.

- ✅ AI agent chat UX polish (Slices A/B): always-visible composers with placeholders, taller chat windows with prompt chips, hamburger menu with Tone + "Your Chats," auto-titles from first user message, no auto-summary bubbles (Negotiator keeps first-playbook flow).
- ✅ /startup routing (Slice C): "Run New Deal" -> `/underwrite?dealId=...`; existing deal rows -> `/overview?dealId=...` with session preserved.
- ✅ Underwrite header/evidence (Slice D): dark-styled posture select; evidence checklist stays a compact orange (i) popover with green checks when satisfied; header actions renamed to "Analyze Deal" / "Save" with the Request Override header button removed (OverridesPanel still available); new Recent Runs card (org+deal scoped, newest-first limit 5, links to /runs).
- ✅ Settings navigation (Slice E): desktop settings keep the main app nav visible with branding; mobile bottom nav unchanged.
- ✅ Theme parity (Slice F): Burgundy/Green shells match Blue’s dark glass depth while retaining accent borders/rings.
- ✅ Dev auth hygiene: `scripts/reset-dev-auth-users.ts` (dev guard on Supabase ref, backup -> wipe -> reseed dev org `033ff93d-ff97-4af9-b3a1-a114d3c04da6` + owner/manager/vp/analyst test accounts, dev-only password); audit_logs.actor_user_id nullable hotfix is currently manual (no migration yet).
- ✅ Agent platform infra: `/api/agents/{analyst|strategist|negotiator}` run under caller JWT with `agent_runs` logging; @hps/agents SDK + HPS MCP server (stdio + Streamable HTTP) available for vNext tooling (auth via `HPS_MCP_HTTP_TOKEN`).

Fast-follow items that do not change V1 behavior:

- ✅ 🟡 Stand up QA Supabase with seeded READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals; run env-gated Playwright specs; CI already includes Playwright steps but they remain env-gated (enable by setting QA env + PLAYWRIGHT_ENABLE).
- ✅ 🟡 Valuation Spine (Address -> Comps -> ARV -> Prefill): document and wire address versioning -> valuation_run history, org-scoped property_snapshot caching, and UI hydration from persisted valuations.
- ✅ Repairs UX/ergonomics: fix org alignment for repair profiles/rates, tighten RepairsTab meta and presentation.
- ✅ Overrides/governance: light UI for override request/review, keep governance RLS and trace visibility.
- ✅ 🟡 AI surfaces: Tri-agent chat with Supabase history is live; `/api/agents` + @hps/agents/HPS MCP groundwork exists. Remaining hardening is tone/copy plus strategist/negotiator stability without changing engine math/policy.
- ✅ Agent resilience: All personas now handle context_length_exceeded with one auto-trim retry + user retry UI.
- ✅ 🟡 Agent Platform vNext: `/api/agents` tri personas with caller JWT + `agent_runs` logging; @hps/agents SDK (strategist KB resolver tests, negotiation dataset loader); HPS MCP server (stdio + Streamable HTTP) with deal/run/evidence/negotiation/KPI/risk/sandbox/KB tools; expand Strategist/Negotiator evals/tools and UI retries/backoff.
- ✅ Negotiator Playbook Unblock: handle OpenAI responses 429/token caps/dataset load resilience and user-facing retry/error copy.
- ✅ Minor ergonomics: Sandbox/Startup/Deals copy and hints; numeric/UX-only knob presentation where safe (rounding, buyer-cost presentation) without changing math; NumericInput rollout across Underwrite/Repairs/DoubleClose complete.
- ✅ Security: `v1-ping` now requires JWT (`verify_jwt=true`) and `/debug/ping` uses the caller token.
- ✅ Security: `v1-analyze` now requires Authorization (`verify_jwt=true` + manual JWT guard) — complete in repo; not yet validated in prod. Files: `supabase/config.toml`, `supabase/functions/v1-analyze/index.ts`.

### Valuation Spine

- ✅ Done
  - ✅ Offer (Computed) is a read-only engine output on Dashboard/Overview; fallback order: outputs.primary_offer -> outputs.instant_cash_offer -> calc.instantCashOffer; missing renders as an em dash.
  - ✅ Underwrite Market & Valuation is valuation-only with audited overrides (reason >= 10 chars) and a single "Use Suggested ARV" surface (Applied when arv_source === "valuation_run" and IDs match); no Offer Price input or gating banners.
  - ✅ Comps panel shows summary metrics (count/status/date range/median distance/price variance cv), provenance badges, min-comps gating copy, concessions placeholder, and a 30s cooldown on "Re-run comps" wired to the existing refresh handler; no provider calls on mount.
  - ✅ Market time adjustment (FHFA/FRED HPI) with deterministic fallback (effective <= requested), eligibility gating, adjusted factor/price surfaced in selection/output; HPI cache table migration present; proofs (`prove-market-time-adjustment.ps1`, `coverage-smoke.ps1`) pass locally.
  - ✅ ATTOM public-records subject normalizer with casing/field fallbacks + contracts/tests; enrichment scripts and policy-set helpers added.
  - ✅ Override save merges only the market subtree into deal payload/state; tests cover TopDealKpis, UnderwriteTab, CompsPanel; vitest includes .test.ts/.test.tsx.
- ✅ Slice 4 (adjustments ledger v1.2): policy-gated adjustments defaults seeded (enabled=false, caps/unit_values/rounding/missing behavior/ordering), deterministic ledger + weighted-median adjusted ARV when enabled, optional schema fields/tests, Underwrite comps panel + admin valuation QA ledger viewers. Ledger now always emits `time` + `sqft` entries (applied/skip with reasons) even with zero unit_values. Proof script hardened to assert `adjusted_v1_2` basis + `selection_v1_2` adjustments_version and presence of time/sqft ledger lines; patches active policy by id and restores; uses policy@hps.test.local (role=vp) to satisfy RLS. Latest proof/deploy (2025-12-16): `supabase db push` linked to zjkihnihhqmnhpxkecpy + `supabase functions deploy v1-valuation-run --project-ref zjkihnihhqmnhpxkecpy`, hashes equal (output_hash 3251ffab..., run_hash 7acab050...), coverage-smoke PASS.
- ✅ Slice 5 (comp overrides: concessions/condition + overrides_hash): added valuation_comp_overrides (RLS + audit + updated_at) with unique org/deal/comp_id/comp_kind; active policies seeded with concessions/condition/ceiling defaults (OFF, precedence usd_over_pct). v1-valuation-run loads overrides, applies concessions pre-selection and condition post-basis, computes overrides_hash for dedupe when toggles are enabled, outputs overrides_hash/applied_count, and ledger renders informational concessions + applied condition. UI adds admin Valuation QA overrides CRUD + Underwrite Override badge. Proof scripts/valuation/prove-comp-overrides.ps1: baseline input_hash 568dd228dbb26a6541c2536b8e7f679b47e89b676511822086c103d43730114c -> override input_hash a1ca1df01bbcbfea81d1f51eabc3820a59fb50b03d0ccc76349fe2dbb765cd5e; Run2/Run3 hashes equal; policies restored + override deleted; coverage-smoke PASS. Deploys: supabase db push (20260108112000_valuation_ceiling_tokens.sql) + supabase functions deploy v1-valuation-run --project-ref zjkihnihhqmnhpxkecpy.
- ✅ Slice 6 (ensemble + uncertainty + ceiling guardrail): active policies seeded with ensemble/uncertainty tokens (defaults OFF; weights comps 0.7/avm 0.3 with non-overwriting backfill, p_low 0.10/p_high 0.90, floor_pct 0.05, optional ceiling method p75_active_listings using active listings only). Engine computes ensemble blend + optional ceiling cap + uncertainty range when enabled, includes hash gating. Proof `scripts/valuation/prove-ensemble-uncertainty.ps1`: baseline input_hash f36a52eb7cbd821f9a3e954d0c54308895b556e48385c904d2cd62c594b5edf9 → ensemble input_hash 47bca9f7aa0725705b00bcea3aac9106ed2e8dfd7eeb88606897014fd9ea1c06; run2/run3 hashes equal; policies restored; coverage-smoke PASS; `supabase functions deploy v1-valuation-run --project-ref zjkihnihhqmnhpxkecpy`.
- ✅ Slice 7 (calibration loop MVP: eval + sweep): subject self-comp exclusion and townhouse/singlefamily compatibility grouping (warning `property_type_group_match_sfr_townhome`), eval posture `underwrite` -> `base`, admin Valuation QA shows deduped `input_hash`. Proof `scripts/valuation/prove-eval-run-inrange.ps1` (Org=033ff93d..., Dataset=orlando_smoke_32828_sf_v2, Posture=base, Limit=50, Force=true) produced `input_hash=fa0ed738edbe9c0258b382bf86b453d5618bca19700f9cea01e6e12351f1f7b4`, `eval_run_id=c8aef542-09b9-4a0b-9a6c-4ff6bf3b3de9`, deduped on rerun, `ranges_present=11`, `in_range_rate_overall~0.3636`. Sweep (`v1-valuation-ensemble-sweep`) scored 11/11 with best_by_mae/best_by_mape at `avm_weight=0` (`mae~85091.95`, `mape~0.1422`, apply_cap=false). Ensemble remains default-OFF; AVM weight >0 degrades accuracy on this dataset.
  - ✅ Continuous calibration flywheel scaffolding: calibration buckets/weights tables + `v1-valuation-continuous-calibrate` edge function + admin manual trigger with evidence capture (off by default).
  - ✅ Slice A ✅ auto-trigger on ground truth attach (admin-only, evidence captured).
  - ✅ Slice B ✅ apply calibrated weights during valuation runs (RLS read, deterministic output capture).
  - ✅ Slice C ✅ trace UI calibration chip (run output visibility).
  - ✅ Slice D ✅ guardrails + parent fallback/blending + freeze switch.
  - ✅ Ops: Calibration freeze UI shipped (Valuation QA admin card).
- ✅ Ground-truth/eval harness migrations and admin QA page are in repo; RentCast closed-sales seeder added (caller JWT only).
- ✅ Underwriting integration alignment: engine input uses latest persisted valuation artifacts (ARV/As-Is/market signals) and traces reference valuation artifact IDs; never reintroduce Offer Price as an Underwrite input.
- ✅ Slice 8A (valuation quality comps-only) - Implemented/evaluated selection_v1_3 (deterministic outliers + diagnostics). Result: regressed on orlando_smoke_32828_sf_v2; keep default selection_v1_1, leave selection_v1_3 policy-gated/opt-in for future evaluation cycles.
- ✅ Slice 8 - E2E/regression rails: core underwriting rails are implemented (login/startup/deep-links + overview/underwrite/repairs/trace + pixel snapshots + autosave), valuation-specific assertions now include offer package, under contract, and MARKET_PROVENANCE trace.
- ✅ Offer Package Generation: offer_packages table (RLS/audit) + generate edge function + printable UI page.
- ✅ Under Contract capture: deal status transition + executed contract price capture (deal_contracts table + edge upsert + UI).

### Bulk Import v1 (BULK-IMPORT-v1) — Complete

- ✅ **Database**: `deal_import_jobs` + `deal_import_items` tables with RLS, audit triggers, dedupe keys, and status lifecycle.
- ✅ **Contracts**: `packages/contracts/src/bulkImport.ts` with 6 enums, 13 canonical fields, 8 API schemas.
- ✅ **Edge Functions** (6 deployed):
  - `v1-import-job-create` — Create import job with file metadata and storage path
  - `v1-import-job-update` — Update job status and counts
  - `v1-import-items-upsert` — Batch upsert items (max 200/call)
  - `v1-import-items-list` — List items with filtering and pagination
  - `v1-import-item-update` — Edit item with revalidation and dedupe check
  - `v1-import-promote` — Batch promote items to deals (max 50/call)
- ✅ **Wizard** (`/import/wizard`): 5-step flow (Upload → Type → Map → Validate → Commit) with client-side parsing (Papa Parse, SheetJS), auto-mapping, real-time validation.
- ✅ **Import Center** (`/import`): Jobs list with status filtering, items table with edit/export, promotion modal with progress tracking.
- ✅ **Security**: OWASP CSV injection prevention, file validation (50MB, 10K rows), input sanitization, RLS-first.
- ✅ **E2E Tests**: 13 Playwright specs covering wizard, Import Center, editing, promotion, export (env-gated).
- ✅ **Audit**: `docs/audits/bulk-import-v1-audit-2026-01-02.tar.gz`.

## 3 V2 Themes (Planned)

- **OFFER computation research** (needs more thought and build out) - research required before slice planning/execution. Ask AI to outline research + spec before creating execution slices.
- ✅ **Phase 5 - Competitive Offer Engine V2 MVP** (vertical slice) - code complete (2025-12-28)
  - Slice 1: Profit Core (primary offer semantics, MOI-tiered margins, AIV cap, cash gate)
  - Slice 2: Offer Menu + Ghost Fee UX (offer_menu_cash + fee_metadata + presentational UI wiring)
  - Slice 3: Compliance overlay (tier eligibility from risk/evidence summaries; traced + tested)
  - Slice 4: HVI unlock loop + action cards (hvi_unlocks deterministic deltas; presentational cards)
  - Post-polish: 4-point evidence requires inspected === true; contract-derived UI types; locked-only penalty display
- Post-Phase 5 hardening (recommended before broad rollout)
  - Type the analyze outputs flow end-to-end (remove analysisOutputs as any in UI wiring).
  - Add a lightweight UI regression test/screenshot for Offer Menu + Unlock cards.
  - Document user-facing interpretation of tiers, gates, and unlock penalties.

### V2.1 Command Center — COMPLETE ✅

Command Center V2.1 transforms DealEngine from single-deal underwriting to portfolio-level decision support, delivering a comprehensive dashboard experience.

#### Features Delivered

**Portfolio Dashboard**
| Feature | Status | Evidence |
|---------|--------|----------|
| Aggregate Metrics Strip | ✅ | `PortfolioPulse.tsx` |
| Verdict Distribution Chart | ✅ | Horizontal bar visualization |
| Deal Pipeline Grid | ✅ | `DealPipelineGrid.tsx` |
| Deal Cards with Mini-Gauges | ✅ | `DealCard.tsx` |
| Filtering (Status, Verdict, Analysis) | ✅ | `usePortfolioData.ts` |
| Sorting (Multiple Fields) | ✅ | Closeability, Urgency, Spread, Date |
| Search (Address/City/Zip) | ✅ | Debounced search input |
| Loading/Error/Empty States | ✅ | `PortfolioSkeleton.tsx` |

**Deal Overview Enhancements**
| Feature | Status | Evidence |
|---------|--------|----------|
| VerdictCard with Confidence | ✅ | `VerdictCard.tsx` |
| Score Gauges (4 metrics) | ✅ | `ScoreGauge.tsx` |
| Key Metrics Grid | ✅ | `KeyMetrics.tsx` |
| Signal Cards | ✅ | `SignalCard.tsx` |
| Tab Navigation | ✅ | Overview/Underwrite/Evidence/Timeline |

**Backend Infrastructure**
| Feature | Status | Evidence |
|---------|--------|----------|
| Dashboard Snapshots Table | ✅ | Migration applied |
| RLS Policies | ✅ | Multi-tenant security |
| Edge Functions (CRUD) | ✅ | `supabase/functions/` |
| L2 Score Engine | ✅ | `lib/engine/` |
| Signal Generation | ✅ | Priority-ranked signals |

**Test Coverage**
| Test Type | Count | Status |
|-----------|-------|--------|
| Unit Tests | 66 | ✅ PASS |
| Integration Tests | 27 | ✅ PASS |
| E2E Tests | 45 | ✅ Configured |
| **Total** | **138** | ✅ |

#### Files Created

```
app/
├── dashboard/
│   └── page.tsx                    # Portfolio dashboard route
├── overview/
│   └── page.tsx                    # Deal overview route

components/
├── command-center/
│   ├── VerdictCard.tsx
│   ├── ScoreGauge.tsx
│   ├── KeyMetrics.tsx
│   ├── SignalCard.tsx
│   └── OverviewDashboard.tsx
├── portfolio/
│   ├── PortfolioDashboard.tsx
│   ├── PortfolioHeader.tsx
│   ├── PortfolioPulse.tsx
│   ├── DealPipelineGrid.tsx
│   ├── DealCard.tsx
│   ├── PortfolioSkeleton.tsx
│   └── usePortfolioData.ts

lib/
├── engine/
│   └── portfolio-utils.ts          # Pure utility functions

tests/
├── portfolio-utils.test.ts         # 66 unit tests
├── setup.ts                        # Vitest setup
├── edge-functions/
│   ├── edge-function-test-utils.ts # Mock utilities
│   └── snapshots.test.ts           # 27 integration tests

e2e/
├── e2e-test-utils.ts               # Page objects
└── command-center.spec.ts          # 45 E2E tests

playwright.config.ts                # Playwright configuration

supabase/
├── migrations/
│   └── YYYYMMDD_dashboard_snapshots.sql
└── functions/
    ├── create-snapshot/
    ├── get-snapshot/
    ├── update-snapshot/
    └── delete-snapshot/
```

#### Quality Evidence

| Metric | Value | Evidence |
|--------|-------|----------|
| Build Status | PASS | `pnpm build` |
| Typecheck | PASS | `pnpm typecheck` |
| Lint | PASS | `pnpm lint` |
| Unit Tests | 66/66 | `pnpm test` |
| Integration Tests | 27/27 | `pnpm test edge-functions` |
| E2E Tests | 45 configured | `pnpm e2e` |

#### Release Checklist — V2.1

- [x] All features implemented
- [x] Unit tests passing (66/66)
- [x] Integration tests passing (27/27)
- [x] E2E tests configured (45)
- [x] TypeScript strict compliance
- [x] Build successful
- [x] Documentation updated
- [x] Devlog entry created
- [ ] Production deployment
- [ ] Monitoring configured
- [ ] User feedback collection

#### Specification Documents

| Document | Path | Purpose |
|----------|------|---------|
| PRD (Merged Definitive) | `docs/product/command-center-v2.1-prd.md` | Gold Standard + 8 super-moves |
| Original Gold Standard | `docs/product/dashboard-v2-strategy-prd.md` | Initial PRD specification |
| Execution Prompt | `docs/features/command-center-v2-feature-prompt.md` | Implementation handoff |

**PRD Contents (for reference):**
- Part 1: Two-Center Information Architecture (Portfolio + Deal)
- Part 2: Elite KPI Architecture (L0→L2 hierarchy, 4 compound metrics)
- Part 3: Win-Win-Win UX Design (Fairness Strip, Verdict Card, Buyer Summary)
- Part 4: Visual Intelligence & Layout (ASCII wireframes, semantic colors, mobile gestures)
- Part 5: Signal-to-Resolution Loops (5-part Resolve Drawer, 6 resolver types)
- Part 6: Portfolio Command Center (5 modules)
- Part 7: Engineering Specifications (snapshot schema, RLS, TypeScript contracts)
- Part 8: Implementation Roadmap (5 phases)
- Part 9: Acceptance Criteria (7 testable definitions)
- Part 10: Success Metrics (quantitative KPIs)

### V2.5 Wholesaler Dashboard — CODE COMPLETE ⚠️

**Purpose:** Single-deal Command Center enhancement with ZOPA negotiation visualization, verdict derivation, and 60-second decision support.

| Slice | Description | Status |
|-------|-------------|--------|
| 1 | Contracts & Types Foundation | ✅ `9b17b08` |
| 2 | Price Geometry Engine | ✅ `2a6cfa0` |
| 3 | Verdict Engine | ✅ `3a26abc` |
| 4 | Net Clearance Calculator | ✅ `1caef03` |
| 5 | Comp Quality Scorer | ✅ `00166f7` |
| 6 | Market Velocity Metrics | ✅ |
| 7 | Evidence Health Enhancement | ✅ |
| 8 | Risk Gates 8-Taxonomy | ✅ |
| 9 | UI Components (12 total) | ✅ Reviewed |
| 10 | Input Field Additions | ⏳ Queued |
| 11 | Comps Evidence Pack | ⏳ Queued |
| 12 | Field Mode View (Mobile) | ✅ Code Generated |
| 13 | E2E Integration & Polish | ⚠️ Integration Issues |
| 14-23 | Advanced Dashboard Features | ⏳ Planned |

**Key Deliverables:**
- 8 new engine computation functions with trace frames
- 8 new Zod schemas in `@hps-internal/contracts`
- 12 UI components for single-deal dashboard
- Field Mode mobile route (`/deals/[id]/field`)
- Feature flag system (`ff_v25_dashboard`)
- ~300+ new tests

**⚠️ KNOWN ISSUE:** V25Dashboard components are replacing original CommandCenter content instead of enhancing it. The 12 Slice 9 components exist but require proper integration before production use.

**📋 APEX PRD (2026-01-06):** Comprehensive specification for completing Dashboard 2.0 vision created. Defines:
- 12 additional UI components
- 4 new database tables
- 5 new Edge Functions
- Implementation roadmap: Slices 22-36 (5 phases)
- New lexicon: Strike Price, ZOPA, Entry Point, Net Clearance

See: `docs/product/apex-prd-wholesaler-dashboard-v2.md`

**Next Steps:**
1. Resolve V25/CommandCenter integration (components should enhance, not replace)
2. Complete Slices 10-11 (Input Fields, Comps Pack)
3. Execute APEX PRD implementation (Slices 22-36) per 5-phase roadmap:
   - Phase 1 (Slices 22-24): Data Layer
   - Phase 2 (Slices 25-26): Price Geometry
   - Phase 3 (Slices 27-30): Visualization
   - Phase 4 (Slices 31-32): Integration
   - Phase 5 (Slices 33-36): Polish & Tests

**Dependencies:** V2.1 Command Center (Complete ✅)

### V2.2 Timeline Enhancements — PLANNED 📋

| Feature | Priority | Description |
|---------|----------|-------------|
| Interactive Timeline Simulator | High | Simulate deal timeline scenarios |
| What-If Scenario Builder | Medium | Model different deal outcomes |
| Historical Trend Charts | Medium | Visualize trends over time |
| Export to PDF | Low | Generate PDF reports |

**Dependencies:** V2.1 Command Center (Complete ✅), Additional historical data collection

- **Deal workflow guide A→Z** (needs more thought and build out) — research required before slice planning/execution. Ask AI to outline research + spec before creating execution slices.
- ✅ **Import feature (filled template)** — COMPLETE: See "Bulk Import v1 (BULK-IMPORT-v1)" in V1.1 section above.
- ✅ **CSV upload (bulk-create deals/clients)** — COMPLETE: See "Bulk Import v1 (BULK-IMPORT-v1)" in V1.1 section above.
- **Connectors and data quality**: MLS/public records/FEMA/tax/insurance connectors; auto-populate evidence/risk inputs; automate comps/hazard signals.
- **Connectors hardening**: Redfin ingestion for MOI/market metrics with deterministic snapshots; multi-provider adapters (RentCast/ATTOM/MLS) behind a unified interface; address verification/normalization upgrade (Smarty/USPS) to strengthen fingerprints.
  - ⚠️ **PAUSED_V2**: RentCast (`FEATURE_RENTCAST_ENABLED`) and ATTOM (`FEATURE_ATTOM_ENABLED`) adapters feature-flagged OFF. Strategic pivot to free public data architecture. Re-enable via env vars when provider costs approved. See `docs/archive/valuation-providers-v2-pause.md`.
- **Valuation fidelity**: MOI ingestion and true closed-sales comps semantics upgrade (v2) to replace listing-only comps.
- **Valuation data fidelity**: clarify listing vs closed comps provenance in UI/contracts; extend confidence rubric tuning per policy.
- **Closed-sales comps ingestion**: ingest true sold comps (e.g., MLS/ATTOM) with policy tokens (min_sold_comps_required or equivalent) and upgrade valuation semantics beyond sale listings.
- **Deeper economics and policy refinements**: uninsurable margin adders in offer selection; deterministic hold-cost per track/speed/zip; deterministic repairs totals by track; explicit AIV override % knob; richer DTM/gap tokens; doc-stamp/closing-cost tables feeding disposition math.
- **UX/presentation refinements**: full consumption of UX-only knobs (bankers rounding, buyer-cost dual scenarios, line-item vs aggregate); richer cost stack/scenario presentation.
- **Observability/support (v2 level)**: improved Sentry/OTel posture, lightweight support tooling.
  - ✅ Slice 1 (instrumentation foundation + request correlation + Support ID in global error) complete in repo; not yet validated in prod.
  - Files: `apps/hps-dealengine/instrumentation.ts`, `apps/hps-dealengine/middleware.ts`, `apps/hps-dealengine/app/global-error.tsx`, `apps/hps-dealengine/lib/o11y/requestId.ts`, `apps/hps-dealengine/lib/o11y/releaseInfo.ts`, `apps/hps-dealengine/package.json`, `pnpm-lock.yaml`.
  - ✅ Slice 3 (policy snapshot linkage hardening) complete in repo; not yet validated in prod.
  - Files: `supabase/functions/v1-analyze/index.ts`, `supabase/functions/v1-runs-save/index.ts`, `packages/contracts/src/analyze.ts`, `packages/contracts/src/runsSave.ts`, `apps/hps-dealengine/app/(app)/underwrite/page.tsx`, `apps/hps-dealengine/lib/edge.ts`, `docs/engine/architecture-overview.md`.
  - ✅ Slice 4 (policyHash canonicalization + agent_runs persona alignment) complete in repo; not yet validated in prod.
  - Files: `supabase/functions/v1-analyze/index.ts`, `apps/hps-dealengine/app/api/agents/analyst/route.ts`, `apps/hps-dealengine/app/api/agents/strategist/route.ts`, `apps/hps-dealengine/app/api/agents/negotiator/route.ts`, `deno.lock`.
  - ✅ Slice 5 (Support Console MVP: tenant-safe + audited) complete in repo; ✅ validated in prod (2025-12-31).
  - Files: `supabase/migrations/20251231125955_o11y_support_cases.sql`, `apps/hps-dealengine/app/(app)/admin/support/page.tsx`, `apps/hps-dealengine/app/(app)/admin/support/[caseId]/page.tsx`, `apps/hps-dealengine/app/api/admin/support/_shared.ts`, `apps/hps-dealengine/app/api/admin/support/cases/route.ts`, `apps/hps-dealengine/app/api/admin/support/cases/[caseId]/route.ts`, `apps/hps-dealengine/app/api/admin/support/cases/[caseId]/events/route.ts`, `apps/hps-dealengine/lib/supportCases.ts`.
  - ✅ Slice 6 (Support Console correlation hardening + API UUID validation) complete in repo; ✅ validated in prod (2025-12-31).
  - Evidence (Slices 5-6): `docs/audits/o11y-support-prod-validate-2025-12-31_143756.zip`.
  - Files: `apps/hps-dealengine/app/(app)/admin/support/[caseId]/page.tsx`, `apps/hps-dealengine/app/api/admin/support/_shared.ts`, `apps/hps-dealengine/app/api/admin/support/cases/route.ts`, `apps/hps-dealengine/app/api/admin/support/cases/[caseId]/route.ts`, `apps/hps-dealengine/app/api/admin/support/cases/[caseId]/events/route.ts`, `apps/hps-dealengine/lib/supportCases.ts`, `docs/devlog-hps-dealengine.md`, `docs/roadmap-v1-v2-v3.md`.
- **Dashboard KPI Expansion (post Dual-Agent)**:
  - Promote selected candidates from `docs/dashboard/kpi-candidates.md` into real cards on `/dashboard`.
  - Close high-value gaps surfaced by `check:dashboard-coverage` (e.g., occupancy, structural flags, payoff buffer, Market Temp).
- **Policy Docs Hardening**:
  - ✅ Completed (PR #19): Phase 3B KPI inventory per_gate alignment + /overview labels (no raw key fallback).
  - ✅ Completed (PR #19): Phase 3C/3D docs wired to current code; placeholders removed.
  - `apps/hps-dealengine/lib/overviewRiskTimeline.ts`
  - `docs/dashboard/kpi-inventory.json`
  - `docs/domain/risk-gates-and-compliance.md`
  - `docs/engine/knobs-and-sandbox-mapping.md`
  - `docs/app/routes-overview.md`
- ✅ **Environment hygiene**: standardize lint entrypoint (`pnpm -w lint`) and add valuation spine drift doctor script to catch missing tables/functions early; CI guard prevents committing deno.lock v5 (Supabase Edge supports lockfile v4) and per-function deno.json is adopted for valuation functions.
  - Evidence: devlog 2025-12-24 (Ops: Edge function deploy hygiene) + devlog 2025-12-13 (Slice 2.2.1 — release hygiene); doctor defaults to offline pass with optional online checks and runs in CI.
  - Files: `scripts/doctor-valuation-spine.ps1`, `supabase/functions/deno.lock`, `supabase/functions/v1-valuation-run/deno.json`, `supabase/functions/v1-valuation-continuous-calibrate/deno.json`, `.github/workflows/ci.yml` (check-deno-lock-version).
- **AI Persona Voice Tuning**:
  - Tri-agent pipeline (Analyst, Strategist, Negotiator) is already live via persona-aware `v1-ai-bridge`; Negotiator runs against `docs/ai/negotiation-matrix/*` and `negotiation_logic_tree.json`.
  - V2 focus: refine tones/copy for each persona, expand the negotiation matrix under the documented schema, and enrich `docs/ai/assistant-behavior-guide.md` with examples.

## 4 V3 Themes (Planned)

### V3.0 AI Recommendations — PLANNED 📋

| Feature | Priority | Description |
|---------|----------|-------------|
| AI-Powered Deal Scoring | High | ML-based deal quality scoring |
| Market Trend Analysis | High | Predictive market analytics |
| Comparable Deal Matching | Medium | AI-driven comp selection |
| Automated Offer Generation | Medium | Smart offer recommendations |

**Dependencies:** V2.2 Timeline Enhancements, ML model training pipeline, Historical deal outcome data

- **Portfolio and analytics**: multi-deal/org dashboards, pipeline analytics, reporting/export.

  **Feature Brief:**
  Today DealEngine is deal-centric — you work one deal at a time through the underwriting flow. "Portfolio and analytics" extends this to org-wide visibility: seeing all your deals at once, understanding pipeline health, and exporting actionable reports.

  **Three Pillars:**
  | Pillar | What It Solves | Example Surfaces |
  |--------|----------------|------------------|
  | Multi-deal dashboards | "What's the state of my entire portfolio right now?" | Org-wide deal grid with filters (status, posture, market, risk gates, workflow state) |
  | Pipeline analytics | "Where are deals getting stuck? What's my conversion funnel?" | Funnel charts (Intake → Underwritten → Offer Sent → Under Contract → Closed), average DTM by stage, bottleneck flags |
  | Reporting/export | "How do I share this with partners, investors, or my bookkeeper?" | CSV/PDF exports of deal lists, underwriting summaries, P&L projections, audit-ready run logs |

  **Why It Matters (Business Context):**
  - **Investor reporting** — Distressed-deal investors want portfolio-level metrics: average ARV, total capital at risk, projected returns, deal velocity.
  - **Operational visibility** — You (or a team) need to see which deals are stale, which are blocked on evidence, which are ready for offers.
  - **Compliance & audit** — Exporting run histories + evidence linkage for due diligence, legal, or lender review.
  - **Scaling past 10-20 deals** — Single-deal views don't scale; operators need aggregate views to prioritize.

  **Architectural Sketch:**
  | Layer | New/Changed |
  |-------|-------------|
  | DB | Possibly new `org_analytics_snapshots` table or views aggregating runs, deals, evidence |
  | Edge / API | Aggregation endpoints (e.g., `v1-portfolio-summary`, `v1-pipeline-stats`) returning org-scoped rollups |
  | UI | New `/portfolio` or `/analytics` route(s) with filterable tables, charts (Recharts or similar), export buttons |
  | Export | Server-side PDF/CSV generation (likely via Edge Function + Storage signed URL) |

  **Open Questions (Before Slicing):**
  - What metrics matter most? (ARV distribution, spread ladder hit rates, risk gate pass/fail ratios, avg DTM by market?)
  - Who sees what? (Analyst vs. Manager vs. Owner role-based views?)
  - Real-time vs. snapshot? (Live queries or periodic background rollups for performance?)
  - Export format requirements? (Simple CSV? Branded PDF? Excel with formulas?)

- **Advanced financing and ROI layers**: cash-on-cash, IRR, financing scenarios, lender views.
- **Deep SRE/ops**: replay tooling, expanded OTel pipelines, advanced monitoring.
- **Ecosystem integrations**: CRM, billing/plan limits, larger integrations beyond underwriting core.
- **Risk connectors**: flood/climate risk provider integration with provenance-backed adjustments surfaced in valuation traces and UI.

---

## 4.5 Phase 7: Business Logic Sandbox Consolidation ✅ COMPLETE

**Status:** ✅ Complete
**Completion Date:** January 6, 2026
**Effort:** 5 slices

### Objectives Achieved
- [x] Remove 112 DROP_BACKLOG knobs from sandboxKnobAudit.ts
- [x] Add 2 new competitive-parity knobs (arvCompsMaxRadiusMiles, arvCompsSqftVariancePercent)
- [x] Fix speedBands pipeline wiring (5 knobs)
- [x] Clean up dead UX code (abcConfidenceGradeRubric, allowAdvisorOverrideWorkflowState)
- [x] Complete documentation

### Deliverables
- 87 KEEP knobs (final schema)
- Database migration for soft-delete (90-day rollback window)
- Complete wiring map documentation (docs/engine/knobs-and-sandbox-mapping.md)
- Devlog with decision rationale

### Key Decisions
1. **Soft-delete (not hard-delete) DROP_BACKLOG** — Preserve 90-day rollback capability
2. **Add comp filtering knobs** — PropStream/DealMachine competitive parity
3. **Remove unused UX knobs** — abcConfidenceGradeRubric and allowAdvisorOverrideWorkflowState were defined but never consumed

### Slice Summary

| Slice | Action | Impact |
|-------|--------|--------|
| A | Removed 112 DROP_BACKLOG knobs | -112 unused knobs from audit |
| B | Removed 2 dead UX knobs | -2 never-consumed knobs |
| C | Added 2 new competitive knobs | +2 PropStream/DealMachine parity |
| D | Fixed speedBands wiring | 5 knobs now flow UI→engine |
| E | Documentation & sealing | Full closeout |

---

## 4.6 Phase 8: Repairs Feature v3 — Bidding Cockpit ✅ COMPLETE

**Status:** ✅ Complete
**Completion Date:** January 9, 2026
**Effort:** 7 slices (A-G)

### Objectives Achieved
- [x] Slice A: Foundation Layer (type system, 13 categories, 64 line items, adapter pattern)
- [x] Slice B: UI Components + PDF Export (CategorySubtotal, EnhancedLineItemRow, RepairsSummary)
- [x] Slice C: Page Integration (EnhancedRepairsSection, responsive layout)
- [x] Slice D: Estimate Request Infrastructure (estimate_requests table, RLS, Edge Functions)
- [x] Slice E: Submission Portal (/submit-estimate page, RequestEstimateModal, ManualUploadModal)
- [x] Slice F: Modal Wiring (React Query mutations, toast notifications)
- [x] Slice G: Bidding Cockpit UI (12 components, Cyberpunk Penthouse aesthetic)
- [ ] Design Enhancement Audit (pending)
- [ ] E2E Testing (pending)
- [ ] Production Deploy (pending)

### Deliverables
- 35+ files created (~4,500 LOC)
- 20+ UI components with institutional-grade design
- estimate_requests table with RLS policies
- repair-estimates storage bucket
- 2 Edge Functions (v1-estimate-request, v1-estimate-submit)
- PDF export functionality
- 7 forensic code reviews completed

### Key Components (Slice G)

| Component | Purpose |
|-----------|---------|
| BiddingCockpit | Master container, bento grid layout |
| EstimateSummaryCard | Hero budget with animated count-up |
| RepairVelocityCard | Status tracking, velocity indicator |
| GCEstimatesPanel | Horizontal gallery with scroll |
| GCEstimateCard | Individual contractor card |
| EnhancedBreakdownPanel | Category list with progress bars |
| CategoryRow | Expandable category with line items |
| StatusBadge | Status indicator with pulse |
| ProgressBar | Single + multi-segment progress |
| SkeletonCockpit | Loading skeleton state |
| EmptyCockpit | Empty state with CTAs |
| designTokens | Design system tokens |

### Design Principles Applied
- Visual hierarchy with Bento grid layout
- Behavioral design (Hick's Law, Fitts's Law, Miller's Law)
- Disney animation principles (150-300ms timing)
- WCAG AA accessibility compliance
- Mobile-first responsive design

---

## 5 Technical Debt Tracker

### Resolved in V2.1
- ✅ TypeScript strict mode compliance
- ✅ Component test coverage
- ✅ RLS policy validation
- ✅ Import path standardization

### Pending

| Item | Priority | Target |
|------|----------|--------|
| Visual regression tests | Medium | V2.2 |
| Snapshot versioning | Low | V2.2 |
| Real-time subscriptions | Medium | V2.2 |
| Large portfolio optimization | High | V2.2 |

---

**Last Updated:** 2026-01-09
**Maintainer:** HPS DealEngine Team
