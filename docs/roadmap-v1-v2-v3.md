# HPS DealEngine - Roadmap v1 · v2 · v3 (Updated 2025-11-30)

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

---

### 0.3 App Structure

- Frontend is a **Next.js 14 App Router** app under `apps/hps-dealengine`.

- `(app)` group forms the **protected dashboard shell**:

  - Routes include:

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

- Core layout components:

  - `app/layout.tsx` - global HTML shell, theme, fonts, and **root-level `DealSessionProvider`** (all routes share session context, including `/startup` and `/login`).
  - `app/(app)/layout.tsx` - authenticated dashboard shell (no nested session provider):

    - `AuthGate` for session guard.
    - `DealGuard` (requires active deal for protected routes).
    - `AppTopNav` for desktop nav.
    - `MobileBottomNav` for mobile nav (now implemented + wired).

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

  - `repair_rate_sets` is live with seeded ORL defaults.
  - `v1-repair-rates` returns normalized `RepairRates` payload:

    - `{ asOf, market, source, version, psfTiers, big5, items? }`.

- Contracts & math:

  - Contracts for `RepairRates` shape live in `packages/contracts`.
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

    - All sections now compute correctly, including Big 5 and QuickEstimate, fully wired to live rates.

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

## 3️⃣ Remaining Work to Finish v1 (Repo-Aligned Sprints)

The remaining v1 work is organized into **sprints**, each a bundle of vertical slices. For each sprint below, there is a split between:

- **Already in place (from this and prior sessions)**.
- **Remaining tasks (what Codex / future work should do)**.

Agents should **not** jump across sprints in one shot; work them vertically.

---

### 🧱 Sprint 0 – Auth Bridging, Deals & Engine-as-Source-of-Truth

**Goal:** Anchor everything to real users and org-scoped deals, with the engine in Edge Functions as the single Source of Truth for numbers.

#### 0.1 Auth Bridging (Client ↔ Server)

**Already in place**

- Supabase client helpers for client-side use (`lib/supabaseClient.ts`) with `getSupabaseClient`.
- `AuthGate` protecting `(app)` routes using Supabase session on the client.
- Root redirect `/ -> /login`; `/login` defaults to `/startup` when `redirectTo` is absent.
- `DealSessionProvider` lives at the root layout so `/login`, `/startup`, and `(app)` routes share the same session context.

**Remaining**

- Add server-side Supabase helpers:

  - `lib/supabase/server.ts` (or equivalent) for Route Handlers / server components.
  - Ensure they read cookies and never use `service_role`.

- Normalize redirection logic:

  - All `(app)` routes must redirect to `/login?redirectTo=<original>` if there is no session.
  - Handle “session expired” cases gracefully.

#### 0.2 Deal Model & Use of Canonical Deals Table

**Already in place**

- Canonical deals table is present (`20251109000708_org_deals_and_audit_rls.sql`) with RLS + audit.
- Runs table includes `deal_id` column (or is prepared to).

**Remaining**

- Ensure `runs.deal_id` is always populated:

  - When calling `v1-analyze` / `v1-runs-save`, call with an explicit `deal_id`.
  - Enforce via code paths and (if necessary) DB constraints.

- Make sure there is no “shadow deals” concept:

  - Remove leftover JSON-only deal stubs in the app that are not backed by the canonical table.

#### 0.3 “My Deals” & Deal-Scoped Routing

**Already in place**

- `DealSessionProvider` and hooks exist to carry an active deal through tabs.
- `/deals` route lists org-scoped deals via Supabase (`get_caller_org` + `from("deals").select(...).eq("org_id", orgId).order("created_at", { ascending: false })`), inserts new deals, sets `DealSession` on create/select, and navigates to `/overview`.
- `/startup` (chrome-free, top-level route) mirrors the `/deals` query/display, allows Run New Deal -> `/overview` (blank session), and row click -> setDbDeal + setDeal(payload) -> `/overview`.

**Remaining**

- Add explicit entry points (nav/CTA) to surface `/deals` from the main shell and handle empty-state messaging on `/startup` when no deals exist.

#### 0.4 Engine as Single Source of Truth

**Already in place**

- `v1-analyze` uses `_vendor/engine` for all math.
- `/underwrite` already calls `v1-analyze` and `v1-runs-save` in at least one happy path.

**Remaining**

- Remove any path where `packages/engine` is called directly in the browser for **final** outputs.
- Enforce that all numbers displayed in Overview/Underwrite summaries come from:

  - Either a live call to `v1-analyze` (followed by `v1-runs-save`), or
  - A previously saved `runs` row.

---

### 🧱 Sprint 1 – Evidence Flows (Info-Needed Killer)

**Goal:** Turn “info needed” hints into real evidence workflows wired to Storage + Postgres.

#### 1.1 Edge Functions

**Already in place**

- `v1-evidence-start` and `v1-evidence-url` are implemented; recent session fixed the query filtering logic to correctly scope by `deal_id` / `run_id` with RLS and audit.

