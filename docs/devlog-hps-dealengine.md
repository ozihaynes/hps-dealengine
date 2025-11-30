# HPS DealEngine — Devlog

Lightweight running log of what’s actually been done and what’s next.  
This is the **“what changed, when, and what’s the next move?”** companion to:

- `docs/primer-hps-dealengine.md` — stable architecture + non-negotiables.
- `docs/roadmap-v1-v2-v3.md` — roadmap, phases, and sprint framing.

Use this file to orient quickly before doing work or delegating to an agent.

---

## 0. How to Use This Devlog

- **Audience:** You (OZi), future collaborators, and AI agents.
- **Granularity:** High-level but concrete — no commit hashes, just meaningful milestones.
- **Sections:**
  - **0.x Status Snapshots** — current truth, kept up to date.
  - **Dated Entries** — chronological log of key changes.
  - **Near-Term Focus** — what we’ve agreed is “next” based on roadmap.

When something significant ships, changes direction, or gets blocked, add a dated entry here.

---

## 0.1 Current Status Snapshot (as of 2025-12-01)

**Project:** `hps-dealengine` — deterministic underwriting OS for distressed SFR/townhomes (initially Central Florida).

**Core truths right now:**

- **Architecture & Principles**

  - Primer and roadmap are written and live:
    - `docs/primer-hps-dealengine.md`
    - `docs/roadmap-v1-v2-v3.md`
  - Non-negotiables are locked:
    - Policy-driven rules in Postgres.
    - Determinism enforced via `runs` + hashes.
    - RLS-first, no `service_role` in user flows.
    - Vertical slices (UI → Edge → DB → Trace/Audit).

- **Backend / DB**

  - Supabase Postgres with RLS:
    - `organizations`, `memberships` for multi-tenant backbone.
    - Canonical `deals` table from `20251109000708_org_deals_and_audit_rls.sql`.
    - `policies`, `policy_versions` (+ view), `runs`, `repair_rate_sets`, `audit_logs` in place.
    - Evidence table hardened via idempotent ensure migrations (`filename`, `updated_at` guaranteed; triggers/RLS aligned).
    - `user_settings` (org/user scoped) and `sandbox_settings` (org/posture scoped) live with RLS + audit triggers.
    - `sandbox_presets` (org/posture scoped) created by `20251201120000_sandbox_presets.sql`, unique on `(org_id, name, posture)`, with RLS + audit/updated_at triggers for saved sandbox scenarios.
  - Edge Functions:
    - Live/hardened: `v1-ping`, `v1-analyze`, `v1-policy-get`, `v1-policy-put`, `v1-runs-save`, `v1-repair-rates`, `v1-user-settings`, `v1-sandbox-settings`, `v1-sandbox-presets`, `v1-evidence-start`, `v1-evidence-url`.
    - Hardened and in active use: `v1-ai-bridge` (env-check, structured errors).
    - Governance functions present: `v1-policy-override-*`, `v1-runs-*` (relay/replay) ready for UI wiring.
    - `_vendor/engine` wired into `v1-analyze` - engine math is coming from `packages/engine`.

- **Frontend**

  - Next.js 14 App Router app under `apps/hps-dealengine`.
  - `(app)` dashboard shell with navy theme:
    - Top nav, Mobile bottom nav, shared layout across `/overview`, `/underwrite`, `/repairs`, `/trace`, `/settings`, `/sandbox`, `/sources`.
  - `/login` implemented; `(app)` group guarded via `AuthGate` and `DealSessionProvider`.
  - `/sandbox` uses posture-aware configs with server-backed presets: loads defaults via `v1-sandbox-settings`, fetches/creates/deletes presets via `v1-sandbox-presets`, and merges posture-specific values when applying presets.

