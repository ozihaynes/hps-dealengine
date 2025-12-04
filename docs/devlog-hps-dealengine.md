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

## 0.1 Current Status Snapshot (as of 2025-12-02)

**Project:** `hps-dealengine` - deterministic underwriting OS for distressed SFR/townhomes (initially Central Florida).

**Core truths right now:**

- **Architecture & Principles**

  - Primer and roadmap are written and live:
    - `docs/primer-hps-dealengine.md`
    - `docs/roadmap-v1-v2-v3.md`
  - Non-negotiables are locked:
    - Policy-driven rules in Postgres.
    - Determinism enforced via `runs` + hashes.
    - RLS-first, no `service_role` in user flows.
    - Vertical slices (UI -> Edge -> DB -> Trace/Audit).

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
  - `.tmp/ui-v2` is now prototype-only and excluded from Vercel uploads via `.vercelignore`; app imports use the stable bridge `lib/ui-v2-constants.ts` backed by committed `apps/hps-dealengine/constants*`, and runtime UI types live in `apps/hps-dealengine/types.ts` (no active `@ui-v2/types` usage).

- **Repairs**

  - `repair_rate_sets` table live with ORL defaults and RLS; `v1-repair-rates` returns normalized `RepairRates`; `RepairsTab` + `repairsMath` + `repairRates` wired to live rates (QuickEstimate + all estimator sections compute correctly).
  - Note: ORL/base RepairsSandbox list + `/repairs` live-rate sync currently have an org-alignment bug (v1-repair-profiles org-from-deal); see 2025-12-02 entry. v1.1 hardening will fix org resolution and reset/seed canonical profiles for the deals org.

- **Engine / Runs / Trace**

  - `packages/engine` implements deterministic underwriting logic.
  - `v1-analyze` + `v1-runs-save` path works in dev.
  - `/underwrite` -> run engine -> `/trace` vertical slice is functional:
    - Deals can be analyzed and runs inspected with hashes/trace.

- **Tooling**
  - Monorepo with `pnpm` workspaces:
    - `apps/hps-dealengine`, `packages/engine`, `packages/contracts`, `packages/ui-v2`.
  - `pnpm -w typecheck` is green on the latest snapshot; `pnpm -w build` succeeds locally (clear `.next/trace` locks on Windows if needed).
  - Playwright E2E pixel tests exist for key screens (Overview, Underwrite, Repairs, Sandbox, UserSettings, UnderwriteDebug).
  - `.vercelignore` keeps `_snapshots/**` and `.tmp/**` out of deploy uploads; `tsconfig` still contains `@ui-v2/*` path mapping for prototype/backups until the last test/import is moved.

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
5. **Vercel-safe UI-v2 bridge**
   - Rely on `lib/ui-v2-constants.ts` + `apps/hps-dealengine/types.ts`; migrate remaining tests/imports off `@ui-v2/*` and drop the alias once clean.
   - Keep `.tmp/**` out of deploys via `.vercelignore` and confirm Vercel builds don't require the prototype directory; current Vercel blocker is lingering `@ui-v2/types` usage/type drift.

This devlog should reflect which of these are “✅ done”, “🟡 in progress”, or “⏳ not started yet” over time.

---

## 1. Dated Entries

### 2025-12-10 - Slice W1-1 - Buyer Ceiling & AIV Cap Clamp (Epic 1, Task 1)

- Engine: implemented canonical buyer ceiling helper (ARV × (1 − margin) − repairs − buyer costs − carry) with infoNeeded when margin/ARV missing; added AIV safety cap helper and MAO clamp (mao_final = min of presentation, cap, buyer ceiling) with new trace steps BUYER_CEILING, AIV_SAFETY_CAP, MAO_CLAMP. Added optional diagnostics (mao_cap_wholesale, buyer_ceiling_unclamped).
- Contracts: AnalyzeOutputs extended with optional mao_cap_wholesale and buyer_ceiling_unclamped to mirror engine outputs; edge typings updated to accept the expanded bundle.
- Behavior: buyer_ceiling now populated from policy margin/fees/carry inputs (placeholder TODOs noted for policy wiring of margin/hold-cost/repairs), MAO bundle reflects clamped wholesale offer, headroom/spread values updated accordingly.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (all green).
- TODO(policy): wire wholesale target margin and hold-cost per month to SoTruth tables; source repairs total deterministically; replace placeholder cost/hold assumptions with policy tokens per manual.

### 2025-12-10 - Slice W1-2 - Floor_Investor & Respect_Floor (Epic 1, Task 2)