**Remaining**

- Apply ensure migrations in hosted Supabase (`supabase db push`) and monitor logs for RLS/schema errors; keep Zod validation aligned with `packages/contracts`.

#### 1.2 Evidence Client Helpers

**Already in place**

- `apps/hps-dealengine/lib/evidence.ts` exists and provides basic helpers for evidence URLs.

**Remaining**

- Keep helper aligned with contracts and RLS (no `service_role`); watch for hosted errors (e.g., 42703) and adjust selects if schema evolves.

#### 1.3 EvidenceUpload Component

**Already in place**

- Basic upload logic and evidence listing patterns exist in the UI.

**Remaining**

- Keep `EvidenceUpload` UX stable; surface inline errors instead of redirects.

#### 1.4 Wiring into Underwrite & Trace

**Remaining**

- Underwrite/Trace list evidence tied to deal/run; continue surfacing missing-evidence states and signed links without redirecting users.

---

### 🧱 Sprint 2 – Policy Governance & Overrides

**Goal:** Put governance around sensitive policy changes via override requests instead of ad-hoc edits.

#### 2.1 Override Table & RLS

**Already in place**

- Schema and governance migration (`20251126225643_policy_overrides_governance.sql`) are present and have been refined in a prior session.
- RLS ensures:

  - Org members can create/view their org's override requests.
  - Approver roles can resolve requests.
- Enum extended so `membership_role` includes `owner`, and update policy (`20251127220000_policy_overrides_manager_update_rls.sql`) allows manager/vp/owner roles to approve/reject overrides.

**Remaining**

- Confirm schema completeness in hosted Supabase (`policy_version_id`, field/values/justification/status/timestamps) and keep RLS tight against org/user spoofing.

#### 2.2 Override Functions

**Already in place**

- `v1-policy-override-request` and `v1-policy-override-approve` exist in the repo and compile.

**Remaining**

- Monitor edge function deployment in hosted env; keep contracts in sync and ensure approvals/denials audit/log correctly.

#### 2.3 Lockable Fields in Underwrite UI

**Already in place**

- Policy-sensitive fields exist in the Underwrite UI.

**Remaining**

- Extend those fields to support:

  - `locked` state (for non-approver roles).
  - `onRequestOverride` callback to open a modal.

- For non-approvers:

  - Show lock icon + “Request override” button instead of direct edit.

#### 2.4 Request Override Modal & Trace Integration

**Remaining**

- `RequestOverrideModal`:

  - Collects:

    - Proposed new value.
    - Justification.

  - Calls `v1-policy-override-request` and shows success/error states.

- Trace:

  - Show approved overrides in the run trace:

    - Example: `Override: min_spread 0.10 → 0.08 (approved by Manager on 2025-11-21)`.

---

### 🧱 Sprint 3 – Repairs: Rates, TTL & UX Polish

**Goal:** Take the now-working Repairs tab and harden it for production (performance, caching, UX).

#### 3.1 RepairRates Hook with TTL & Market Awareness

**Already in place**

- `/repairs` uses live `v1-repair-rates` outputs via `lib/repairRates.ts` / `lib/repairsMath.ts`.

**Remaining**

- Implement `useRepairRates` hook that:

  - Accepts market (from active deal, e.g. `ORL`) via `DealSession`.
  - Calls `v1-repair-rates` using caller JWT.
  - Caches results via:

    - React Query, or
    - manual cache + TTL (e.g. 24 hours) keyed by `org_id + market`.

#### 3.2 Wiring Across QuickEstimate & Detail (Verified)

**Already in place**

- As of this session, all 4 sections and QuickEstimate are wired and fixed:

  - Kitchens & Bathrooms.
  - Systems & Major Components.
  - Exterior & Structural.
  - Interior Rooms & Finishes.
  - Big 5 and QuickEstimate now compute correctly from real rates.

**Remaining**

- Confirm all unit costs are sourced exclusively from `RepairRates` payload (no leftover hardcoded numbers).

#### 3.3 Meta Display & Pixel Parity

**Remaining**

- Show meta bar above estimator:

  - `market` (e.g., `ORL`).
  - `version` of rate set.
  - `as_of` date.

- Refresh Playwright snapshots for `/repairs` after UX is locked.

---

### 🧱 Sprint 4 – AI Strategist, User Settings & Sandbox Settings

**Goal:** Wire `v1-ai-bridge` and settings so the app “feels like HPS out of the box” and AI behaves as a strategist, not a calculator.

#### 4.1 v1-ai-bridge Deployment & Contracts

**Already in place**

- `v1-ai-bridge` is hardened with env check (`OPENAI_API_KEY`), Zod contract enforcement, structured errors, and contracts in `packages/contracts`.

**Remaining**

- Redeploy to hosted Supabase and monitor logs for OpenAI/RLS failures.
- Continue to emphasize advisory-only responses; expand prompt context (run/policy/evidence summaries) without introducing new numeric sources.