- **Repairs**

  - `repair_rate_sets` table live with ORL defaults and RLS.
  - `v1-repair-rates` returns normalized `RepairRates` payload (PSF tiers + Big 5 + meta).
  - `RepairsTab` + `repairsMath` + `repairRates` wired so:
    - QuickEstimate uses structured rates.
    - All four estimator sections compute totals correctly.

- **Engine / Runs / Trace**

  - `packages/engine` implements deterministic underwriting logic.
  - `v1-analyze` + `v1-runs-save` path works in dev.
  - `/underwrite` → run engine → `/trace` vertical slice is functional:
    - Deals can be analyzed and runs inspected with hashes/trace.

- **Tooling**
  - Monorepo with `pnpm` workspaces:
    - `apps/hps-dealengine`, `packages/engine`, `packages/contracts`, `packages/ui-v2`.
  - `pnpm -w typecheck` is green on the latest snapshot; `pnpm -w build` succeeds locally (clear `.next/trace` locks on Windows if needed).
  - Playwright E2E pixel tests exist for key screens (Overview, Underwrite, Repairs, Sandbox, UserSettings, UnderwriteDebug).

---

## 0.2 Near-Term Focus (Next Sprints from Roadmap)

Based on `docs/roadmap-v1-v2-v3.md`, near-term v1 focus is:

1. **Sprint 1 - Evidence Flows (stabilize)**

   - Apply latest ensure migrations (`supabase db push`) so `filename`/`updated_at` exist.
   - Keep `EvidenceUpload` + Trace listings green; monitor Supabase logs for 42703s.

2. **Sprint 2 - Policy Overrides (governance UI)**

   - Wire lockable fields + RequestOverride modal in Underwrite.
   - Add manager review/approve surface in Settings and Trace visibility.

3. **Sprint 3 - Repairs Polish**

   - Build `useRepairRates` with TTL + market awareness.
   - Meta bar + pixel-tight layout; refresh Playwright snapshots after lock.

4. **Sprint 4 - AI Strategist & Settings**
   - Keep Strategist advisory-only; finalize copy/UI and OpenAI stability.
   - Validate `/settings/user` + `/settings/sandbox` flows in hosted env.
   - Deploy `sandbox_presets` migration + `v1-sandbox-presets`, and verify `/sandbox` preset save/load/delete with posture-specific defaults.

This devlog should reflect which of these are “✅ done”, “🟡 in progress”, or “⏳ not started yet” over time.

---

## 1. Dated Entries

### 2025-11-30 - Auth + Startup onboarding rewired (live deals, root session provider)

- **Auth + routing flow**
  - `/` now redirects to `/login` (app/page.tsx); `/login` still uses Supabase email/password via LoginClient but defaults to `/startup` when `redirectTo` is absent.
  - Login UI now uses the glassmorphic `components/auth/SignInPage.tsx` as a presentational layer; LoginClient passes controlled props (email/password/loading/error/onChange/onSubmit). Button uses design-system Button (form submit driven by the form).
- **Startup dashboard**
  - `components/auth/StartupPage.tsx` now uses live Supabase data (org via `rpc("get_caller_org")`, deals via `from("deals").select(...).eq("org_id", orgId).order("created_at", { ascending: false })`) with search/date/sort; mock data removed.
  - `/startup` is a top-level, chrome-free route (`app/startup/page.tsx`) that renders the hero + Recent Deals. Run New Deal now goes to `/overview` with a blank DealSession; clicking a recent deal mirrors `/deals` selection (setDbDeal + setDeal(payload)) then routes to `/overview`.
- **Provider/layout architecture**
  - `DealSessionProvider` promoted to the root layout (`app/layout.tsx`) so `/startup`, `/login`, and `(app)` routes share the same session context; removed the nested provider from `app/(app)/layout.tsx` (still wrapped by `AuthGate`, `DealGuard`, App shell).
- **Safety / verification**
  - Fixed a Button typing issue in `SignInPage` (removed unsupported `type` prop); form submission still driven by `<form onSubmit>`.
  - `pnpm -w typecheck` and `pnpm -w build` run and pass after these changes.