- Engine: added helpers `computeFloorInvestor`, `computePayoffPlusEssentials`, and `computeRespectFloor`; outputs.respect_floor now derives from investor floor vs payoff+essentials (max composition), with optional diagnostics `floor_investor` and `payoff_plus_essentials`. Trace step `RESPECT_FLOOR` records components.
- Contracts/edge: AnalyzeOutputs extended with optional `floor_investor` and `payoff_plus_essentials`; v1-analyze typings updated to pass through expanded outputs.
- Tests: strategy spec expanded to cover floor investor payoff composition, clamp behavior, and infoNeeded fallback; all vitest suites remain green.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (green).
- TODO(policy): wire investor floor discounts (P20/Typical), retained equity %, and move-out cash defaults from sandbox/SoTruth; respect_floor currently defaults to max mode without composition toggles.

### 2025-12-10 - Slice W1-3 - Spread Ladder, Cash Gate & Borderline (Epic 1, Task 3)

- Engine: implemented ARV-band min-spread ladder (≤200k: 15k; 200–400k: 20k; 400–650k: 25k; >650k: max(30k, 4% ARV)), cash spread, cash gate (≥$10k pass) and borderline flag (±$5k around ladder or confidence C). Added trace steps `SPREAD_LADDER`, `CASH_GATE`, `BORDERLINE` and outputs `spread_cash`, `min_spread_required`, `cash_gate_status`, `cash_deficit`, `borderline_flag`.
- Contracts/edge: AnalyzeOutputs extended with optional spread/cash/borderline fields; v1-analyze typings updated to pass them through.
- Tests: strategy spec expanded for ladder bands, cash gate shortfall/pass, borderline triggers, and trace presence; all vitest suites remain green.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (green after clearing stale .next/trace lock).
- TODO(policy): replace hardcoded ladder, cash gate $10k, and ±$5k borderline band with sandbox/SoTruth knobs per the manual.

### 2025-12-10 - Slice W1-PW1 - Epic 1 policy wiring (Buyer/Floor/Payoff/Respect)

- Engine: added internal `UnderwritingPolicy` type and `buildUnderwritingPolicy` helper; rewired buyer ceiling, AIV cap usage, investor floor, payoff+essentials, and respect_floor to consume policy fields (margin, buyer costs, aiv cap pct, investor discounts, retained equity, move-out cash) instead of inline constants.
- Tests: strategy spec updated to validate policy-driven ceiling/floor/payoff/respect and MAO clamp behavior.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (all green).
- TODO(policy): hold_cost_per_month still placeholder; AIV cap override gating (0.99 when insurable/title/speed) not yet wired to evidence; investor discounts/retained equity/move-out cash should be pulled from sandbox/SoTruth knobs once plumbed.

### 2025-12-10 - Slice C3 - /overview Risk, Timeline & Evidence panels

- Added `overviewRiskTimeline` presenters + tests to normalize risk_summary, timeline_summary, and evidence_summary outputs into UI-ready view models with safe fallbacks.
- Implemented `RiskComplianceCard`, `TimelineCarryCard`, and `DataEvidenceCard` on `/overview`, reusing the guardrails/strategy patterns and consuming the new C2 bundles (risk/timeline/evidence) from `lastAnalyzeResult.outputs`.
- `/overview` now surfaces risk gates, timeline urgency + carry, and evidence completeness alongside Deal Health, Guardrails, and Strategy; all degrade gracefully when runs are missing.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.
- Scope: UI-only; no engine/edge math changes. TODO: deepen gate reasons/freshness once richer engine inputs arrive (FIRPTA, PACE/SIRS, evidence aging).

### 2025-12-10 - Slice C2 - Risk, Timeline & Evidence outputs

- Contracts: extended `AnalyzeOutputs` with `GateStatus` and optional bundles `timeline_summary` (days_to_money, carry_months, speed_band, urgency), `risk_summary` (overall + per-gate statuses and reasons), and `evidence_summary` (confidence grade/reasons and freshness placeholders).
- Engine: `compute_underwriting` now emits the new bundles alongside existing guardrail/strategy fields; timeline urgency uses simple critical/elevated thresholds, risk_summary sets basic insurability/payoff/title gates with overall aggregation, and evidence_summary mirrors confidence with placeholder freshness states.
- Edge: `v1-analyze` returns the expanded outputs unchanged so runs carry timeline/risk/evidence bundles; `v1-runs-save` remains unchanged (opaque outputs blob).
- Tests/commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (green).
- TODO/DOC_GAP: many gates are placeholders pending richer inputs (FIRPTA, PACE/solar/UCC, condo/SIRS, FHA/VA flip, manufactured, SCRA); evidence freshness currently defaults to missing until engine inputs include evidence age/flags.

