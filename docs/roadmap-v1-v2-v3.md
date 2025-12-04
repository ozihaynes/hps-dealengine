# HPS DealEngine - Roadmap v1 · v2 · v3 (Updated 2025-12-01)

---

## 0️⃣ Alignment Check (What’s Already True in the Repo / DB)

This section is the grounding layer: it describes what already exists and is working in the repo and database. Everything else in this roadmap assumes these pieces are real and should **not** be re-invented from scratch.

When reading this as an agent (Codex / ChatGPT), treat this section as **facts about the current system**.

---

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

    - `/startup` is a chrome-free first screen.
    - `/deals` lists org-scoped deals via `get_caller_org` + RLS; create/select sets `DealSession` and routes to `/overview`.
    - `DealGuard` (in `(app)` layout) bounces protected routes to `/deals` until a deal is selected.

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

  - `organizations` — one portfolio / business entity per row.
  - `memberships` — link users to orgs with a role; RLS anchored here:

    - Pattern: `auth.uid()` → `memberships` → `org_id` filter.

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

## 1️⃣ v1 Definition of Done (Field-Ready)

v1 is the “deterministic underwriting OS” milestone. v1 is **not done** until:

- The tool is fully usable end-to-end for real deals.
- Underwriting is deterministic and explainable.
- Evidence, overrides, and AI all attach to **real** runs and deals.
- The app is visually consistent (close to `ui-v2`) on core flows.
- User and sandbox settings are persisted and applied.
- You can take the tool into the field and run real HPS deals **without hacking around the system**.

This section defines what must be true in production for v1 to be considered done.

---

### 1.1 Backend — Engine and Persistence

- All core underwriting math runs in **Edge Functions**, not the browser:

  - `v1-analyze` is the **single Source of Truth** for:

    - Respect Floor.
    - Buyer Ceiling.
    - Double-close adjustments.
    - Risk gates / postures.
    - Raw outputs + trace + hashes.

  - `v1-repair-rates` is the **Source of Truth** for repair pricing per org/market.

- All persistent writes go through Postgres with RLS:

  - `runs` for engine outputs.
  - `repair_rate_sets` for repair rates.
  - Deals table as canonical deal identity.
  - Evidence tables for files/documents.
  - Override tables (`policy_override_requests`, etc.) for governance.

- No critical logic lives only in the browser:

  - Browser is allowed to:

    - Format and group outputs.
    - Provide calculators anchored to outputs.

  - Browser is **not allowed** to be the first/only place where final underwriting numbers are computed.

- Determinism:

  - For any given `(org_id, posture, input_hash, policy_hash)`:

    - `v1-analyze` + `v1-runs-save` always produce **bit-identical**:

      - `output`
      - `trace`
      - `policy_snapshot`

    - `v1-runs-replay` uses stored snapshots/hashes to reproduce the same numbers.

---

### 1.2 Frontend — SPA Shell and Pixel Parity

- UI is a **Next.js 14 App Router SPA**:

  - `(app)` shell wraps the main signed-in experience.
  - All key tabs (Overview, Underwrite, Repairs, Trace, Runs, Settings, Sandbox, Sources) share the same top nav, mobile nav, and layout chrome.

- Pixel parity (or near-parity) with `ui-v2` on:

  - `/overview` — negotiation-ready snapshot of each deal.
  - `/underwrite` — full input grid + output summary + info-needed banners + overrides surface.
  - `/repairs` — QuickEstimate and detailed estimator fully wired to live repair rates.
  - `/sandbox` — scenario playground influenced by sandbox settings.
  - `/settings` — user/settings flows that look finished, not placeholder.
  - `/trace` — run history and step-by-step trace visualization.
  - `/runs` — list of runs and drill-downs.