- **Files touched (key)**
  - `apps/hps-dealengine/app/page.tsx`
  - `apps/hps-dealengine/app/login/page.tsx`
  - `apps/hps-dealengine/app/login/LoginClient.tsx`
  - `apps/hps-dealengine/components/auth/SignInPage.tsx`
  - `apps/hps-dealengine/components/auth/StartupPage.tsx`
  - `apps/hps-dealengine/app/startup/page.tsx`
  - `apps/hps-dealengine/app/layout.tsx`
  - `apps/hps-dealengine/app/(app)/layout.tsx`
- **Next steps**
  - Add explicit “View all deals” entry point in nav or startup when no deals exist (empty state and CTA).
  - Add E2E coverage for `/ -> /login -> /startup -> /overview` for both new and existing deals (DealSession populated vs blank).
  - Decide and document the desired default landing after selecting a deal (`/overview` vs `/deals`) and align nav affordances accordingly.

### 2025-11-26 - Primer & Roadmap Solidified

- Wrote and aligned the **core docs** that define how HPS DealEngine should behave:

  - `docs/primer-hps-dealengine.md`

    - Captures project purpose, core principles, architecture, data model, edge functions, frontend structure, and assistant/agent protocol.
    - Sets non-negotiables: determinism, policy-driven rules, RLS-first, vertical-slice delivery.

  - `docs/roadmap-v1-v2-v3.md`
    - Defines v1 (deterministic engine + runs + evidence + pixel-parity SPA) as the immediate target.
    - Outlines v2 (connectors, strategy packs, multi-posture) and v3 (AVM, CRM, billing, SRE) at a high level.
    - Breaks v1 into repo-aligned sprints:
      - Sprint 0: Auth + Deals + Engine as SOT.
      - Sprint 1: Evidence.
      - Sprint 2: Policy overrides.
      - Sprint 3: Repairs polish.
      - Sprint 4: AI Strategist.

- Clarified usage of this devlog:
  - This file is now explicitly the **“what changed / what’s next”** stream for humans and agents.
  - Primer + Roadmap are the stable reference; Devlog is allowed to be “live” and updated frequently.

**Status after this day:**

- Architecture, roadmap, and operating manual are now captured in repo-local docs.
- Next concrete move is to start executing Sprint 0 with the current codebase.

---

### 2025-11-24 to 2025-11-25 — Repairs Stack and SPA Shell Stabilization

**Repairs**

- Confirmed `repair_rate_sets` migration is live and wired:

  - ORL defaults seeded at the DB level.
  - RLS and audit behavior attached via triggers and policies.

- Verified `v1-repair-rates`:

  - Returns a normalized `RepairRates` object for the caller’s org/market.
  - Includes PSF tiers (light/medium/heavy) and Big 5 increments (roof, HVAC, repipe, electrical, foundation) plus meta (`as_of`, `source`, `version`, `market`).

- Frontend wiring:
  - `lib/repairRates.ts` and `lib/repairsMath.ts` updated so all Repairs math uses `RepairRates` instead of random constants.
  - `components/repairs/RepairsTab.tsx` updated to:
    - Drive **QuickEstimate** from PSF tiers.
    - Drive all **four estimator sections** (Kitchens & Baths, Systems & Major Components, Exterior & Structural, Interior Rooms & Finishes) from structured rate data.
  - Confirmed previously missing sections are now calculating correctly in dev.

**SPA Shell & Routing**

- `(app)` dashboard shell confirmed working:

  - `app/(app)/layout.tsx` wraps main routes with navy theme, shared header, and mobile bottom nav.
  - Main routes: `/overview`, `/underwrite`, `/repairs`, `/trace`, `/settings`, `/sandbox`, `/sources` all render inside the unified shell.

