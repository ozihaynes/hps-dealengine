# Pre-V2 Closeout Plan (2025-12-24)

## Scope
- Re-audit remaining pre-V2 items from `docs/roadmap-v1-v2-v3.md` and `docs/audits/pre-v2-audit-REPORT.md` against repo evidence.
- Produce an ordered, vertical-slice closeout plan with acceptance criteria, repo touchpoints, and test commands.

## Status Breakdown (Evidence-Based)

### DONE
- Slice 8A selection_v1_3 policy gating + default selection_v1_1.
  Evidence (rg -n): `supabase/functions/_shared/valuationSelection.ts:1000`, `supabase/functions/v1-valuation-run/index.ts:219`, `apps/hps-dealengine/components/underwrite/CompsPanel.tsx:262`.
- Ground-truth/eval harness migrations + admin QA page are in repo; RentCast closed-sales seeder added (caller JWT only).
  Evidence (rg -n): `supabase/migrations/20260107101500_valuation_ground_truth_eval_runs.sql:7`, `supabase/functions/v1-valuation-eval-run/index.ts:139`, `apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx:449`.
- Underwriting integration alignment (AnalyzeInput market provenance + MARKET_PROVENANCE trace; no Offer Price input).
  Evidence (rg -n): `packages/contracts/src/analyze.ts:269`, `apps/hps-dealengine/lib/sandboxPolicy.ts:544`, `supabase/functions/v1-analyze/index.ts:176`, `supabase/functions/v1-analyze/index.ts:329`.
- Slice 8 E2E/regression rails (valuation-specific assertions for offer package, under contract, and MARKET_PROVENANCE trace).
  Evidence (rg -n): `tests/e2e/pre-v2-offer-and-contract.spec.ts:13`, `tests/e2e/pre-v2-offer-and-contract.spec.ts:97`.
- Offer Package Generation (table + edge + UI).
  Evidence (rg -n): `supabase/migrations/20260108123000_offer_packages.sql:1`, `supabase/functions/v1-offer-package-generate/index.ts:289`, `apps/hps-dealengine/app/(app)/offer-packages/[id]/page.tsx:110`.
- Under Contract capture (table + edge + UI).
  Evidence (rg -n): `supabase/migrations/20260109161500_deal_contracts.sql:1`, `supabase/functions/v1-deal-contract-upsert/index.ts:124`, `apps/hps-dealengine/app/(app)/overview/page.tsx:434`.
- Agent resilience across Analyst/Strategist/Negotiator (context_length auto-trim + user-facing error codes).
  Evidence (rg -n): `packages/agents/tests/agentRetry.test.ts:39`, `packages/agents/src/shared/openaiErrors.ts:2`, `apps/hps-dealengine/tests/aiBridgeErrorHandling.test.ts:21`.
- Minor ergonomics: NumericInput rollout + UX-only knob presentation (numeric inputs now run through NumericInput via InputField).
  Evidence (rg -n): `apps/hps-dealengine/components/ui.tsx:100`, `apps/hps-dealengine/components/underwrite/ScenarioModeler.tsx:110`, `apps/hps-dealengine/components/repairs/RepairsTab.tsx:512`.
- Security: `v1-ping` verify_jwt enabled and `/debug/ping` uses caller JWT.
  Evidence (rg -n): `supabase/config.toml:343`, `supabase/functions/v1-ping/index.ts:1`, `apps/hps-dealengine/app/debug/ping/page.tsx:13`.

### IN PROGRESS
- None. Pre-V2 closeout complete.

### NOT STARTED
- None. Pre-V2 closeout complete.

## Blockers / Gaps
- None. Pre-V2 closeout complete.

## Ordered Vertical Slices (Pre-V2 Closeout)
- All pre-V2 slices complete; no remaining ordered slices.

## Definition of Done to Start V2 Execution
- All pre-V2 items above are DONE with repo evidence and no new RLS gaps.
- Valuation artifact IDs are included in analyze inputs and traces, without reintroducing Offer Price input.
- QA env + valuation-specific Playwright rails are runnable and CI is env-gated with documented secrets.
- Offer package generation and under-contract capture are implemented end-to-end (UI -> Edge -> DB -> audit).
- Agent resilience and NumericInput rollout are complete across user-editable finance/valuation forms.
- `v1-ping` JWT posture is resolved (`verify_jwt=true`).