- User + sandbox settings:

  - User-level preferences are stored in `user_settings` and applied on:

    - Default posture (e.g., Base).
    - Default market (e.g., ORL).
    - Theme and UI prefs.

  - Sandbox settings (org/posture-level) control:

    - Scenario ranges.
    - Stress tests.
    - Toggles used in `/sandbox` and possibly `/underwrite`.

  - Sandbox presets (org/posture-level) are saved in `sandbox_presets` via `v1-sandbox-presets`; `/sandbox` loads, saves, and deletes presets using caller JWT with posture-aware config merging.

- Navigation:

  - Desktop top nav and `MobileBottomNav` both:

    - Reflect current route.
    - Allow switching between core tabs without layout glitches.

  - No obviously broken or dead routes in the main v1 surface.

---

### 1.3 Audit / Governance — Always Explainable

- Every material action:

  - Is persisted to Postgres.
  - Carries `org_id` and `actor_user_id` derived from `auth.uid()` and `memberships`.
  - Leaves behind an audit trail via `audit_logs`, `runs`, evidence tables, and override tables.

- Evidence:

  - Tied to real deals and runs:

    - Each evidence row includes `deal_id`, optional `run_id`, and a `kind` classification.

  - It’s always possible to answer:

    - “What evidence was on file when this underwriting decision was made?”

- Overrides:

  - Policy-sensitive changes (thresholds, spreads, caps) go through `policy_override_requests`.
  - Approvals/denials are logged and appear in trace as explicit override events.

- AI:

  - Only reasons over engine outputs, policy tokens, evidence summaries, and trace.
  - Never invents new numbers.
  - Always explains the “why” for recommendations.

---

## 2️⃣ Foundations Already in Place (Do Not Re-Work)

These are the **platform foundations** that already exist and are working. Agents should **build on these**, not fork or re-invent them.

---

### 2.1 Supabase & Schema

- Multi-tenant backbone:

  - `organizations` + `memberships` with RLS based on `auth.uid()`.
  - Helper functions in SQL (e.g., `get_caller_org`, `is_org_member`, `is_org_manager`) are designed to standardize org resolution and role checks.

- Domain tables (live):

  - `policies` / `policy_versions` (+ `policy_versions_api` view).
  - `runs` (with hashing + trace).
  - `repair_rate_sets` (+ any related lookup tables) with audit triggers.
  - Canonical org-scoped deals table.
  - `user_settings` tied to audit logging and RLS.
  - `sandbox_settings` and `sandbox_presets` with RLS/audit for org/posture defaults and saved presets used by `/sandbox`.
  - Evidence tables and `audit_logs` for row-level history.

- RLS patterns are standardized and must be reused for new tables.

---

### 2.2 Edge Functions

- Live and integrated with the app:

  - `v1-ping`
  - `v1-analyze`
  - `v1-policy-get`
  - `v1-policy-put`
  - `v1-runs-save`
  - `v1-repair-rates`

- Available in the repo, may be iterated/hardened:

  - `v1-ai-bridge`
  - `v1-evidence-start`
  - `v1-evidence-url`
  - `v1-runs-relay`
  - `v1-runs-replay`
  - `v1-policy-override-request`
  - `v1-policy-override-approve`
  - `v1-user-settings` (design locked; implementation in progress per this session).

---

### 2.3 App Shell & Routes

- App Router structure:

  - `app/layout.tsx` - global, includes root-level `DealSessionProvider`.
  - `app/(app)/layout.tsx` - authenticated shell with:

    - `AuthGate`
    - `DealGuard` (requires active deal)
    - Shared nav (top + mobile).

- Core routes:

  - `/` - basic marketing / landing or redirect.
  - `/login`, `/logout`, `/startup` - Supabase auth flows + pre-app startup dashboard (no shell chrome).
  - `(app)` group:

    - `/overview`
    - `/underwrite`
    - `/repairs`
    - `/trace`
    - `/runs`
    - `/settings` (and nested)
    - `/sandbox`
    - `/sources`
    - `/ai-bridge/debug`
    - `/debug/ping`

- `DealSessionProvider` (root-level):

  - Central context for:

    - Active deal.
    - Latest run.
    - Policy snapshot.

  - Used across `/overview`, `/underwrite`, `/repairs`, `/trace`, `/startup`, etc.