### 2025-12-10 - Slice B3 - Strategy & Posture panel on /overview

- Added `overviewStrategy` presenter + tests to normalize MAO bundle, payoff/shortfall, bands/gap, workflow_state, confidence, and recommendation from analyze outputs.
- Implemented `StrategyPostureCard` on `/overview` to show primary track/MAO, payoff shortfall, bands/gap/sweet spot, workflow/confidence badges, and MAO bundle by path; wired into the page alongside DealHealth/Guardrails.
- `/overview` now consumes `lastAnalyzeResult.outputs` for strategy/guardrail panels; stubs are no longer required for strategy display.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.
- TODO/DOC_GAP: band ranges remain null (engine outputs only carry band labels/flags); sweet spot/gap thresholds are provisional until policy-driven values land.

### 2025-12-10 - Slice B2 - Strategy & Posture math & outputs

- Contracts: extended `AnalyzeOutputs` to include buyer_ceiling/respect_floor plus MAO bundle (wholesale/flip/wholetail/as_is_cap), primary_offer/track, payoff_projected & shortfall, bands/flags, strategy_recommendation, workflow_state, confidence fields.
- Engine: `compute_underwriting` now emits ceiling/floor, MAOs, payoff, spreads/bands, workflow/confidence (policy-light placeholders with TODOs for policy thresholds); added strategy bundle tests.
- Edge: `v1-analyze` returns the expanded outputs with provisional strategy numbers so runs carry non-null guardrail fields.
- Tests/commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (all green).
- TODO/DOC_GAP: bands thresholds and payoff projection are provisional; replace 5k tightness/gap bands and null payoff with policy-driven values per the underwriting manual.

### 2025-12-10 - Slice A — /overview Deal Health & Guardrails

- Added `overviewGuardrails` presenter to normalize Respect Floor, current offer, Buyer Ceiling, deltas, and UI-only status badges from `lastAnalyzeResult` + calc.
- Implemented `DealHealthStrip` and `GuardrailsCard` on `/overview` to surface guardrails/risk/confidence/workflow plus floor/offer/ceiling with deltas; mobile-friendly layout.
- Confidence/workflow in this slice are UI-only placeholders pending engine-driven `workflow_state` and confidence score; guardrail tightness uses a $5k presentation band (not policy).
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.

### 2025-12-09 - v1.1 hardening + launch packaging

- Startup Run New Deal now creates real deals with client/contact info; overview shows contact popover; /deals and startup share the same NewDeal form and creation helper.
- runs.deal_id hardened with NOT VALID check + FK constraints; contracts and edge flows require dealId; UI always passes dealId from DealSession.
- Evidence UX auto-refreshes after upload; freshness banners update immediately in Underwrite/Trace.
- Numeric input ergonomics tightened in Scenario Modeler (empty stays empty, no NaN); broader Repairs/Sandbox numeric UX remains queued for v1.2.
- Role-based governed knobs: DealSession carries membershipRole; analysts see governed sections read-only with override requests; managers/owners/VPs can edit/approve.
- Session continuity + unsaved-change prompts: last deal + route persist across reloads; beforeunload guard for dirty Underwrite/Repairs/Sandbox forms.
- Playwright golden-path test added (login -> startup -> run new deal -> overview); local CI script gates Playwright via PLAYWRIGHT_ENABLE.
- Launch checklist documented (`docs/LAUNCH_CHECKLIST_V1.md`); roadmap marked v1 ✅ and v1.2 backlog carved out.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (green).
- TODOs: extend NumericInput across Repairs/Sandbox; clean up legacy runs with null deal_id if/when needed; expand Playwright coverage beyond the golden path.

### 2025-12-01 - v1 Field-Ready Release (Engine + Evidence + Overrides + Repairs + Sandbox + AI)

- v1 is now **field-ready** and gated by `scripts/local-ci.ps1` (runs typecheck -> test -> build -> Playwright; Playwright specs are opt-in locally via `PLAYWRIGHT_ENABLE=true`).
- Completed slices: deal-centric runs/trace with deterministic hashes and deal_id; evidence flows (payoff/title/insurance/repairs) with freshness banners; governed policy overrides (request/approve + trace visibility); repairs profiles (org/posture/market) with `/repairs` + Big 5 alignment and trace snapshots; Business Logic Sandbox v1 knobs + presets persisted per org/posture and bridged into engine inputs; AI Strategist on `/overview` and `/sandbox` via the AI bridge, advisory-only and grounded in runs/policy/evidence/sandbox.
- Underwrite/overview/repairs/trace now read from engine outputs + saved runs (no browser-only math); evidence uploads and overrides attach to real deals/runs; analysts see governed knobs as read-only with override requests, approvers can edit/approve.
- Known v1.1 items: DB-level `run_id`->`deal_id` hardening, deeper compliance/connectors and expanded sandbox catalog, bulk overrides/repair profile ops and exotic categories, and broader Playwright coverage.

