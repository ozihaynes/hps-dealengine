# Pre-V2 Closeout Plan (2025-12-24)

## Scope
- Re-audit remaining pre-V2 items from `docs/roadmap-v1-v2-v3.md` and `docs/audits/pre-v2-audit-REPORT.md` against repo evidence.
- Produce an ordered, vertical-slice closeout plan with acceptance criteria, repo touchpoints, and test commands.

## Status Breakdown (Evidence-Based)

### DONE
- Slice 8A selection_v1_3 policy gating + default selection_v1_1.
  Evidence (rg -n): `supabase/functions/_shared/valuationSelection.ts:1000`, `supabase/functions/v1-valuation-run/index.ts:219`, `apps/hps-dealengine/components/underwrite/CompsPanel.tsx:262`.

### IN PROGRESS
- Ground-truth/eval harness + datasets beyond `orlando_smoke_32828_sf_v2`.
  Evidence (rg -n): `supabase/migrations/20260107101500_valuation_ground_truth_eval_runs.sql:7`, `supabase/functions/v1-valuation-eval-run/index.ts:139`, `apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx:449`. Dataset list (rg --files): only `scripts/valuation/datasets/orlando-dealids.json`.
- Underwriting integration alignment (analyze inputs + trace reference valuation artifacts; no Offer Price input).
  Evidence (rg -n): `apps/hps-dealengine/lib/sandboxPolicy.ts:538`, `apps/hps-dealengine/lib/sandboxPolicy.ts:540`, `apps/hps-dealengine/lib/sandboxPolicy.ts:558` (analyze input uses market values); `apps/hps-dealengine/types.ts:183` (valuation_run ids live in deal payload); `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx:213` (Use Suggested ARV gated by valuation_run_id); `supabase/functions/v1-valuation-apply-arv/index.ts:123` (writes arv_valuation_run_id). No valuation_run_id in analyze payload/trace: `rg -n "arv_valuation_run_id|as_is_value_valuation_run_id" packages/contracts` (no matches), `rg -n "valuation_run_id" supabase/functions/v1-analyze` (no matches). Offer Price input removed: `apps/hps-dealengine/lib/dealSessionContext.tsx:137` and `apps/hps-dealengine/components/underwrite/UnderwriteTab.test.tsx:64`.
- Slice 8 E2E/regression rails (valuation-specific assertions).
  Evidence: `rg -n "valuation|comps|override|valuation_run" tests/e2e` (no matches). Existing analyze E2E only asserts AIV/ARV values: `tests/e2e/underwrite.analyze.spec.ts:74`.
- Negotiator Playbook resilience (429 handling + dataset load; token cap handling missing).
  Evidence (rg -n): `packages/agents/src/negotiator/negotiatorAgent.ts:105` (retry wrapper), `packages/agents/src/negotiator/negotiatorAgent.ts:122` (429 handling), `packages/agents/src/negotiator/shared.ts:117` (dataset load), `apps/hps-dealengine/lib/aiBridge.ts:221` and `apps/hps-dealengine/lib/aiBridge.ts:345` (rate-limit copy). No token-cap/context-length handling: `rg -n "context_length|token cap|max_tokens" packages/agents/src/negotiator` (no matches).
- Minor ergonomics: numeric input rollout + UX-only knob presentation.
  Evidence (rg -n): NumericInput exists/used in ScenarioModeler `apps/hps-dealengine/components/ui/NumericInput.tsx:3`, `apps/hps-dealengine/components/underwrite/ScenarioModeler.tsx:110`. Many inputs remain `type="number"`: `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx:492`, `apps/hps-dealengine/components/repairs/RepairsTab.tsx:510`, `apps/hps-dealengine/components/underwrite/DoubleCloseCalculator.tsx:63`. UX-only knobs present in sandbox settings: `apps/hps-dealengine/constants/sandboxSettingsSource.ts:1996` and `apps/hps-dealengine/components/sandbox/BusinessLogicSandbox.tsx:597`.
- CI Playwright enablement (env-gated vs active; QA env readiness).
  Evidence (rg -n): `.github/workflows/ci.yml:43` (optional Playwright step), `tests/e2e/pixel.spec.ts:4` (PLAYWRIGHT_ENABLE gating), `docs/QA_ENV_V1.md:42` (QA env var list), `scripts/qa-preflight.ps1:6` (preflight checks). `.env.qa` file exists (Get-Item: `C:\Users\oziha\Documents\hps-dealengine\.env.qa`).