---

### 2.4 Engine, Runs & Trace

- `packages/engine`:

  - Contains deterministic underwriting logic.
  - Organized by concerns: inputs, policy application, double-close, thresholds, etc.
  - Tested with TypeScript tests.

- `_vendor/engine`:

  - Bundled into Supabase Edge Functions.
  - `v1-analyze` calls into this for all math; no duplicate logic.

- Runs path is already a vertical slice in dev:

  - Frontend:

    - `/underwrite` → calls `v1-analyze`, then `v1-runs-save`.

  - Backend:

    - `runs` table persists the execution.

  - UI:

    - `/trace` inspects runs and trace for the selected deal/run.

---

### 2.5 Repairs Stack

- Backend:

  - `repair_rate_sets` is live with seeded ORL defaults and posture-aware defaults/active flags.
  - `v1-repair-rates` returns normalized `RepairRates` payload (psfTiers, big5, lineItemRates, profile metadata) with caller JWT + CORS.
  - `v1-repair-profiles` supports list/create/update/activate with membership/org validation.

- Contracts & math:

  - Contracts for repair rates/profiles live in `packages/contracts` (`repairs.ts`).
  - `apps/hps-dealengine/lib/repairRates.ts` and `lib/repairsMath.ts` encapsulate:

    - Rate lookup.
    - Section totals.
    - Big 5 additions.

- UI (confirmed this session):

  - `/repairs` route renders:

    - QuickEstimate (PSF tiers).
    - Detailed estimator sections:

    - Kitchens & Bathrooms
    - Systems & Major Components
    - Exterior & Structural
    - Interior Rooms & Finishes

    - All sections now compute correctly, including Big 5 and QuickEstimate, fully wired to live rates and active profile metadata.
  - `/sandbox` includes a Repairs tab to edit/clone/activate profiles and sync them into DealSession.
- ✅ Repairs Sandbox list for QA Org / ORL / base resolves org via dealId and returns the seeded active/default profile; `v1-repair-rates` uses the same deal-first org resolution and no longer falls back to defaults. Repeat this pattern for additional markets/postures as they are added.

---

### 2.6 Testing, Tooling & Pixel Parity Tripwires

- Tooling:

  - `pnpm` workspace with:

    - `packages/contracts`
    - `packages/engine`
    - `apps/hps-dealengine`

  - Strict TypeScript.

- Commands:

  - `pnpm -w typecheck` — workspace-wide TS check.
  - `pnpm -w build` — builds engine, contracts, and app.
  - `pnpm -w test` — test suite (unit / integration) as configured.

- Visual regression:

  - Playwright tests (e.g. `tests/e2e/pixel.spec.ts`) exist for:

    - `/overview`
    - `/underwrite`
    - `/repairs`
    - `/sandbox`
    - `/settings/user` (or equivalent)
    - `/underwrite/debug`

  - These act as pixel tripwires; snapshots will be used as part of local CI.

---

## 3?? v1 Status (Field-Ready) ✅

v1 is **field-ready**. Completed slices:

- ✅ Startup "Run New Deal" creates real deals with client/contact info; `/deals` shares the same creation path; `/overview` shows contact popover with safe fallbacks.
- ✅ Auth + deals + sessions + runs/trace anchored to the canonical deals table with deterministic hashes and DB constraints enforcing `runs.deal_id` for new rows.
- ✅ Evidence stack and freshness (payoff/title/insurance/repairs) via `v1-evidence-start` / `v1-evidence-url`, UI freshness banners, and auto-refresh after upload.
- ✅ Policy governance and overrides: governed tokens, request/approve flows, trace visibility; UI role gating (analyst read-only, manager/owner/VP editable).
- ✅ Repairs engine and profiles (org/posture/market), sandbox integration, `/repairs` + Big 5 alignment, and trace snapshot. QA Org / ORL / base seeded and aligned; extend the pattern for new markets/postures as needed.
- ✅ Business Logic Sandbox v1 knobs + presets persisted per org/posture and bridged into engine inputs.
- ✅ AI Strategist surfaces remain advisory-only and grounded in runs/policy/evidence/sandbox.
- ✅ UI shell and routes (`/overview`, `/underwrite`, `/repairs`, `/trace`, `/settings`, `/sandbox`, `/sources`) ready for field use; session continuity + unsaved-change prompts in critical flows.
- ✅ Local CI script `scripts/local-ci.ps1` runs typecheck/test/build and can gate Playwright with `PLAYWRIGHT_ENABLE=1`; golden-path Playwright test covers login → startup → run new deal → overview.
- ✅ Launch checklist added (`docs/LAUNCH_CHECKLIST_V1.md`).