### 2025-12-04 - Repairs org-safe profiles and live rates sync

- **Context / slices:** Sprint 3 Repairs (profiles + DealSession refresh + CORS), base posture / ORL market.
- **Changes:**
  - v1-repair-profiles CORS hardened for PUT/PATCH; preflight now succeeds in production and sandbox edits (e.g., Roof 4->1) save cleanly.
  - DealSession refreshRepairRates now guards by requestId, derives marketCode once, and triggers estimator reseed when profile meta/line items change, preventing stale overwrites.
  - v1-repair-rates now enforces org-aware profileId selection: uses the requested profile only if it belongs to the caller’s org/market/posture; otherwise logs cross-org attempts and falls back to the correct active/default profile.
  - RepairsSandbox scopes all profile list/create/update/activate calls to the active deal’s org, with guards when no deal/org is selected.
  - End-to-end verified: RepairsSandbox Save + Set Active + Sync -> DealSession -> `/repairs` QuickEstimate/Big5 reflect the edited profile for base/ORL on the active org.
- **Commands:** `pnpm -w typecheck`, `pnpm -w test`, `supabase functions deploy v1-repair-profiles --project-ref zjkihnihhqmnhpxkecpy`, `supabase functions deploy v1-repair-rates --project-ref zjkihnihhqmnhpxkecpy`.

### 2025-12-03 (UTC) - Repairs CORS/auth hardening + live rates wiring

- **Context / slices:** Sprint 3 Repairs (rates/profiles + TTL), Sandbox repairs tab, DealSession refresh.
- **Changes:**
  - Added shared CORS helper and applied it to `v1-repair-rates` and new `v1-repair-profiles`; both now honor caller JWT via `Authorization` headers and return JSON with OPTIONS handled.
  - `v1-repair-profiles` implements GET/POST/PUT with Zod validation, membership/org resolution, and active/default toggling (deactivates others when activating/defaulting).
  - Client helpers `lib/repairRates.ts` (fetch + `useRepairRates` with 5-minute local cache, caller JWT, membership org fallback) and `lib/repairProfiles.ts` (list/create/update/activate via Edge Functions).
  - DealSession now refreshes repair rates for the active deal/org/posture/profile, tracks the active profile, and exposes `refreshRepairRates` to consumers.
  - New `RepairsSandbox` tab under `/sandbox` to list/edit/clone/activate profiles and sync them into DealSession; `/repairs` page refreshes rates on entry, shows meta/status bar, and seeds estimator defaults from line-item rates; `RepairsTab` Quick Estimate and Big 5 pull live rates and display profile meta.
  - `repairsMath` and tests updated to respect line-item overrides and assert Big 5 deltas in quick estimate.
- **Files / functions touched (non-exhaustive):**
  - Edge: `supabase/functions/_shared/cors.ts`, `supabase/functions/v1-repair-rates/index.ts`, `supabase/functions/v1-repair-profiles/index.ts`.
  - Client/helpers: `apps/hps-dealengine/lib/repairRates.ts`, `apps/hps-dealengine/lib/repairProfiles.ts`, `apps/hps-dealengine/lib/dealSessionContext.tsx`.
  - UI: `apps/hps-dealengine/app/(app)/sandbox/page.tsx`, `apps/hps-dealengine/components/sandbox/RepairsSandbox.tsx`, `apps/hps-dealengine/app/(app)/repairs/page.tsx`, `apps/hps-dealengine/components/repairs/RepairsTab.tsx`.
  - Math/tests: `apps/hps-dealengine/lib/repairsMath.ts`, `apps/hps-dealengine/lib/repairsMath.test.ts`.
- **Tests/checks:** Not run in this session (pnpm -w typecheck/test/build/playwright not executed).
- **Known TODOs / caveats:**
  - `useRepairRates` caches for 5 minutes and only re-runs on marketCode/TTL change; posture/profile/org changes rely on manual refresh and should be tightened.
  - `/repairs` and `/sandbox` flows need end-to-end verification against Supabase (JWT + RLS) and Playwright snapshot updates once UI is locked.
  - Error handling is lightweight; edge responses and UI banners should be validated in hosted env, especially for missing orgId/profile or auth failures.

### 2025-12-02 - App shell on main + Vercel-safe UI-v2 bridge (types migration in progress)