- `AuthGate` + `DealSessionProvider` used in `(app)` layout, so:
  - Protected routes only render when authenticated.
  - Shared deal/session state is available across tabs.

**Tooling / CI**

- Ran `pnpm -w typecheck` and `pnpm -w build` successfully across:

  - `packages/contracts`
  - `packages/engine`
  - `apps/hps-dealengine`

- Confirmed Playwright pixel tests exist and run for:
  - Overview, Underwrite, Repairs, Sandbox, UserSettings, UnderwriteDebug.

**Status after these days:**

- Repairs vertical slice (Edge function → helper → UI) is effectively **v1-ready**, pending:

  - `useRepairRates` hook with TTL + market awareness (Sprint 3).
  - Final UI polish + snapshot refresh.

- SPA shell is good enough for day-to-day dev; pixel-parity can be iterated later.

---

### 2025-11-22 — Route Consolidation and Visual Shell

- Focused on getting a cohesive SPA-style dashboard:

  - Unified navy theme across main app routes.
  - Ensured that `/overview`, `/underwrite`, `/repairs`, `/trace`, `/settings`, `/sandbox` all share the same shell.
  - Hooked up **top nav** and **bottom nav** components for consistent navigation on desktop and mobile.

- Confirmed that:
  - Core pages load without runtime errors in dev.
  - Navigation between major tabs is stable.
  - Dark/navy styling is applied across the main app surfaces.

**Status after this day:**

- Visual experience is no longer “fragmented pages”; it’s one cohesive app.
- This provided the foundation needed for the current roadmap’s Phase 1 (“SPA shell & shared deal session”).

---

## 2. Open Threads / TODOs (High-Level)

These are known gaps derived from the roadmap and recent work:

- **Auth Bridging (Sprint 0)**

  - [ ] Normalize Supabase server client (`lib/supabase/server.ts`) so Route Handlers and server components all use the same pattern.
  - [ ] Implement `redirectTo` behavior for protected routes when session is missing.

- **Deals & DealSession (Sprint 0)**

  - [ ] Treat the existing `deals` table as the only deal source.
  - [ ] Make `/deals` the canonical entry point for selecting/creating deals.
  - [ ] Ensure `DealSession` is always backed by a real `deals` row and latest `runs` record.

- **Evidence Flows (Sprint 1)**

  - [ ] Deploy `v1-evidence-start` / `v1-evidence-url` with `verify_jwt = true`.
  - [ ] Add `lib/evidence.ts` helpers.
  - [ ] Implement `EvidenceUpload` component and wire into `Underwrite` + `/trace`.

- **Policy Overrides (Sprint 2)**

  - [ ] Finalize and migrate `policy_override_requests` table.
  - [ ] Harden and deploy override functions.
  - [ ] Wire lockable fields + override modal into the UI.

- **Repairs Polish (Sprint 3)**

  - [ ] Implement `useRepairRates` with caching and market awareness.
  - [ ] Add meta bar (market, version, as_of) to Repairs UI.
  - [ ] Refresh Playwright snapshots for `/repairs` after UI is locked.

- **AI Strategist (Sprint 4)**
  - [ ] Deploy `v1-ai-bridge` with contracts.
  - [ ] Build Strategist sidebar using deterministic engine outputs and trace.
  - [ ] Add guardrails so AI never becomes a numeric source of truth.

---

## 3. How to Update This Devlog

When you make a meaningful change (or ask an agent to), append a new dated section:

- Use the format:

  - `### YYYY-MM-DD — Short Title`
  - Bullets for:
    - What changed.
    - Why it matters.
    - Any follow-ups or regressions.

- When a sprint item from the roadmap moves from planned → in progress → done:
  - Reflect it in:
    - A dated entry here.
    - Optionally, update the checklist in `docs/roadmap-v1-v2-v3.md` or the “Remaining Sprints” section.

This file is the story of how HPS DealEngine actually got from v1 → v2 → v3, one vertical slice at a time.