## 4?? v1 Field-Ready Acceptance Criteria

v1 now meets the field-ready bar. In practice this means:

- Every underwrite is anchored to a deals row and saved as a `runs` row with deterministic hashes; `/overview`, `/underwrite`, `/repairs`, `/trace` all read from engine outputs and saved runs, never browser-only math.
- Evidence (payoff, title, insurance, repairs) is attached to deals/runs with freshness banners; missing or stale items are surfaced.
- Governed knobs are locked for analysts; overrides are requested, approved, and visible on trace with approver and justification.
- Repairs are deterministic via org/posture/market repair profiles, and Big 5 matches the detailed estimator; active profile metadata is shown in UI and trace snapshots.
- Business Logic Sandbox v1 knobs persist per org/posture, flow into engine inputs, and can be saved/loaded as presets.
- AI Strategist on `/overview` and `/sandbox` is advisory-only, grounded in runs + sandbox + evidence + overrides, and never invents numbers or writes to the DB.
- Local CI script (`scripts/local-ci.ps1` running typecheck/test/build/Playwright) is green; Playwright specs are opt-in locally via `PLAYWRIGHT_ENABLE=true`.

### 4.1 v1.2 / Hardening Backlog

- 🟡 Numeric ergonomics expansion across Repairs and Sandbox numeric fields (extend `NumericInput` to Big 5, line items, sandbox knobs).
- 🟡 Repairs & Sandbox productization (bulk category editing, presets, improved Sandbox/KPI linking and display).
- 🟡 Playwright coverage expansion (governed knobs by role, evidence upload + freshness, session continuity reload/restore, overrides request/approve).
- 🟡 Bulk operations & scale features (bulk overrides, bulk repair profile operations and additional exotic categories).
- 🟡 Deeper data connectors (MLS/county/FEMA/tax/insurance) feeding evidence and sandbox knobs under RLS.
- 🟡 Analytics & reporting (org-level dashboards over deals/runs/outcomes; basic export/report utilities).
- 🟡 Additional operational UX (notifications/logging for override workflows; richer evidence tagging/categorization).

### v1.1 – UX & Flow Hardening (Completed 2025-12-09)

- ✅ Numeric input ergonomics: empty = truly empty (Scenario Modeler uses `NumericInput`; broader Repairs/Sandbox expansion queued in v1.2).
- ✅ Role-based UX on governed knobs: analysts read-only for Debt & Liens / Timeline & Legal / Policy & Fees with Request Override; owner/manager/VP editable; approvals visible in Overrides surfaces.
- ✅ Startup flow as first-class "New Deal": demo defaults removed; requires real client/contact/address; Startup and `/deals` "New Deal" share the same creation path and validations.
- ✅ Evidence UX: evidence upload auto-refreshes the list and banners without manual page reload or re-selecting the deal.
- ✅ Session continuity & unsaved changes: last active `dealId` + route persisted/restored on load; `useUnsavedChanges` warns on `beforeunload` for critical forms.

---

## 5️⃣ Phase 2–3 (v2 / v3) — High-Level Only

v2 and v3 are directional; details will be elaborated once v1 is stable in the wild.

### v2 – Connectors, Strategy Packs, Multi-Posture