#### 4.2 Strategist UI (Parked/Relocated) – 🟡

**Status**

- Strategist panel removed from `/underwrite`; now rendered on `/overview` only and hard-disabled via feature flag with clear messaging.
- `/sandbox` includes a Strategist chat powered by `v1-sandbox-strategist` (JWT membership enforced, OpenAI guardrails, posture + sandbox settings context). It currently calls OpenAI directly (not the shared AI bridge) and must remain advisory-only with no numeric invention.
- Do not call `v1-ai-bridge` until provider stability (e.g., OpenAI 429) is resolved; converge Strategist endpoints onto the shared bridge when stable.
- When re-enabled (v1-late), keep Strategist on `/overview` and maintain advisory-only behavior.

#### 4.3 User Settings & Sandbox Settings

**Already in place (from this session)**

- `user_settings` table + RLS + audit trigger; `v1-user-settings` edge function (JWT, org via memberships) with helper + `/settings/user` UI.
- `sandbox_settings` table (org/posture scoped) + RLS + audit trigger; `v1-sandbox-settings` edge function with helper + `/settings/sandbox` UI; `/sandbox` reads config defaults.
- `sandbox_presets` table (org/posture scoped) + RLS + audit trigger; `v1-sandbox-presets` edge function with client helpers; `/sandbox` now loads, saves, and deletes presets persisted in Postgres.
- Business Logic Sandbox stores posture-aware settings (`postureConfigs` plus base mirroring) so presets/settings keep per-posture values aligned.
- Contracts exported in `packages/contracts` for both settings slices; helpers use caller JWT (no `service_role`).

**Remaining**

- Verify hosted deployment (`supabase db push`, deploy `v1-sandbox-presets`, redeploy edge functions) and keep defaults aligned with contracts.
- Apply settings consistently across the shell (posture/market defaults, sandbox defaults) and refresh pixel tests after UI lock.

#### 4.4 Trace-Aware AI Responses & Guardrails

**Remaining**

- Input wiring:

  - When calling `v1-ai-bridge`, send:

    - Run `input`, `output`, `trace`.
    - Evidence summary for this `deal_id` + `run_id`.
    - Relevant user/sandbox configuration.

- Guardrails:

  - Enforce that AI:

    - Never updates DB directly.
    - Never overwrites numeric fields.
    - Only references numbers present in engine outputs/policy/evidence.

- Output format:

  - Design responses to emphasize:

    - Top risks.
    - Missing evidence.
    - Negotiation talking points.
    - Posture-specific recommendations.

#### 4.5 Local CI Script & Pixel Tripwires

**Remaining**

- Add `scripts/local-ci.ps1` that runs, in order:

  - `pnpm -w typecheck`
  - `pnpm -w test`
  - `pnpm -w build`
  - `npx playwright test`

- v1 is **not** considered ship-ready unless this script is green.

---

## 4️⃣ v1 Field-Ready Acceptance Criteria

v1 is **field-ready** (usable on real distressed deals in Central Florida) when all of the following are true:

1. **Deterministic Engine Path**

   - All underwriting numbers in UI come from `v1-analyze` → `v1-runs-save` or from existing `runs` rows.
   - `v1-runs-replay` reproduces identical outputs and trace for any stored run.

2. **Deal-Centric Workflow**

   - You can:

     - Create a deal.
     - Underwrite it end-to-end.
     - Attach evidence.
     - Request and apply overrides (when appropriate).

   - Every run is linked to a `deal_id` and `org_id`.

3. **Repairs Confidence**

   - `/repairs` uses live `repair_rate_sets` via `v1-repair-rates`.
   - QuickEstimate and all four detail sections are correct and explainable.
   - Big 5 flows are wired and numeric; you can justify every line item.

4. **Policy & Overrides Governance**

   - Policy changes are versioned and replayable.
   - Overrides go through `policy_override_requests` and appear in trace.
   - You can inspect any run and see which overrides were active and why.

5. **Evidence Coverage**

   - Key evidence types (flood, HOA, insurance, inspections, photos) can be uploaded, stored, and retrieved per deal/run.
   - Underwrite and Trace clearly surface evidence gaps.

6. **AI Strategist**

   - AI summarizes risk, flags missing evidence, and explains tradeoffs.
   - AI never acts as a hidden calculator; all numbers it references are traceable to engine outputs, policy, or evidence.

7. **Pixel Parity & Stability**

   - `/overview`, `/underwrite`, `/repairs`, `/sandbox`, `/settings`, `/trace`, `/runs` are visually stable:

     - Either pixel-parity with `ui-v2`, or deliberate, documented deviations.

   - Playwright pixel tests cover these states and are green.

8. **Local CI**

   - `scripts/local-ci.ps1` (or equivalent) runs cleanly on demand.
   - It is run before:

     - Major refactors.
     - Deployments.
     - Handing the repo to another agent.

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