### 2025-11-26 - Sprint C  Policy Overrides Table + RLS

- Context: Sprint 2 / Sprint C – create `policy_overrides` table with `policy_version_id` and base RLS.
- Done:
  - Updated migration `20251126233123_create_policy_overrides.sql` to include `policy_version_id` on create.
  - Applied migrations locally (via `supabase db reset`), then ran `pnpm -w typecheck` and `pnpm -w build` (both green).
- Code Touched:
  - supabase/migrations/20251126233123_create_policy_overrides.sql
- Edge Functions / DB:
  - DB-only change: creates `public.policy_overrides` with RLS (org members can insert/select) and includes `policy_version_id`.
- Notes / Gotchas:
  - The table previously existed only in snapshot; governance migration skipped when absent. This create migration aligns schema and keeps governance migration for idempotent `policy_version_id` add.
- Next Up:
  - Harden `v1-policy-override-request`/`v1-policy-override-approve` to use `policy_version_id`, enforce org/role checks, and write audit/trace.

### 2025-11-27 - Sprint A  Anchor Auth + Deal Session

- Context: Sprint A – Anchor Auth + Deal Session (Auth bridging, canonical deals, engine-as-SOT).
- Done:
  - Added DealGuard to the `(app)` shell to force users to `/deals` when no deal is selected; root `/` and login now redirect to `/deals`.
  - Persisted selected deal in `DealSession`, rehydrate from Supabase on reload, and load the latest run for that deal (`runs.input->>dealId`) to seed `lastAnalyzeResult`.
  - `/deals` selection now syncs the in-memory deal payload into session state.
  - Underwrite now requires a selected deal, unwraps `v1-analyze` envelopes, and saves runs via `saveRun` with `dealId`/`orgId` (engine as source of truth).
  - `v1-runs-save` Edge Function accepts `dealId` and embeds it in the run input envelope for traceable, deal-scoped hashes.
  - Server Supabase helper now uses anon key only (no `service_role`) and supports bearer tokens for RLS-safe server calls.
- Code Touched:
  - apps/hps-dealengine/app/(app)/layout.tsx
  - apps/hps-dealengine/app/page.tsx
  - apps/hps-dealengine/app/login/page.tsx
  - apps/hps-dealengine/app/login/LoginClient.tsx
  - apps/hps-dealengine/app/(app)/deals/page.tsx
  - apps/hps-dealengine/app/(app)/underwrite/page.tsx
  - apps/hps-dealengine/lib/dealSessionContext.tsx
  - apps/hps-dealengine/lib/edge.ts
  - apps/hps-dealengine/lib/supabase/server.ts
  - supabase/functions/v1-runs-save/index.ts
- Edge Functions / DB:
  - Updated `v1-runs-save` contract to require `dealId` in the input envelope (stored in `input` JSON); no DB schema change.
- Notes / Gotchas:
  - Auth gating is handled via client AuthGate + DealGuard; middleware remains a no-op to avoid breaking Supabase localStorage auth tokens.
  - Latest run lookup depends on `dealId` being included in run input (now enforced when saving runs).
- Next Up:
  - Sprint B – Evidence flows (deploy `v1-evidence-*`, EvidenceUpload wiring in Underwrite/Trace).

### 2025-11-27 - Sprint B  Evidence Flows

- Context: Sprint B – Evidence Flows (info-needed to real evidence uploads).
- Done:
  - Hardened `v1-evidence-start` and `v1-evidence-url` with JWT enforcement, deal/run validation, org scoping, and evidence row insertion before issuing signed upload URLs.
  - Added client helpers to hash files, request signed upload URLs, upload via signed tokens, list evidence by deal/run, and sign short-lived view URLs.
  - Built `EvidenceUpload` component for deal/run attachments and wired it into Underwrite; captures runId from the latest saved run.
  - Trace view now lists evidence for the selected run with copyable signed links.