- **Context**
  - UI “fat trim” branch is now on main: (app) shell + Startup/Overview/Repairs/Underwrite/Trace/Settings/Sandbox routed through a shared DealSessionProvider with AppTopNav + MobileBottomNav.
  - Session/deal flow is client-driven (`AuthGate`, `/startup`, `/deals`, `DealGuard`) rather than middleware redirects.
  - Vercel builds previously failed on missing `.tmp/ui-v2` constants; constants are now bridged into committed app code. Remaining build risk is lingering `@ui-v2/types` references/type shape drift.
  - Local `pnpm -w build` / `pnpm -r test` have been green after the constants swap; Vercel still sees type issues until the type migration is fully clean.
- **Done**
  - Added stable bridge `apps/hps-dealengine/lib/ui-v2-constants.ts` (Icons, estimatorSections, createInitialEstimatorState, SANDBOX_PAGES_CONFIG, createInitialSandboxState) backed by committed `apps/hps-dealengine/constants*` files.
  - Updated app shell and key surfaces (layout, Overview, Repairs, AppTopNav, DealSessionContext, repairs math) to import from the bridge instead of `@ui-v2/constants` / `.tmp/ui-v2/constants`.
  - Local UI types now live in `apps/hps-dealengine/types.ts`; active components/pages import from there instead of `@ui-v2/types`. Remaining alias usage is confined to legacy backups/tests and needs cleanup.
  - `.vercelignore` excludes `_snapshots/**` and `.tmp/**`, so production deploys no longer depend on the prototype package.
  - Strategist bridge, sandbox settings/presets, evidence + runs functions, repair_rate_sets + estimator wiring, and governance overrides remain present in code and surfaced through the current (app) shell.
- **Code touched (high level)**
  - App shell and routes under `apps/hps-dealengine/app/(app)/*` (layout, Overview, Repairs, Underwrite, Trace, Settings/Sandbox).
  - Shared chrome/components: `AppTopNav`, `MobileBottomNav`, `lib/dealSessionContext`.
  - UI-v2 bridge and constants: `lib/ui-v2-constants.ts`, `constants.ts`, `constants/sandboxSettingsSource.ts`, repairs math/tests.
- **DB / migrations**
  - No new DB changes in this session; rely on existing migrations (runs, repair_rate_sets, evidence ensures, user_settings, sandbox_settings, sandbox_presets, policy_overrides, membership_role owner).
- **Notes**
  - Strategist remains disabled client-side (`STRATEGIST_ENABLED = false`) even though `v1-ai-bridge` and sandbox strategist endpoints exist.
  - Vercel builds should no longer fail on missing `.tmp` constants; current blocker is the tail of `@ui-v2/types` alias usage/type mismatches until tests/backups are updated.
- **Next steps**
  - Finish migrating all `@ui-v2/types` references (including tests/backups) to `apps/hps-dealengine/types.ts` and drop the alias.
  - Sweep for any remaining `@ui-v2/constants` / `.tmp/ui-v2` imports (e.g., tests) and point them at `lib/ui-v2-constants.ts`.
  - Re-run `pnpm -w build` and `pnpm -r test`, then verify Vercel build passes once aliases are gone; consider a CI check to block `.tmp` imports.

### 2025-12-02 - Sandbox metadata + analyze bridge (Tier 1 knobs)

- Hardened sandbox metadata: generator now classifies all 196 knobs (type, fixed/variable, posture-aware, policy token hints, engine usage hints) and exports maps used by contracts/UI. Defaults are unified via contracts (`SANDBOX_CONFIG_DEFAULTS`) + posture-aware merge.
- UI alignment: BusinessLogicSandbox renders with metadata help text and respects fixed/read-only flags; sandbox defaults and meta are exposed via `SANDBOX_SETTING_META_BY_KEY`.
- DealSession surfaces now use posture-merged sandbox consistently (Overview, Underwrite, Repairs); Underwrite passes the merged sandbox to Analyze and save-run.
- Analyze bridge: added `sandboxOptions` to `AnalyzeInput` (contracts + v1-analyze accept and trace it); new helper `sandboxToAnalyzeOptions` maps Tier 1 knobs (AIV/ARV caps, spreads, repairs, carry/timeline, wholetail margins) into structured options; HPSEngine stub consumes the bridge.
- Tests/commands: `pnpm -w typecheck`, `pnpm -w build`, `pnpm -w test`, `pnpm --filter "./packages/contracts" build`.

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

- Repairs vertical slice (Edge function -> helper -> UI) is effectively **v1-ready**, pending:

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

  - [x] Normalize Supabase server client (`lib/supabase/server.ts`) so Route Handlers and server components all use the same pattern.
  - [x] Implement `redirectTo` behavior for protected routes when session is missing.
  - [ ] Ensure server components/route handlers consistently adopt the helper + caller tokens (no `service_role`).

