# QA Environment for V1 E2E

This doc explains how to configure a QA Supabase project and environment variables so the V1 Playwright specs (`golden-path`, `timeline-and-carry`, `risk-and-evidence`) can run reliably.

## Supabase project setup (QA)
- Use a Supabase project with the same schema as dev/prod; apply the repo migrations as usual.
- Keep RLS enabled everywhere. Create a QA user (email/password) via normal signup or the auth admin console.
- Ensure there is at least one org with a handful of seeded deals the E2E suite can reference:
  - READY deal: clean/fresh evidence, risk overall pass, workflow ready.
  - TIMELINE deal: non-trivial DTM and carry/hold values.
  - STALE_EVIDENCE deal: at least one critical evidence kind stale/missing; workflow not Ready.
  - HARD_GATE deal: at least one compliance/risk gate failing (e.g., bankruptcy/FHA/flood/PACE/etc.).

## Environment variables required by specs
Set these in the shell before running Playwright:
- `DEALENGINE_QA_USER_EMAIL` — QA user email.
- `DEALENGINE_QA_USER_PASSWORD` — QA user password.
- `DEALENGINE_QA_READY_DEAL_ID` — UUID for the READY deal.
- `DEALENGINE_QA_TIMELINE_DEAL_ID` — UUID for the TIMELINE deal.
- `DEALENGINE_QA_TIMELINE_DTM_DAYS` (optional) — expected DTM days string for assertions.
- `DEALENGINE_QA_TIMELINE_CARRY_MONTHS` (optional) — expected carry months for assertions.
- `DEALENGINE_QA_TIMELINE_SPEED_BAND` (optional) — expected speed band label.
- `DEALENGINE_QA_STALE_EVIDENCE_DEAL_ID` — UUID for stale/missing evidence scenario.
- `DEALENGINE_QA_HARD_GATE_DEAL_ID` — UUID for hard gate fail scenario.

Notes:
- The specs skip automatically if their required vars are missing.
- Older names (`DEALENGINE_TEST_USER_EMAIL/PASSWORD`) are still accepted as fallbacks for login.

## QA deal seeding expectations
- READY: high confidence (A/B), workflow Ready/ReadyForOffer, all critical evidence fresh, risk overall Pass.
- TIMELINE: timeline summary populated with DTM days, carry months, hold monthly/total so UI has non-empty values.
- STALE_EVIDENCE: at least one critical evidence kind stale/missing; workflow should be NeedsReview or NeedsInfo. If placeholders are allowed, they should be noted; if not allowed, workflow should show NeedsInfo.
- HARD_GATE: at least one gate Fail (insurability/flood/pace/ucc/etc.); risk overall Fail; workflow not Ready.

## Running the E2E specs
1) Export the env vars above (or place them in a `.env` consumed by Playwright).
2) In one shell, run the Next.js app (or let Playwright start it per `playwright.config.ts`).
3) Execute the gated specs:
   - `pnpm exec playwright test tests/e2e/golden-path.spec.ts`
   - `pnpm exec playwright test tests/e2e/timeline-and-carry.spec.ts`
   - `pnpm exec playwright test tests/e2e/risk-and-evidence.spec.ts`
4) If a required var is missing, the corresponding spec will skip. Typecheck/build/unit tests remain the primary CI tripwires; E2E is opt-in via env gating.
