# Bundle Contents

Included (see _codex_inspection/08_FILE_MANIFEST.csv for hashes):
- _codex_inspection/ audit files 00-09.
- Valuation/RentCast code: supabase/functions/_shared/valuationSnapshot.ts, valuation.ts, policy.ts, contracts.ts; v1-valuation-run, v1-valuation-apply-arv, v1-valuation-override-market.
- Schema: property_snapshots/valuation_runs migrations; valuation policy token seed.
- UI/client: apps/hps-dealengine lib/valuation.ts, underwrite page & components.
- Engine: packages/engine/src/compute_underwriting.ts; contracts schema for comps.
- Docs: AGENTS.md, docs/primer-hps-dealengine.md, docs/roadmap-v1-v2-v3.md, docs/app/valuation-spine-v1-spec.md.
- Supporting script: scripts/doctor-valuation-spine.ps1; package.json for scripts/context.

Excluded:
- .git, node_modules, .next, dist/build artifacts, tmp caches, binary snapshots, .env* files or secrets. No values of secrets copied.