- **Deals & DealSession (Sprint 0)**

  - [ ] Treat the existing `deals` table as the only deal source.
  - [ ] Make `/deals` the canonical entry point for selecting/creating deals.
  - [ ] Ensure `DealSession` is always backed by a real `deals` row and latest `runs` record.

- **Evidence Flows (Sprint 1)**

  - [x] Harden `v1-evidence-start` / `v1-evidence-url` with JWT + RLS + CORS, add helpers, and wire `EvidenceUpload` into Underwrite + `/trace`.
  - [ ] Apply ensure migrations + deploy evidence functions to hosted Supabase; monitor for RLS/42703 issues.

- **Policy Overrides (Sprint 2)**

  - [x] Finalize and migrate `policy_overrides` table (policy_version_id) + override functions.
  - [ ] Wire lockable fields + override modal into the UI and surface approvals in Trace.
  - [ ] Deploy overrides functions to hosted Supabase and verify org/role checks.

- **Repairs Polish (Sprint 3)**

  - [ ] Implement `useRepairRates` with caching and market awareness.
  - [ ] Add meta bar (market, version, as_of) to Repairs UI.
  - [ ] Refresh Playwright snapshots for `/repairs` after UI is locked.

- **AI Strategist (Sprint 4)**
  - [x] Hardened `v1-ai-bridge` with contracts/env check and structured errors; Strategist currently parked on `/underwrite` and advisory-only.
  - [ ] Re-enable Strategist (likely on `/overview`) via `v1-ai-bridge` once provider stability is acceptable.
  - [ ] Keep guardrails: no numeric invention, cite runs/policies/evidence; no DB writes from AI flows.

- **UI-v2 bridge / Vercel**

  - [x] Add `.vercelignore` to exclude `_snapshots/**` and `.tmp/**` from deploy uploads.
  - [x] Route active imports through `lib/ui-v2-constants.ts` + `apps/hps-dealengine/types.ts` (no runtime `@ui-v2` dependency).
  - [ ] Move remaining tests/backups off `@ui-v2/*` and drop the path alias once clean.

---

## 3. How to Update This Devlog

When you make a meaningful change (or ask an agent to), append a new dated section:

- Use the format:

  - `### YYYY-MM-DD — Short Title`
  - Bullets for:
    - What changed.
    - Why it matters.
    - Any follow-ups or regressions.

- When a sprint item from the roadmap moves from planned -> in progress -> done:
  - Reflect it in:
    - A dated entry here.
    - Optionally, update the checklist in `docs/roadmap-v1-v2-v3.md` or the “Remaining Sprints” section.

This file is the story of how HPS DealEngine actually got from v1 -> v2 -> v3, one vertical slice at a time.

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

### 2025-12-02 - Repairs Sandbox + Profiles (active, posture-aware)

- Added migration `20251202113000_repair_rate_sets_posture_and_defaults.sql` to extend `repair_rate_sets` with `name`, `posture` check, `is_default`, and posture-aware unique indexes; RLS mutate roles now allow owner.
- Contracts: new `repairs` schemas (`RepairRateProfile`, `RepairRates`, create/update/list inputs) and Analyze input now carries an optional `repairProfile` snapshot; runs schemas include `dealId`/`repairProfile` in envelopes and hashes.
- Edge: new `v1-repair-profiles` function (list/create/update/activate under RLS); `v1-repair-rates` now respects posture/profileId and returns profile metadata.
- Client helpers: `lib/repairProfiles.ts` CRUD helpers; `lib/repairRates.ts` accepts org/posture/profileId and caches per org/posture/market/profile.
- UI: new `RepairsSandbox` inside `/sandbox` (tab switch alongside Business Logic) to view/clone/edit PSF, Big 5, and line-item rates, activate profiles, and sync DealSession.
- RepairsTab now consumes DealSession-provided active repair rates, applies line-item rates to estimator math, and shows profile/meta; Underwrite analyze/save payloads embed the active repair profile snapshot; runs.save hashes now include repairProfile.
- Commands: `pnpm --filter "./packages/contracts" build`, `pnpm -w typecheck`, `pnpm -w build`, `pnpm -w test` (all green after fixture update).

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
- Re-ran `pnpm -w typecheck` and `pnpm -w build` - both are green.

### 2025-12-02 – Repairs org alignment & sandbox reset (🟡)