- Code Touched:
  - supabase/functions/v1-evidence-start/index.ts
  - supabase/functions/v1-evidence-url/index.ts
  - apps/hps-dealengine/lib/evidence.ts
  - apps/hps-dealengine/components/shared/EvidenceUpload.tsx
  - apps/hps-dealengine/app/(app)/underwrite/page.tsx
  - apps/hps-dealengine/app/trace/page.tsx
- Edge Functions / DB:
  - Evidence functions now require JWT, validate deal/run via RLS, insert evidence rows (org_id/deal_id/run_id/kind/storage_key/sha256/bytes/mime_type) before returning signed upload URLs; uses existing `public.evidence` table and `evidence` storage bucket (no schema change).
- Notes / Gotchas:
  - Evidence listings require `dealId` in run input; older runs without it will not show evidence in Trace.
  - Build shows existing Edge-runtime warnings from supabase-js imports; behavior unchanged from prior builds.
- Next Up:
  - Sprint C - Governance + Repairs Polish (override workflows, `useRepairRates` TTL/meta bar) once approved.

- CORS hardening (evidence):
  - Added shared CORS helper (`supabase/functions/_shared/cors.ts`) and wired both `v1-evidence-start` and `v1-evidence-url` to return CORS headers on all responses and OPTIONS preflight.
  - Evidence uploads now succeed from http://localhost:3000 with proper Access-Control-Allow-Origin/Headers/Methods.
- Evidence semantics update:
  - `v1-evidence-start` now treats `runId` as optional; if a provided run is missing or mismatched, it falls back to deal-level evidence instead of 500s.

### 2025-11-27 - Sprint C  Override Edge Functions Hardened

- Context: Sprint 2 / Sprint C - hardened override request/approve flows with policy_version_id and org/role checks.
- Done:
  - Added contracts for override request/approve inputs/results (`packages/contracts/src/policyOverrides.ts`, re-exported in `index.ts`).
  - Hardened `v1-policy-override-request`: CORS/json helpers, body validation, org lookup via memberships, active policy_version lookup per org/posture, inserts policy_overrides with policy_version_id and pending status.
  - Hardened `v1-policy-override-approve`: CORS/json helpers, body validation, org/role check (manager/vp/owner), org match on the override row, updates status/approved_by/approved_at.
  - Ran `pnpm -w typecheck` and `pnpm -w build` (green).
- Code Touched:
  - packages/contracts/src/policyOverrides.ts
  - packages/contracts/src/index.ts
  - supabase/functions/v1-policy-override-request/index.ts
  - supabase/functions/v1-policy-override-approve/index.ts
- Edge Functions / DB:
  - Uses `public.policy_overrides` with existing RLS; no schema change in this step (policy_version_id already on table).
- Notes / Gotchas:
  - policy_version lookup uses latest policy_versions row for org+posture; ensure policies table has active entries per posture.
- Next Up:
  - Lockable UI fields + RequestOverrideModal wired to these endpoints, and trace visibility for approved overrides.

### 2025-11-28 - Sprint 4  Sandbox Settings Vertical Slice

- Context: Sprint 4 / Strategist, Settings & Sandbox.
- Done:
  - Added `sandbox_settings` table with RLS (auth.uid + memberships), unique (org_id, posture), updated_at trigger, and audit trigger via migration `20251128171500_sandbox_settings.sql`.
  - Added contracts for sandbox settings/config (ranges + flags) and exported them in `@hps-internal/contracts`.
  - Implemented `v1-sandbox-settings` edge function (JWT + anon client, membership/org resolution, GET/PUT upsert).
  - Added client helper `lib/sandboxSettings.ts`, Settings page `/settings/sandbox`, and `/sandbox` now loads defaults from sandbox settings (or fallback defaults) before rendering.