### NOT STARTED
- Offer Package Generation (seller-facing artifact tied to run_id + valuation artifact + policy snapshot + timestamp).
  Evidence: `rg -n "offer_package|offer package|offer_artifact|seller_facing" apps packages supabase` (no matches).
- Under Contract capture (deal status transition + executed contract price capture).
  Evidence: `rg -n "deal_status|contract_status|under_contract|executed_contract_price" apps packages supabase` (no matches). Current UI only displays read-only contract price: `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx:644`.
- Security decision: `v1-ping` verify_jwt set to false.
  Evidence: `supabase/config.toml:344`, usage in `apps/hps-dealengine/app/debug/ping/page.tsx:14`.

## Blockers / Gaps
- No non-Orlando dataset file under `scripts/valuation/datasets/` (only `orlando-dealids.json`).
- Analyze input/trace does not include valuation artifact IDs (no contract or v1-analyze references).
- No valuation-specific Playwright assertions; QA env values not validated beyond `.env.qa` presence.
- Offer package generation and under-contract capture lack schema, edge functions, and UI.
- Negotiator token-cap/context-length handling missing; dataset load error is thrown but not surfaced with a user-guided recovery path.
- Numeric input rollout incomplete across Underwrite/Repairs/DoubleClose; UX-only knobs not consistently presented as read-only context.
- `supabase/config.toml` sets `functions.v1-ping.verify_jwt = false` with no explicit justification.

## Ordered Vertical Slices (Pre-V2 Closeout)

### Slice 1 - Ground-Truth/Eval Datasets Expansion
- Scope: Add at least one non-Orlando dataset and wire selection through eval harness + admin QA.
- Touchpoints:
  - Files: `scripts/valuation/datasets/*`, `scripts/valuation/eval-harness.ps1`, `scripts/valuation/inspect-eval-run.ps1`, `apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx`.
  - Edge: `supabase/functions/v1-valuation-eval-run/index.ts`.
  - DB: `valuation_ground_truth`, `valuation_eval_runs` (no schema change unless a dataset registry table is introduced).
- Acceptance criteria:
  - `scripts/valuation/datasets/` includes >= 2 dataset files, with a non-Orlando dataset name used in eval runs.
  - Admin Valuation QA can select dataset and shows dataset_name on results.
  - `valuation_eval_runs.dataset_name` stores the selected dataset.
- Tests/commands:
  - `pnpm -w typecheck`
  - `pnpm -w test`
  - `scripts/valuation/eval-harness.ps1` (with dataset_name)

### Slice 2 - Underwriting Integration Alignment (Valuation Artifact IDs)
- Scope: Pass valuation artifact IDs into analyze input and trace; keep Offer Price input absent.
- Touchpoints:
  - Contracts: `packages/contracts/src/analyze.ts`.
  - UI: `apps/hps-dealengine/app/(app)/underwrite/page.tsx`, `apps/hps-dealengine/lib/sandboxPolicy.ts`.
  - Edge: `supabase/functions/v1-analyze/index.ts` (trace emission).
  - Tests: `apps/hps-dealengine/components/underwrite/UnderwriteTab.test.tsx` (Offer Price absence) + new contract/edge tests as needed.
- Acceptance criteria:
  - Analyze payload includes valuation artifact IDs (e.g., valuation_run_id, property_snapshot_id) when present.
  - `runs.trace` includes a deterministic valuation-artifact trace entry with IDs.
  - No Offer Price input added back to UI or contracts.
- Tests/commands:
  - `pnpm -w typecheck`
  - `pnpm -w test`

### Slice 3 - Valuation-Specific E2E Rails + QA Enablement
- Scope: Add valuation-specific Playwright assertions and ensure QA env gating covers required data.
- Touchpoints:
  - Tests: `tests/e2e/underwrite.analyze.spec.ts` (extend) or new `tests/e2e/valuation.spec.ts`.
  - QA docs: `docs/QA_ENV_V1.md`.
  - QA preflight: `scripts/qa-preflight.ps1`.
  - CI: `.github/workflows/ci.yml` (Playwright enablement remains env-gated).
- Acceptance criteria:
  - E2E assertions cover valuation run visibility, comps summary, and override gating without changing engine math.
  - Specs skip cleanly when QA env is missing; run when env is present and seeded.
  - `scripts/qa-preflight.ps1` validates all valuation-specific env vars before running PW.
- Tests/commands:
  - `pnpm -w test:e2e` (with QA env)
  - `npx playwright test` (if PLAYWRIGHT_ENABLE=true)