- v1 stays field-ready per earlier entries; this pass focused on Repairs alignment and the sandbox reset.
- Repairs DB migrations: applied the normalization/reset chain (`20251206120000`, `20251206121500`, `20251206220000`, `20251206230000`, `20251206231000`, `20251207`, `20251208104500`) to move ORL/base profiles into the canonical deals org (`ed6ae332-2d15-44be-a8fb-36005522ad60`), clear legacy org rows, and enforce a single active+default ORL/base profile per org/market/posture (seeded canonical profile).
- v1-repair-rates now enforces a strict `RepairRatesRequest` contract `{ dealId: uuid; marketCode: string; posture: string; profileId: uuid | null }`, resolves org_id deal-first (membership RPC fallback), and returns structured 404/400/500 errors with no silent defaults.
- v1-repair-profiles resolves org_id via `dealId` when present (membership fallback otherwise), filters list/create/update/activate by org_id + marketCode + posture, and clears competing active/default rows when toggling flags.
- Client/UI alignment: `repairRates.ts`, `repairProfiles.ts`, DealSession, RepairsSandbox, `/repairs`, and `RepairsTab` now pass `dealId` through, use DealSession.repairRates as the single source of truth, and surface active profile metadata in UI.
- Still broken: RepairsSandbox list (`v1-repair-profiles?dealId=<dealId>&marketCode=ORL&posture=base&includeInactive=true`) returns `count: 0` with edge error `{"error":"Missing or invalid orgId in request body."}`; `/repairs` sees v1-repair-rates 400/404 for ORL/base and falls back to zero/investor defaults.
- Diagnosis: residual org resolution bug in v1-repair-profiles (still validating/expecting a request-body orgId on some paths) rather than React wiring; data is seeded but not visible under the caller’s deal org.
- Surgical reset plan: treat `ed6ae332-2d15-44be-a8fb-36005522ad60` as the canonical deals org; ship one reset/seed migration that deletes all ORL/base profiles for that org + the legacy org, inserts one active+default ORL/base profile, and enforces one active+default per org/market/posture; fix v1-repair-profiles list/create/update/activate so it never requires client orgId when `dealId` is present and always filters by the deal-resolved org.
- Expected after fix: `/sandbox -> Repairs` lists the seeded ORL/base profile; `/repairs` calls to v1-repair-rates return 200 for ORL/base and stop showing the "falling back to defaults" banner.
- Files/migrations touched (high level): the repair_rate_sets normalization/reset migrations above; `supabase/functions/v1-repair-rates`; `supabase/functions/v1-repair-profiles`; `apps/hps-dealengine/lib/repairRates.ts`; `apps/hps-dealengine/lib/repairProfiles.ts`; `apps/hps-dealengine/lib/dealSessionContext.tsx`; `apps/hps-dealengine/components/sandbox/RepairsSandbox.tsx`; `apps/hps-dealengine/app/(app)/repairs/page.tsx`; `apps/hps-dealengine/components/repairs/RepairsTab.tsx`.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (re-run this session; all green).
- Next Up: (1) Fix v1-repair-profiles to stop requiring orgId when dealId is present and always resolve/filter by the deal org; (2) run the reset/seed migration enforcing one active+default ORL/base profile for the canonical org; (3) redeploy `v1-repair-profiles` + `v1-repair-rates` and re-test `/sandbox` + `/repairs`.

#### UX & Flow Hardening – Deferred to v1.1 (🟡)

- Numeric input UX:
  - Treat “no value” as an empty string rather than a hard 0.
  - Use `placeholder="0"` for numeric fields and auto-select on focus so typing replaces the visible 0.

- Governed UX for Debt & Liens / Timeline & Legal / Policy & Fees:
  - Analysts: governed knobs remain read-only with “Request Override” flow.
  - Owner/Manager/VP: knobs should be fully editable.
  - Longer-term: per-team-member profile permissions and role-based presets (logged as v1.1 design work).

- Startup "Run New Deal" UX:
  - Remove fake default values for deal name/number/address.
  - Start all fields empty with placeholders so every new deal is real client data.

- Evidence refresh behavior:
  - After a successful upload, refresh the evidence list in-place (no manual refresh or re-clicking the deal required).

- Session continuity & unsaved changes:
  - Persist the last active `dealId` + route in `localStorage` and auto-restore DealSession on load (so F5 keeps user on the same deal/page).
  - Add a small `useUnsavedChanges` hook that wires `beforeunload` to warn when there are unsaved changes in critical flows.

### 2025-12-02 - Repairs stack - deal-first org + QA Org ORL/base E2E