- Next Up:
  - Deploy the new function and migration (`supabase db push`, `supabase functions deploy v1-sandbox-settings`) and validate `/settings/sandbox` and `/sandbox` read/write org/posture defaults.

### 2025-11-29 - Evidence & AI Bridge Hardening

- Evidence:
  - Added an idempotent ensure migration (`20251129003000_evidence_schema_ensure.sql`) to guarantee `public.evidence` includes `filename` and `updated_at`, aligns defaults, RLS, and triggers; prior ensure migrations remain harmless.
  - Helper/UI selects now match the authoritative schema (`id, org_id, deal_id, run_id, kind, storage_key, filename, mime_type, bytes, sha256, created_by, created_at, updated_at`), eliminating 42703 errors.
- AI Strategist:
  - v1-ai-bridge now logs request keys, enforces `{ dealId, runId, posture, prompt }`, checks `OPENAI_API_KEY`, and returns structured errors (400 payload, 403/404 RLS load, 502 OpenAI, 500 unexpected).
  - OpenAI call wrapped; strategist remains advisory-only. Client helper logs payload and surfaces edge errors cleanly.
- Next:
  - Run `supabase db push` and redeploy `v1-ai-bridge`; retest /underwrite evidence panel and Strategist Ask flow.

### 2025-11-30 - Roadmap Reconciliation & Settings/Sandbox Live

- Updated roadmap/devlog to reflect the current state:
  - Evidence schema + selects aligned; ensure migration guarantees `filename`/`updated_at`.
  - `v1-ai-bridge` hardened (env check + structured errors) and helper logging payloads.
  - `user_settings` and `sandbox_settings` vertical slices live (tables/RLS/audit, edge functions, helpers, `/settings/user`, `/settings/sandbox`, `/sandbox` consuming settings).
  - Strategist panel remains advisory-only; watching OpenAI reliability post-deploy.
- Next focus:
  - Run `supabase db push` + redeploy `v1-ai-bridge`; verify evidence and Strategist flows in hosted Supabase.
  - Finish override UI/trace surfacing and remaining Sprint 4 polish (Strategist copy/UI, pixel tripwires).

### 2025-12-01 - Sandbox Presets, Strategist, and Governance Hardening

- Context: Sprint 4 Sandbox & Strategist + Sprint 2 governance polish.
- Done:
  - Made SandboxConfig posture-aware in contracts (`SandboxConfigSchema` with `postureConfigs` + `globalSettings`; `SandboxPreset` now carries org/posture/createdAt/updatedAt) and aligned `v1-sandbox-settings` validation to the structured shape.
  - Added posture-aware helpers/constants (`POSTURE_AWARE_KEYS`, `mergeSandboxConfig`, `prepareSandboxConfigForSave`, `isPostureAwareKey`) and plumbed `/sandbox` save/preset flows through them.
  - Created `sandbox_presets` table via `20251201120000_sandbox_presets.sql` (unique `(org_id, name, posture)`, RLS via memberships, audit + updated_at triggers) and implemented `v1-sandbox-presets` (GET/POST/DELETE) with client helper `lib/sandboxPresets.ts`; `/sandbox` now fetches, saves, deletes presets server-side per posture.
  - Added Strategist contracts and `v1-sandbox-strategist` (JWT, OpenAI guardrails, posture-aware prompt) plus client helper `lib/sandboxStrategist.ts`; BusinessLogicSandbox chat now calls this endpoint with markdown rendering and inline error handling.
  - Updated BusinessLogicSandbox UI to respect posture-aware values (get/set per posture, mirror base to root for compatibility, posture-specific labels).
  - Governance: extended `membership_role` enum with `owner` (`20251127215900_membership_role_owner.sql`) and updated policy overrides UPDATE policy so manager/vp/owner roles can approve (`20251127220000_policy_overrides_manager_update_rls.sql`).