### Slice 4 - Offer Package Generation (Seller-Facing Artifact)
- Scope: Generate and store an offer artifact tied to run_id, valuation artifact, policy snapshot, and timestamp.
- Touchpoints:
  - DB migration: new `offer_packages` table with RLS + audit trigger.
  - Edge: new `supabase/functions/v1-offer-package-generate/index.ts`.
  - Storage: private bucket for offer artifacts (signed URLs via edge).
  - UI: add generate/view controls (likely `/overview` or `/underwrite`).
- Acceptance criteria:
  - Offer package row includes `org_id`, `deal_id`, `run_id`, `valuation_run_id`, `policy_snapshot`, `created_by`, `created_at`.
  - Artifact is stored in private storage and fetched via signed URL.
  - Audit log entry exists for creation.
- Tests/commands:
  - `pnpm -w typecheck`
  - `pnpm -w test`

### Slice 5 - Under Contract Capture
- Scope: Capture deal status transition and executed contract price (separate from pre-offer workflow).
- Touchpoints:
  - DB migration: add `deal_status` + `contract_price_executed` to `deals` or create `deal_status_events` with RLS + audit.
  - Edge: add/update `v1-deal-status` function (JWT-verified, membership validated).
  - UI: add status controls and executed price entry (likely `/overview` or `/underwrite`).
- Acceptance criteria:
  - Status transitions are persisted and auditable (org/user/timestamp).
  - Executed contract price is stored and displayed with status context.
- Tests/commands:
  - `pnpm -w typecheck`
  - `pnpm -w test`

### Slice 6 - Negotiator Playbook Resilience (Token Caps + Dataset Errors)
- Scope: Handle context-length/token-cap errors; surface dataset load failures with retry guidance.
- Touchpoints:
  - Agents: `packages/agents/src/negotiator/negotiatorAgent.ts`, `packages/agents/src/negotiator/shared.ts`.
  - API route/UI: `apps/hps-dealengine/app/api/agents/negotiator/route.ts`, `apps/hps-dealengine/lib/aiBridge.ts`.
- Acceptance criteria:
  - Context-length/token-cap failures return a deterministic error code and user-facing copy with retry guidance.
  - Dataset load failure surfaces a clear, actionable error in UI (no silent failure).
  - `agent_runs` logs error codes for failures.
- Tests/commands:
  - `pnpm -w test`

### Slice 7 - Numeric Input Rollout + UX-Only Knob Presentation
- Scope: Replace number inputs with NumericInput and clarify UX-only knobs as read-only context.
- Touchpoints:
  - UI: `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx`, `apps/hps-dealengine/components/repairs/RepairsTab.tsx`, `apps/hps-dealengine/components/underwrite/DoubleCloseCalculator.tsx`, `apps/hps-dealengine/components/sandbox/BusinessLogicSandbox.tsx`.
  - Shared: `apps/hps-dealengine/components/ui/NumericInput.tsx`.
- Acceptance criteria:
  - Numeric inputs in Underwrite/Repairs/DoubleClose use `NumericInput` and preserve null/empty behavior.
  - `rg -n 'type="number"' apps/hps-dealengine/components` returns no remaining user-editable inputs (excluding controlled exceptions, if documented).
  - UX-only knobs are clearly labeled as contextual/non-math in Sandbox.
- Tests/commands:
  - `pnpm -w typecheck`
  - `pnpm -w test`

### Slice 8 - v1-ping JWT Verification Decision
- Scope: Align `v1-ping` with RLS-first posture.
- Touchpoints:
  - Config: `supabase/config.toml`.
  - UI: `apps/hps-dealengine/app/debug/ping/page.tsx`, `apps/hps-dealengine/lib/ping.ts`.
- Acceptance criteria:
  - `functions.v1-ping.verify_jwt` set to true and `/debug/ping` works only for authenticated users; or explicit justification documented if left public.
- Tests/commands:
  - `pnpm -w typecheck`

## Definition of Done to Start V2 Execution
- All pre-V2 items above are DONE with repo evidence and no new RLS gaps.
- Valuation artifact IDs are included in analyze inputs and traces, without reintroducing Offer Price input.
- QA env + valuation-specific Playwright rails are runnable and CI is env-gated with documented secrets.
- Offer package generation and under-contract capture are implemented end-to-end (UI -> Edge -> DB -> audit).
- Negotiator resilience covers token-cap errors and dataset load failures with user-facing recovery copy.
- Numeric input rollout completed across user-editable finance/valuation forms.
- `v1-ping` JWT posture is resolved (fixed or explicitly justified).