- v1-repair-profiles: orgId now resolves strictly via dealId (deals.org_id) under the caller JWT; client orgId is not accepted. List/create/update/activate scope by {orgId, marketCode, posture}, and RepairsSandbox list for QA Org / ORL / base returns the seeded "ORL base default (reset)" profile with activation triggering refreshRepairRates.
- v1-repair-rates: uses the shared RepairRatesRequest contract `{ dealId, marketCode, posture, profileId|null }`, resolves orgId from deals with RLS (no client orgId or membership fallback), enforces org/market/posture when profileId is provided, and falls back to the active default when null. Returns structured psf tiers, Big5, and lineItemRates; the old "Missing or invalid orgId in request body." path is gone.
- Data alignment: QA Org (2025-11-11) seeded with ORL/base profile `f5b95d23-...` marked `is_active=true`, `is_default=true`; `request.jwt.claims` in SQL satisfied `audit_logs.actor_user_id` while updating that row by hand.
- E2E verification: For QA Org / ORL / base, RepairsSandbox shows the seeded profile and can activate/sync it; `/repairs` calls `v1-repair-rates` with `{ dealId, marketCode: "ORL", posture: "base", profileId: "f5b95d23-..." }` and receives 200 + `hasData:true`; DealSession stores repairRates and RepairsTab renders with `usingFallback=false`.

### 2025-12-02 - Repairs v1.1 hardening wrap + org observability

- Repairs stack: `v1-repair-profiles` and `v1-repair-rates` now both use deal-first org resolution under caller JWT; client orgId is removed from the request contract. QA Org / ORL / base returns the seeded active/default profile and `/repairs` consumes live rates (no fallback). Logging added for request parse/org resolution/query results.
- Data seeding: QA Org (`ed6ae332-2d15-44be-a8fb-36005522ad60`) carries ORL/base profile `f5b95d23-...` marked active/default; audit trigger satisfied via `request.jwt.claims` when promoting the row.
- UI/org observability: `/deals` and `/startup` now display an Org column (orgName else truncated orgId) using enriched deal queries (`orgId`, `orgName`, `organization` join). DealSession hydrates orgId/orgName on DbDeal.
- Edge import map: `supabase/functions/import_map.json` now maps `"zod"` to `https://esm.sh/zod@3.23.8` for Deno edge imports from shared contracts.
- Tests/checks: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` run and green post-changes.
- TODOs: extend the same Repairs deal-first/seeded pattern to any additional markets/postures; improve UX for missing sqft (QuickEstimate warning) to reduce "usingFallback" scenarios when sqft is absent.

### 2025-12-10 - Slice W1-PW2-IMPLEMENT-1 — Policy-driven spread ladder, cash gate, borderline

- Engine: `UnderwritingPolicy` now carries `min_spread_by_arv_band`, `cash_gate_min`, and `borderline_band_width`; `buildUnderwritingPolicy` maps sandbox ladders (`minSpreadByArvBand`), cash gate (`cashPresentationGateMinimumSpreadOverPayoff`), and borderline band (`analystReviewTriggerBorderlineBandThreshold`) with canonical fallbacks only when absent.
- Spread ladder / cash / borderline logic: `computeMinSpreadRequired`, `computeCashGate`, and borderline checks now read policy values (no hardcoded 15k/20k/25k/30k, 10k, or 5k). SPREAD_LADDER, CASH_GATE, and BORDERLINE traces emit the policy band, gate, and band width used.
- Tests: strategy spec extended with a policy-driven ladder/gate case; existing expectations updated implicitly via policy fallbacks.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (all green).
- TODO(policy/data): Hold-cost per track/speed and AIV cap override gating still to be wired in PW2-IMPLEMENT-2; gap/tight bands remain TODO(policy).

### 2025-12-10 - Slice W1-PW2-IMPLEMENT-2 — Policy-driven hold costs & AIV cap override

- Engine: `UnderwritingPolicy` extended with track/speed hold-cost bands and default monthly bills; Buyer Ceiling now uses policy-driven hold costs (with HOLD_COST_POLICY trace) when explicit bills are missing. AIV safety cap now supports default vs override pct with override gating (bindable insurance, clear title, fast ZIP, approval role/log) and emits detailed AIV_SAFETY_CAP trace (cap pct used, override allowed/block reasons).
- Builder: `buildUnderwritingPolicy` now maps hold cost knobs (`holdCostsFlip*`, `holdCostsWholetail*`, `holdCostsWholesaleMonthlyPctOfArvDefault`, `holdingCostsMonthlyDefault*`) and AIV override knobs (approval role + conditions + logging) into policy fields; percent knobs normalized to decimals.
- Tests: strategy spec adds hold-cost sensitivity and AIV override allow/deny scenarios; all existing tests updated and green.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (all green).
- TODO(data/policy): override pct knob still TODO(policy) if a dedicated value is added; role/approval evidence is minimal—override stays conservative when evidence is missing.