- Code Touched:
  - supabase/migrations/20251201120000_sandbox_presets.sql
  - supabase/migrations/20251127215900_membership_role_owner.sql
  - supabase/migrations/20251127220000_policy_overrides_manager_update_rls.sql
  - supabase/functions/v1-sandbox-presets/index.ts
  - supabase/functions/v1-sandbox-strategist/index.ts
  - supabase/functions/v1-sandbox-settings/index.ts
  - packages/contracts/src/sandboxSettings.ts
  - packages/contracts/src/sandboxStrategist.ts
  - packages/contracts/src/index.ts
  - apps/hps-dealengine/constants/sandboxSettings.ts
  - apps/hps-dealengine/lib/sandboxPresets.ts
  - apps/hps-dealengine/lib/sandboxStrategist.ts
  - apps/hps-dealengine/app/(app)/sandbox/page.tsx
  - apps/hps-dealengine/components/sandbox/BusinessLogicSandbox.tsx
- DB changes:
  - New `sandbox_presets` table with RLS/audit/updated_at.
  - `membership_role` enum extended with `owner`; policy overrides UPDATE policy now allows manager/vp/owner.
  - Sandbox settings schema validated against posture-aware config in `v1-sandbox-settings`.
- Tests:
  - `pnpm -w typecheck`: not re-run in this session (status unknown for these changes).
  - `pnpm -w build`: not re-run after prior `.next/trace` unlock; status not confirmed here.
- Next Up:
  - Deploy `sandbox_presets` and `v1-sandbox-presets`/`v1-sandbox-strategist` to hosted Supabase; verify preset save/load/delete per posture and Strategist responses under RLS.
  - Decide final `POSTURE_AWARE_KEYS` coverage and add UX for preset rename/duplicate; consider name collision handling.
  - Align Strategist with the broader AI bridge abstraction once stable, keeping current guardrails.
  - Refresh pixel/Playwright snapshots once `/sandbox` UX stabilizes.

### 2025-12-XX - Strategist parked; moved from Underwrite to Overview

- Context: Owner direction to park AI Strategist for v1 and surface strategy on `/overview` instead of `/underwrite`.
- Changes:
  - `apps/hps-dealengine/lib/aiBridge.ts` retains hard-stop feature flag; `fetchStrategistAnalysis` throws "Strategist is temporarily disabled while we finish v1."
  - Underwrite no longer renders Strategist UI; removed panel/buttons from `app/(app)/underwrite/page.tsx`.
  - Added Strategist section to `app/(app)/overview/page.tsx` using the existing panel (still disabled).
  - Strategist panel copy remains advisory-only and reflects the disabled state.
- Tests/checks: `pnpm -w typecheck`, `pnpm --filter "./apps/hps-dealengine" build`.
- TODOs / follow-ups:
  - When re-enabling Strategist, keep it on `/overview` and wire to `v1-ai-bridge` once provider stability (429s) is addressed.
  - Continue Overview-first strategy UX (runs/evidence/next actions) without AI for v1.


## 2025-11-26 - Codex setup & baseline build

- Installed and verified the OpenAI ChatGPT VS Code extension (`openai.chatgpt`).
- Installed and verified the Codex CLI globally (`@openai/codex`) and signed in with ChatGPT.
- Confirmed Codex can see and read AGENTS.md, docs/primer-hps-dealengine.md, docs/roadmap-v1-v2-v3.md, and docs/devlog-hps-dealengine.md.
- Set Codex approvals to allow reading/editing files and running common workspace commands in this repo.
- Fixed Next.js 14 `useSearchParams` prerender errors by:
  - Wrapping the (app) shell in a Suspense boundary in app/(app)/layout.tsx.
  - Adding loading.tsx files for /deals, /overview, /repairs, /settings, and /underwrite.
  - Refactoring AuthGate.tsx to remove useSearchParams and use window.location.href for redirectTo.
- Re-ran `pnpm -w typecheck` and `pnpm -w build` — both are green.