- **Connectors Proxy**

  - `v2-connectors-proxy` Edge Function:

    - Unified gateway for MLS, county, FEMA, tax, insurance, and other property data.
    - Handles authentication, caching, and normalization.

- **Property Snapshots**

  - `property_snapshots` table:

    - Per-address cache of external data.
    - TTL-based for reproducible underwriting within a defined window.

- **Strategy Packs**

  - Multiple configurable “buy boxes” per investor/org.
  - UI for selecting a strategy pack per deal.
  - Policy tokens derived from selected strategy.

- **Multi-Posture Matrix**

  - Conservative/Base/Aggressive side-by-side comparisons.
  - Underwrite view showing matrix of outputs across postures.

### v3 – Ecosystem, Billing & SRE

- **AVM**

  - `v3-avm-predict` Edge Function:

    - AVM suggestions grounded in evidence and comps.

  - `avm_runs` table:

    - Logs inputs, outputs, and evidence for AVM predictions.

- **CRM Integration**

  - `crm_connections` + `v3-crm-sync`:

    - Push deals/runs into external CRMs.
    - Configurable mapping to stages, pipelines, custom fields.

- **Billing**

  - Stripe integration:

    - `plans`, `org_subscriptions`, `usage_counters`.

  - Plan enforcement:

    - Quotas on runs, seats, and connectors.
    - Upgrade prompts wired into UI.

- **SRE / Observability**

  - OpenTelemetry instrumentation:

    - Traces for edge functions and key UI flows.

  - Golden replay jobs:

    - Watch for regressions in engine outputs and AVM.

  - Failure testing:

    - Chaos/failure simulations for key services.

---

## 6️⃣ Using This Roadmap with Codex (or Any Agent)

This section is written directly for AI agents (Codex, ChatGPT, etc.) that will operate on this repo.

1. **Always read and obey, in this order:**

   - `docs/primer-hps-dealengine.md`
   - `docs/roadmap-v1-v2-v3.md` (this file)
   - `AGENTS.md`

2. **Work in vertical slices, not horizontal refactors.**

   - Pick one sprint and one slice (e.g., “Sprint 4 → v1-user-settings deployment and /settings/user page”).
   - Finish that slice end-to-end:

     - Schema (if needed).
     - Edge function.
     - Contracts.
     - Client helpers.
     - UI wiring.
     - Tests.

3. **Execution rules (per slice):**

   - Provide **full file contents** when editing; do not use `...` or omit imports.

   - Use **copy-paste-ready** PowerShell commands:

     - One command block at a time, of the form:

       ```powershell
       Set-Location "C:\Users\oziha\Documents\hps-dealengine"
       <single-command-here>
       ```

   - After each code step:

     - Run `pnpm -w typecheck` at minimum.
     - For larger changes, also run:

       - `pnpm -w build`
       - `pnpm -w test`
       - `npx playwright test` (when UI is impacted).

4. **RLS-first and no `service_role` in user flows.**

   - All edge functions must:

     - Use anon Supabase client with caller JWT (`Authorization: Bearer <token>`).
     - Derive `org_id` from `memberships` and/or helper SQL functions.

   - Never embed `service_role` keys in browser or normal app flows.

5. **Summaries & devlog mindset.**

   - After completing a slice:

     - Summarize:

       - Files touched.
       - Tables/functions changed.
       - Which parts of this roadmap were fully implemented vs partially.

     - Suggest devlog notes in the style of existing devlogs (where present).

6. **Respect determinism and auditability.**

   - Any change that affects engine outputs or policy must:

     - Preserve deterministic hashes in `runs`.
     - Preserve or extend audit logging via `audit_logs`.

   - Any AI change must:

     - Keep AI as a strategist on top of deterministic data.
     - Never circumvent RLS or determinism.

By following this roadmap and the primer/AGENT instructions, Codex (and other agents) can drive HPS DealEngine from its current state to a **production-ready v1**, and then onward to v2 and v3.







