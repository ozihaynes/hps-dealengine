# Repo Map

Structure (top-level highlights, depth 2):
- apps/hps-dealengine: Next.js 14 app (App Router) with valuation UI (app/(app)/underwrite), components, lib helpers, constants.
- packages/contracts: Zod schemas incl. valuation/comps definitions.
- packages/engine: deterministic underwriting engine (compute_underwriting.ts); bundled copy in supabase/functions/_vendor/engine.
- supabase/functions: Edge Functions (v1-valuation-*, v1-analyze, policy, evidence, etc.); shared helpers under _shared/.
- supabase/migrations: SQL for tables/RLS/audit (property_snapshots, valuation_runs, runs, policies, deals, etc.).
- docs/: project primers, roadmap, valuation spec, devlog, QA env docs; AGENTS.md at repo root.
- scripts/: helper PowerShell (doctor-valuation-spine.ps1, seed-qa-membership.ps1).

Primary app/ARV entrypoints:
- UI route: apps/hps-dealengine/app/(app)/underwrite/page.tsx (client) renders UnderwriteTab + valuation controls.
- Client API wrappers: apps/hps-dealengine/lib/valuation.ts and lib/edge.ts (v1-valuation-*; v1-analyze; runs-save).
- Edge Functions: supabase/functions/v1-valuation-run, v1-valuation-apply-arv, v1-valuation-override-market; v1-analyze for engine runs.
- Engine: packages/engine/src/compute_underwriting.ts (ARV bounds, buyer ceiling math).

Tech stack:
- TypeScript/Next.js 14 (App Router), Tailwind/React UI components.
- Supabase Postgres + Edge Functions (Deno), RLS-first.
- pnpm workspaces; Vitest for unit tests; Playwright specs under tests/e2e.

How to run (from package.json):
- Install: pnpm install (not run during inspection).
- Dev UI: pnpm dev (filters to apps/hps-dealengine) or pnpm --filter "./apps/hps-dealengine" dev.
- Typecheck: pnpm -w typecheck.
- Build: pnpm -w build (filters contracts/engine/app); app-level build via pnpm --filter "./apps/hps-dealengine" build.
- Tests: pnpm -w test (Vitest); E2E: pnpm test:e2e (Playwright).
- Lint: pnpm -w lint or app lint via pnpm --filter "./apps/hps-dealengine" lint.
- Valuation doctor: pnpm doctor:valuation (runs scripts/doctor-valuation-spine.ps1).

CI/Automation:
- GitHub Actions: .github/workflows/ci.yml, ci-epic1.yml (typecheck/build/test across workspaces).