# Pre‑V2 Audit Report (2025-12-24)

## Checklist (verbatim from docs/roadmap-v1-v2-v3.md)
Fast-follow items that do not change V1 behavior:

- Stand up QA Supabase with seeded READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals; run env-gated Playwright specs and consider enabling in CI.
- Valuation Spine (Address → Comps → ARV → Prefill): document and wire address versioning → valuation_run history, org-scoped property_snapshot caching, and UI hydration from persisted valuations.
- Repairs UX/ergonomics: fix org alignment for repair profiles/rates, tighten RepairsTab meta and presentation.
- Overrides/governance: light UI for override request/review, keep governance RLS and trace visibility.
- AI surfaces: Tri-agent chat with Supabase history is live; `/api/agents` + @hps/agents/HPS MCP groundwork exists. Remaining hardening is tone/copy plus strategist/negotiator stability without changing engine math/policy.
- Agent Platform vNext: ✅ `/api/agents` tri personas with caller JWT + `agent_runs` logging; ✅ @hps/agents SDK (strategist KB resolver tests, negotiation dataset loader); ✅ HPS MCP server (stdio + Streamable HTTP) with deal/run/evidence/negotiation/KPI/risk/sandbox/KB tools; ⭕ expand Strategist/Negotiator evals/tools and UI retries/backoff.
- Negotiator Playbook Unblock: handle OpenAI responses 429/token caps/dataset load resilience and user-facing retry/error copy.
- Minor ergonomics: Sandbox/Startup/Deals copy and hints; numeric/UX-only knob presentation where safe (rounding, buyer-cost presentation) without changing math (null-backed numeric input foundation in shared components/defaults is done; rollout across all forms still pending).

### Valuation Spine

- 🟡 In progress
  - Ground-truth/eval harness migrations and admin QA page are in repo; RentCast closed-sales seeder added (caller JWT only). QA rollout/seeded datasets beyond `orlando_smoke_32828_sf_v2` still to be confirmed.
- 🟡 Next
  1) Underwriting integration alignment: engine input uses latest persisted valuation artifacts (ARV/As-Is/market signals) and traces reference valuation artifact IDs; never reintroduce Offer Price as an Underwrite input.
  2) Slice 8A (valuation quality comps-only) - Implemented/evaluated selection_v1_3 (deterministic outliers + diagnostics). Result: regressed on orlando_smoke_32828_sf_v2; keep default selection_v1_1, leave selection_v1_3 policy-gated/opt-in for future datasets.
  3) Slice 8 - E2E/regression rails: core underwriting rails are implemented (login/startup/deep-links + overview/underwrite/repairs/trace + pixel snapshots + autosave), valuation-specific assertions (deal create/valuation refresh/comps/override gating) remain for that slice.
  4) Offer Package Generation: seller-facing offer artifact tied to run_id + valuation artifact + policy snapshot + timestamp (auditable event).
  5) Under Contract capture: deal status transition + executed contract price capture, separate from pre-offer workflow.

## Repo snapshot
- git status -sb
```
## docs/calibration-flywheel-closeout-2025-12-24...origin/docs/calibration-flywheel-closeout-2025-12-24
```
- git rev-parse HEAD
```
4285759a4444f48209e999d2c67e0820576cc103
```
- git branch --show-current
```
docs/calibration-flywheel-closeout-2025-12-24
```

## Baseline diagnostics (Phase 0)
### Runtime versions
- node -v
```
v20.19.5
```
- pnpm -v
```
10.19.0
```

### Directory listings
- Get-ChildItem . -Force | Select-Object Name
```

[32;1mName[0m
[32;1m----[0m
_audit_export
_codex_inspection
_docs
.codex_file_backups
.git
.github
.husky
.tmp
.vercel
.vscode
apps
config
data
docs
node_modules
packages
scripts
supabase
test-results
tests
tools
_tmp_cmd.ps1
_tmp_public_schema.sql
_tmp_read.ps1
_tmp_winctx_note.txt
.env.local
.env.qa
.eslintcache
.gitattributes
.gitignore
.lintstagedrc.json
.npmrc
.nvmrc
.prettierignore
.prettierrc.json
.vercelignore
AGENTS.md
codex_inspection_bundle.zip
dc-helpers.ps1
deno.lock
DEV_ENV.md
eslint.config.mjs
get-jwt.mjs
hps-dealengine_full_replacements.zip
middleware.ts
openapi.yaml
package.json
playwright.config.ts
pnpm-lock.yaml
pnpm-workspace.yaml
postcss.config.mjs
Procfile
project_context.txt
RUNS.md
smoke-orlando.log
supabase-schema-20251125-221305.sql
System.Management.Automation.Internal.Host.InternalHost
tmp_ai_chat_introspect.py
tmp_ai_chat_meta.py
tmp_ai_chat_triggers.py
tmp-devserver.err.log
tmp-devserver.out.log
tmp-mcp.err.log
tmp-mcp.out.log
tsconfig.base.json
tsconfig.json
vitest.config.ts
witch main
```

- Get-ChildItem .github -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

[32;1mFullName[0m
[32;1m--------[0m
C:\Users\oziha\Documents\hps-dealengine\.github\workflows
C:\Users\oziha\Documents\hps-dealengine\.github\workflows\ci-epic1.yml
C:\Users\oziha\Documents\hps-dealengine\.github\workflows\ci.yml
```

- Get-ChildItem supabase -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

[32;1mFullName[0m
[32;1m--------[0m
C:\Users\oziha\Documents\hps-dealengine\supabase\.branches
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp
C:\Users\oziha\Documents\hps-dealengine\supabase\backups
C:\Users\oziha\Documents\hps-dealengine\supabase\bootstrap
C:\Users\oziha\Documents\hps-dealengine\supabase\functions
C:\Users\oziha\Documents\hps-dealengine\supabase\migrations
C:\Users\oziha\Documents\hps-dealengine\supabase\migrations_quarantine_20251103185355
C:\Users\oziha\Documents\hps-dealengine\supabase\migrations_quarantine_20251103185553
C:\Users\oziha\Documents\hps-dealengine\supabase\migrations_quarantine_20251103185719
C:\Users\oziha\Documents\hps-dealengine\supabase\migrations_quarantine_20251103195518
C:\Users\oziha\Documents\hps-dealengine\supabase\migrations_quarantine_bad_20251103200428
C:\Users\oziha\Documents\hps-dealengine\supabase\migrations_quarantine_bad_20251103200815
C:\Users\oziha\Documents\hps-dealengine\supabase\schemas
C:\Users\oziha\Documents\hps-dealengine\supabase\.env.local
C:\Users\oziha\Documents\hps-dealengine\supabase\.gitignore
C:\Users\oziha\Documents\hps-dealengine\supabase\config.toml
C:\Users\oziha\Documents\hps-dealengine\supabase\deno.json
C:\Users\oziha\Documents\hps-dealengine\supabase\schema-full-20251127-230636.sql
C:\Users\oziha\Documents\hps-dealengine\supabase\schema-full-20251129-110213.sql
C:\Users\oziha\Documents\hps-dealengine\supabase\schema-full-20251129-111234.sql
C:\Users\oziha\Documents\hps-dealengine\supabase\.branches\_current_branch
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\cli-latest
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\data_dump.sql
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\gotrue-version
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\pooler-url
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\postgres-version
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\project-ref
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\rest-version
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\storage-migration
C:\Users\oziha\Documents\hps-dealengine\supabase\.temp\storage-version
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-eval-selection-v1_3-20251218T182400.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-eval-selection-v1_3-20251218T182449.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-eval-selection-v1_3-20251218T183256.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-eval-selection-v1_3-20251218T183310.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-eval-selection-v1_3-20251218T183338.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-eval-selection-v1_3-20251218T183359.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-selection-v1_3-20251218T182306.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-selection-v1_3-20251218T182332.json
C:\Users\oziha\Documents\hps-dealengine\supabase\backups\prove-selection-v1_3-20251218T182950.json
C:\Users\oziha\Documents\hps-dealengine\supabase\bootstrap\DEV_ENV.md
C:\Users\oziha\Documents\hps-dealengine\supabase\bootstrap\dev_org_seed.sql
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\_shared
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\_vendor
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\node_modules
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-ai-bridge
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-analyze
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-connectors-proxy
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-evidence-start
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-evidence-url
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-ping
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-policy
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-policy-get
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-policy-override-approve
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-policy-override-request
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-policy-put
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-repair-profiles
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-repair-rates
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-runs-save
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-sandbox-presets
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-sandbox-settings
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-sandbox-strategist
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-user-settings
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-valuation-apply-arv
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-valuation-continuous-calibrate
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-valuation-ensemble-sweep
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-valuation-eval-run
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-valuation-override-market
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-valuation-run
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\.env.local
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\config.toml.off
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\deno.json
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\deno.lock
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\import_map.json
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\node_modules\.bin
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\node_modules\.deno
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\node_modules\@supabase
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\node_modules\zod
...24497 tokens truncated...
```
Note: output truncated by tool due to size.

- Get-ChildItem scripts -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

[32;1mFullName[0m
[32;1m--------[0m
C:\Users\oziha\Documents\hps-dealengine\scripts\auth
C:\Users\oziha\Documents\hps-dealengine\scripts\dev
C:\Users\oziha\Documents\hps-dealengine\scripts\local
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation
C:\Users\oziha\Documents\hps-dealengine\scripts\check-deno-lock-version.mjs
C:\Users\oziha\Documents\hps-dealengine\scripts\check-doc-frontmatter.ts
C:\Users\oziha\Documents\hps-dealengine\scripts\check-glossary-alignment.ts
C:\Users\oziha\Documents\hps-dealengine\scripts\dashboard-kpi-coverage-report.ts
C:\Users\oziha\Documents\hps-dealengine\scripts\doctor-valuation-spine.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\generate-doc-registry.ts
C:\Users\oziha\Documents\hps-dealengine\scripts\generate-knobs-audit-v1.ts
C:\Users\oziha\Documents\hps-dealengine\scripts\generate-sandbox-meta.cjs
C:\Users\oziha\Documents\hps-dealengine\scripts\get-jwt.mjs
C:\Users\oziha\Documents\hps-dealengine\scripts\local-ci.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\qa-env.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\qa-preflight.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\quick-regression.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\reset-dev-auth-users.ts
C:\Users\oziha\Documents\hps-dealengine\scripts\seed-qa.ts
C:\Users\oziha\Documents\hps-dealengine\scripts\test-v1-analyze.mjs
C:\Users\oziha\Documents\hps-dealengine\scripts\auth\get-caller-jwt.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\dev\clean-next.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\local\qa-env.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\datasets
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\coverage-smoke.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\eval-harness.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\inspect-eval-run.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\policy-set-market-time-adjustment.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\policy-set-public-records-subject.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-adjustments-ledger.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-attom-enrichment.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-comp-overrides.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-ensemble-uncertainty.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-eval-run-inrange.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-eval-selection-v1_3.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-failsoft-two-deals-fixed.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-market-time-adjustment.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-selection-v1_3.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\prove-self-comp-exclusion.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\seed-ground-truth-from-rentcast.ps1
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\datasets\orlando-dealids.json
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs\eval-orlando-smoke-20251214-232322.log
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs\eval-orlando-smoke-20251214-232755.log
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs\eval-orlando-smoke-20251214-233011.log
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs\eval-orlando-smoke-20251214-233355.log
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs\eval-orlando-smoke-20251214-233709.log
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs\eval-orlando-smoke-20251214-234719.log
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\logs\eval-orlando-smoke-20251215-000630.log
```

- Get-ChildItem tests -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

[32;1mFullName[0m
[32;1m--------[0m
C:\Users\oziha\Documents\hps-dealengine\tests\e2e
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\_helpers
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\autosave-underwrite-repairs.spec.ts
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\golden-path.spec.ts
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots.zip
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\risk-and-evidence.spec.ts
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\timeline-and-carry.spec.ts
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\underwrite.analyze.spec.ts
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots\AiBridgeDebug-chromium-win32.png
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots\overviewTab-chromium-win32.png
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots\RepairsTab-chromium-win32.png
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots\SandboxSettings-chromium-win32.png
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots\UnderwriteDebug-chromium-win32.png
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots\underwriteTab-chromium-win32.png
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\pixel.spec.ts-snapshots\UserSettings-chromium-win32.png
C:\Users\oziha\Documents\hps-dealengine\tests\e2e\_helpers\qaAuth.ts
```

- Get-ChildItem apps -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

[32;1mFullName[0m
[32;1m--------[0m
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.data
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.vscode
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\app
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\components
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\constants
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\data
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\devnotes
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\docs
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\lib
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\node_modules
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\public
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\services
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\styles
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\tests
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\types
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\utils
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.env.local
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.eslintrc.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.gitignore
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\constants.ts
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\middleware.ts
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\middleware.ts.bak.20251101-025340
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\middleware.ts.bak.20251101-025700
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\next-env.d.ts
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\next.config.cjs
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\package.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\postcss.config.mjs
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\README.md
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\tailwind.config.ts
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\tsc-error.log
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\tsconfig.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\tsconfig.tsbuildinfo
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\types.ts
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\types.ts.bak_full_20251116020428
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\types.ts.bak_full_20251116022352
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\types.ts.bak-20251031-232014
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\types.ts.bak-20251031-232147
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\types.ts.bak-20251031-232633
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\vercel.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\vitest.config.ts
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.data\policy.base.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.data\policy.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.data\policy.legacy-backup.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.data\tokens.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.data\user_prefs.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\cache
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\server
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\static
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\types
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\app-build-manifest.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\app-path-routes-manifest.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\BUILD_ID
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\build-manifest.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\export-marker.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\images-manifest.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\next-minimal-server.js.nft.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\next-server.js.nft.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\package.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\prerender-manifest.js
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\prerender-manifest.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\react-loadable-manifest.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\required-server-files.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\routes-manifest.json
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\.next\trace
...12660 tokens truncated...
```
Note: output truncated by tool due to size.

- Get-ChildItem packages -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

[32;1mFullName[0m
[32;1m--------[0m
C:\Users\oziha\Documents\hps-dealengine\packages\agents
C:\Users\oziha\Documents\hps-dealengine\packages\config
C:\Users\oziha\Documents\hps-dealengine\packages\contracts
C:\Users\oziha\Documents\hps-dealengine\packages\engine
C:\Users\oziha\Documents\hps-dealengine\packages\hps-mcp
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules
C:\Users\oziha\Documents\hps-dealengine\packages\agents\src
C:\Users\oziha\Documents\hps-dealengine\packages\agents\tests
C:\Users\oziha\Documents\hps-dealengine\packages\agents\package.json
C:\Users\oziha\Documents\hps-dealengine\packages\agents\tsconfig.json
C:\Users\oziha\Documents\hps-dealengine\packages\agents\vitest.config.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\tests
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\supabase
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\index.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\index.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\dealAnalystAgent.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\dealAnalystAgent.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\runContext.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\runContext.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\tools.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\tools.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\types.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\analyst\types.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\supabase\supabaseRlsClient.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\src\supabase\supabaseRlsClient.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\tests\analyst-evals
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\tests\analyst-evals\golden-deals.json
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\tests\analyst-evals\runAnalystEval.test.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\agents\tests\analyst-evals\runAnalystEval.test.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\aiBridge.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\aiBridge.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\analyze.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\analyze.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\evidence.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\evidence.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\index.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\index.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\policyOverrides.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\policyOverrides.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\posture.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\posture.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\repairRates.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\repairRates.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\repairs.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\repairs.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\runs.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\runs.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\runsSave.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\runsSave.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\sandboxMeta.generated.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\sandboxMeta.generated.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\sandboxSettings.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\sandboxSettings.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\sandboxStrategist.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\sandboxStrategist.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\settings.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\settings.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\userSettings.d.ts
C:\Users\oziha\Documents\hps-dealengine\packages\agents\dist\contracts\src\userSettings.js
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\.bin
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\.vite
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\@hps-internal
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\@openai
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\@supabase
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\typescript
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\vitest
C:\Users\oziha\Documents\hps-dealengine\packages\agents\node_modules\zod
... (output continues as captured above)
```

## QA env presence (Phase 2 runtime checks gating)
- Get-Content docs\QA_ENV_V1.md
```
# QA Environment for V1 E2E (Deterministic, Local-Only)

This runbook seeds the QA fixtures into the **local Supabase** started by `supabase start`, writes a local `.env.qa`, and loads the variables so every QA Playwright spec runs without skipping.

## One-Command Setup (clean + seed)

1) Start Supabase (if not already running)
   ```powershell
   supabase start
   ```
2) Reset the local DB to the repo migrations
   ```powershell
   supabase db reset
   ```
3) Seed deterministic QA fixtures (org, user, deals, runs, env)
   ```powershell
   pnpm -w exec tsx scripts/seed-qa.ts
   ```
   - Uses `supabase status -o env` to read the local URL/keys
   - Seeds org `ed6ae332-2d15-44be-a8fb-36005522ad60`
   - QA user: `qa@hps.test.local` (password in `.env.qa`)
   - Seeds 4 deals + runs: READY, TIMELINE, STALE_EVIDENCE, HARD_GATE
   - Writes `.env.qa` (gitignored) with all required QA env vars
4) Load the QA env into your shell
   ```powershell
   . .\scripts\qa-env.ps1
   ```

## Run QA Playwright Suites (no skips)
With `.env.qa` loaded:
```powershell
pnpm -w test:qa      # QA-focused Playwright (PLAYWRIGHT_ENABLE=true)
pnpm -w test:e2e     # Full e2e suite; will also use loaded env
```

## Required Environment Variables (written by `seed-qa.ts`)
- Core auth / API
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `DEALENGINE_QA_API_URL`
  - `DEALENGINE_QA_ORG_ID`
  - `DEALENGINE_QA_POSTURE`
  - `PLAYWRIGHT_ENABLE=true`
- QA user
  - `DEALENGINE_QA_USER_EMAIL`
  - `DEALENGINE_QA_USER_PASSWORD`
- Deals
  - `DEALENGINE_QA_READY_DEAL_ID`
  - `DEALENGINE_QA_READY_CLIENT_NAME`
  - `DEALENGINE_QA_TIMELINE_DEAL_ID`
  - `DEALENGINE_QA_TIMELINE_DTM_DAYS`
  - `DEALENGINE_QA_TIMELINE_CARRY_MONTHS`
  - `DEALENGINE_QA_TIMELINE_SPEED_BAND`
  - `DEALENGINE_QA_STALE_EVIDENCE_DEAL_ID`
  - `DEALENGINE_QA_HARD_GATE_DEAL_ID`
- v1-analyze (borderline expectations)
  - `DEALENGINE_QA_BORDERLINE_MIN_SPREAD`
  - `DEALENGINE_QA_BORDERLINE_SPREAD_CASH`
  - `DEALENGINE_QA_BORDERLINE_AIV`
  - `DEALENGINE_QA_BORDERLINE_ARV`
  - `DEALENGINE_QA_BORDERLINE_DOM`
  - `DEALENGINE_QA_BORDERLINE_PAYOFF`
  - `DEALENGINE_QA_BORDERLINE_FLAG`

### Notes
- `.env.qa` is **gitignored**; never commit it.
- The seed script uses the **service role** only for seeding; no service_role is used in user flows.
- No secrets are printed to stdout; only variable names and seeded IDs are echoed.
- If you change seeded values, re-run steps 2-4 to refresh both DB and `.env.qa`.
```

- Env var presence check
```
env.qa=True
DEALENGINE_QA_API_URL=<MISSING>
PLAYWRIGHT_ENABLE=<MISSING>
NEXT_PUBLIC_SUPABASE_URL=<MISSING>
DEALENGINE_QA_USER_EMAIL=<MISSING>
DEALENGINE_QA_READY_DEAL_ID=<MISSING>
```

## Tests/build outputs
- pnpm -w typecheck (first attempt timed out after 14s; reran with longer timeout)
```
> hps-dealengine@0.0.0 typecheck C:\Users\oziha\Documents\hps-dealengine
> pnpm -r exec tsc -p . --noEmit
```

- pnpm -w test
```
> hps-dealengine@0.0.0 test C:\Users\oziha\Documents\hps-dealengine
> pnpm -r test

Scope: 5 of 6 workspace projects
packages/agents test$ vitest
packages/engine test$ vitest
packages/agents test: [1m[46m RUN [49m[22m [36mv4.0.14 [39m[90mC:/Users/oziha/Documents/hps-dealengine/packages/agents[39m
packages/engine test: [1m[46m RUN [49m[22m [36mv4.0.14 [39m[90mC:/Users/oziha/Documents/hps-dealengine/packages/engine[39m
packages/engine test:  [32m✓[39m src/__tests__/engine.smoke.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
packages/agents test: [90mstderr[2m | tests/strategist-kb.test.ts[2m > [22m[2mkbSearchStrategist[2m > [22m[2mreturns empty when registry is missing (ENOENT tolerated)
packages/agents test: [22m[39m[strategist] KB registry not found at C:\Users\oziha\AppData\Local\Temp\kb-registry-missing\doc-registry.json - using empty registry
packages/agents test:  [32m✓[39m tests/strategist-kb.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 39[2mms[22m[39m
packages/engine test:  [32m✓[39m src/__tests__/policy_builder.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 14[2mms[22m[39m
packages/engine test:  [32m✓[39m src/__tests__/analyze.options.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 32[2mms[22m[39m
packages/engine test:  [32m✓[39m src/__tests__/runs.save.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 36[2mms[22m[39m
packages/engine test:  [32m✓[39m src/__tests__/runs.hash.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 42[2mms[22m[39m
packages/agents test:  [32m✓[39m tests/analyst-evals/runAnalystEval.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 84[2mms[22m[39m
packages/agents test: [2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
packages/agents test: [2m      Tests [22m [1m[32m4 passed[39m[22m[90m (4)[39m
packages/agents test: [2m   Start at [22m 23:50:44
packages/agents test: [2m   Duration [22m 2.12s[2m (transform 637ms, setup 0ms, import 973ms, tests 124ms, environment 1ms)[22m
packages/engine test:  [32m✓[39m src/__tests__/compute_underwriting.risk_timeline.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 239[2mms[22m[39m
packages/engine test:  [32m✓[39m src/__tests__/compute_underwriting.strategy.spec.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 271[2mms[22m[39m
packages/engine test: [2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
packages/engine test: [2m      Tests [22m [1m[32m25 passed[39m[22m[90m (25)[39m
packages/engine test: [2m   Start at [22m 23:50:44
packages/engine test: [2m   Duration [22m 2.22s[2m (transform 2.30s, setup 0ms, import 3.45s, tests 640ms, environment 3ms)[22m
packages/agents test: Done
packages/engine test: Done
apps/hps-dealengine test$ vitest
apps/hps-dealengine test: [1m[46m RUN [49m[22m [36mv4.0.14 [39m[90mC:/Users/oziha/Documents/hps-dealengine/apps/hps-dealengine[39m
apps/hps-dealengine test:  [32m✓[39m tests/governedTokens.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/calibrationFreezeUi.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 10[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/policyOverridesSchema.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 9[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/repairRatesRequestSchema.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 56[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/repairRatesSelector.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 14[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/sandboxToAnalyzeOptions.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 25[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/sandboxBridgeCoverage.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 19[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/traceCalibrationChip.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[32m 64[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/strategistContext.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/sandboxPolicy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
apps/hps-dealengine test:  [32m✓[39m tests/sandboxKnobs.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
apps/hps-dealengine test: [90mstdout[2m | tests/repairsTabRender.test.tsx[2m > [22m[2mRepairsTab renders live repair rates[2m > [22m[2mreflects the active profile meta and rates when repairRates change
apps/hps-dealengine test: [22m[39m[RepairsTab] props {
apps/hps-dealengine test:   meta: {
apps/hps-dealengine test:     profileId: [32m'default'[39m,
apps/hps-dealengine test:     profileName: [32m'Default Profile'[39m,
apps/hps-dealengine test:     marketCode: [32m'ORL'[39m,
apps/hps-dealengine test:     posture: [32m'base'[39m,
apps/hps-dealengine test:     asOf: [32m'2024-01-01'[39m,
apps/hps-dealengine test:     source: [32m'seed'[39m,
apps/hps-dealengine test:     version: [32m'v1'[39m
apps/hps-dealengine test:   },
apps/hps-dealengine test:   estimatorState: {
apps/hps-dealengine test:     costs: {
apps/hps-dealengine test:       exterior: [36m[Object][39m,
apps/hps-dealengine test:       interior: [36m[Object][39m,
apps/hps-dealengine test:       kitchenBath: [36m[Object][39m,
apps/hps-dealengine test:       systems: [36m[Object][39m,
apps/hps-dealengine test:       structural: [36m[Object][39m
apps/hps-dealengine test:     },
apps/hps-dealengine test:     quantities: {
apps/hps-dealengine test:       roof: [33m0[39m,
apps/hps-dealengine test:       roofRepair: [33m0[39m,
apps/hps-dealengine test:       exteriorPaint: [33m0[39m,
apps/hps-dealengine test:       windows: [33m0[39m,
apps/hps-dealengine test:       siding: [33m0[39m,
apps/hps-dealengine test:       interiorPaint: [33m0[39m,
apps/hps-dealengine test:       floorVinylLaminate: [33m0[39m,
apps/hps-dealengine test:       floorHardwoodInstall: [33m0[39m,
apps/hps-dealengine test:       floorHardwoodRefinish: [33m0[39m,
apps/hps-dealengine test:       lightFixtures: [33m0[39m,
apps/hps-dealengine test:       bathrooms: [33m0[39m,
apps/hps-dealengine test:       plumbingFixtures: [33m0[39m,
apps/hps-dealengine test:       drywallRepair: [33m0[39m
apps/hps-dealengine test:     }
apps/hps-dealengine test:   },
apps/hps-dealengine test:   repairRates: {
apps/hps-dealengine test:     profileId: [32m'default'[39m,
apps/hps-dealengine test:     profileName: [32m'Default Profile'[39m,
apps/hps-dealengine test:     orgId: [32m'org-1'[39m,
apps/hps-dealengine test:     posture: [32m'base'[39m,
apps/hps-dealengine test:     marketCode: [32m'ORL'[39m,
apps/hps-dealengine test:     asOf: [32m'2024-01-01'[39m,
apps/hps-dealengine test:     source: [32m'seed'[39m,
apps/hps-dealengine test:     version: [32m'v1'[39m,
apps/hps-dealengine test:     isDefault: [33mtrue[39m,
apps/hps-dealengine test:     psfTiers: { none: [33m10[39m, light: [33m20[39m, medium: [33m30[39m, heavy: [33m40[39m },
apps/hps-dealengine test:     big5: { roof: [33m1[39m, hvac: [33m2[39m, repipe: [33m3[39m, electrical: [33m4[39m, foundation: [33m5[39m },
apps/hps-dealengine test:     lineItemRates: {}
apps/hps-dealengine test:   },
apps/hps-dealengine test:   marketCode: [32m'ORL'[39m,
apps/hps-dealengine test:   posture: [32m'base'[39m
apps/hps-dealengine test: }
apps/hps-dealengine test: [RepairsTab] props {
apps/hps-dealengine test:   meta: {
apps/hps-dealengine test:     profileId: [32m'99'[39m,
apps/hps-dealengine test:     profileName: [32m'Profile 99'[39m,
apps/hps-dealengine test:     marketCode: [32m'ORL'[39m,
apps/hps-dealengine test:     posture: [32m'base'[39m,
apps/hps-dealengine test:     asOf: [32m'2024-02-02'[39m,
apps/hps-dealengine test:     source: [32m'seed'[39m,
apps/hps-dealengine test:     version: [32m'v1'[39m
apps/hps-dealengine test:   },
apps/hps-dealengine test:   estimatorState: {
apps/hps-dealengine test:     costs: {
apps/hps-dealengine test:       exterior: [36m[Object][39m,
apps/hps-dealengine test:       interior: [36m[Object][39m,
apps/hps-dealengine test:       kitchenBath: [36m[Object][39m,
apps/hps-dealengine test:       systems: [36m[Object][39m,
apps/hps-dealengine test:       structural: [36m[Object][39m
apps/hps-dealengine test:     },
apps/hps-dealengine test:     quantities: {
apps/hps-dealengine test:       roof: [33m0[39m,
apps/hps-dealengine test:       roofRepair: [33m0[39m,
apps/hps-dealengine test:       exteriorPaint: [33m0[39m,
apps/hps-dealengine test:       windows: [33m0[39m,
apps/hps-dealengine test:       siding: [33m0[39m,
apps/hps-dealengine test:       interiorPaint: [33m0[39m,
apps/hps-dealengine test:       floorVinylLaminate: [33m0[39m,
apps/hps-dealengine test:       floorHardwoodInstall: [33m0[39m,
apps/hps-dealengine test:       floorHardwoodRefinish: [33m0[39m,
apps/hps-dealengine test:       lightFixtures: [33m0[39m,
apps/hps-dealengine test:       bathrooms: [33m0[39m,
apps/hps-dealengine test:       plumbingFixtures: [33m0[39m,
apps/hps-dealengine test:       drywallRepair: [33m0[39m
apps/hps-dealengine test:     }
apps/hps-dealengine test:   },
apps/hps-dealengine test:   repairRates: {
apps/hps-dealengine test:     profileId: [32m'99'[39m,
apps/hps-dealengine test:     profileName: [32m'Profile 99'[39m,
apps/hps-dealengine test:     orgId: [32m'org-1'[39m,
apps/hps-dealengine test:     posture: [32m'base'[39m,
apps/hps-dealengine test:     marketCode: [32m'ORL'[39m,
apps/hps-dealengine test:     asOf: [32m'2024-02-02'[39m,
apps/hps-dealengine test:     source: [32m'seed'[39m,
apps/hps-dealengine test:     version: [32m'v1'[39m,
apps/hps-dealengine test:     isDefault: [33mtrue[39m,
apps/hps-dealengine test:     psfTiers: { none: [33m11[39m, light: [33m22[39m, medium: [33m33[39m, heavy: [33m44[39m },
apps/hps-dealengine test:     big5: { roof: [33m9[39m, hvac: [33m8[39m, repipe: [33m7[39m, electrical: [33m6[39m, foundation: [33m5[39m },
apps/hps-dealengine test:     lineItemRates: {}
apps/hps-dealengine test:   },
apps/hps-dealengine test:   marketCode: [32m'ORL'[39m,
apps/hps-dealengine test:   posture: [32m'base'[39m
apps/hps-dealengine test: }
apps/hps-dealengine test:  [32m✓[39m tests/repairsTabRender.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 94[2mms[22m[39m
apps/hps-dealengine test: [2m Test Files [22m [1m[32m12 passed[39m[22m[90m (12)[39m
apps/hps-dealengine test: [2m      Tests [22m [1m[32m21 passed[39m[22m[90m (21)[39m
apps/hps-dealengine test: [2m   Start at [22m 23:50:47
apps/hps-dealengine test: [2m   Duration [22m 2.53s[2m (transform 5.43s, setup 0ms, import 7.74s, tests 323ms, environment 3ms)[22m
apps/hps-dealengine test: Done
```

- pnpm -w build
```
> hps-dealengine@0.0.0 build C:\Users\oziha\Documents\hps-dealengine
> pnpm --filter "./packages/contracts" --filter "./packages/engine" --filter "./apps/hps-dealengine" build

Scope: 3 of 6 workspace projects
packages/contracts build$ tsc -p tsconfig.json
packages/contracts build: Done
packages/engine build$ tsc -p tsconfig.build.json
packages/engine build: Done
apps/hps-dealengine build$ next build
apps/hps-dealengine build:   ▲ Next.js 14.2.5
apps/hps-dealengine build:   - Environments: .env.local
apps/hps-dealengine build:    Creating an optimized production build ...
apps/hps-dealengine build:  ✓ Compiled successfully
apps/hps-dealengine build:    Linting and checking validity of types ...
apps/hps-dealengine build: ./app/(app)/repairs/page.tsx
apps/hps-dealengine build: 227:6  Warning: React Hook useEffect has a missing dependency: 'deal'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./app/(app)/sandbox/page.tsx
apps/hps-dealengine build: 70:6  Warning: React Hook useEffect has a missing dependency: 'loadPresets'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./app/(app)/settings/user/page.tsx
apps/hps-dealengine build: 481:17  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
apps/hps-dealengine build: ./app/(app)/trace/page.tsx
apps/hps-dealengine build: 166:9  Warning: The 'fallbackRun' conditional could make the dependencies of useEffect Hook (at line 189) change on every render. To fix this, wrap the initialization of 'fallbackRun' in its own useMemo() Hook.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./app/(app)/underwrite/page.tsx
apps/hps-dealengine build: 390:6  Warning: React Hook useCallback has a missing dependency: 'dbDeal'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 489:6  Warning: React Hook useCallback has a missing dependency: 'repairRates'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 609:6  Warning: React Hook useCallback has missing dependencies: 'setHasUnsavedDealChanges', 'setLastRunAt', and 'setLastRunId'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./components/overview/OverviewTab.tsx
apps/hps-dealengine build: 194:6  Warning: React Hook React.useCallback has missing dependencies: 'dbDeal?.org_id', 'latestRunId', 'negotiationPlaybook', and 'posture'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./components/repairs/RepairsTab.tsx
apps/hps-dealengine build: 177:9  Warning: The 'resolveSqft' function makes the dependencies of useCallback Hook (at line 315) change on every render. To fix this, wrap the definition of 'resolveSqft' in its own useCallback() Hook.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 245:6  Warning: React Hook useMemo has a missing dependency: 'resolveSqft'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./components/sandbox/RepairsSandbox.tsx
apps/hps-dealengine build: 160:6  Warning: React Hook useEffect has a missing dependency: 'loadProfiles'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./components/ui/tooltip.tsx
apps/hps-dealengine build: 80:6  Warning: React Hook useEffect has a missing dependency: 'updatePosition'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./components/underwrite/UnderwriteTab.tsx
apps/hps-dealengine build: 217:9  Warning: The 'comps' conditional could make the dependencies of useMemo Hook (at line 250) change on every render. To fix this, wrap the initialization of 'comps' in its own useMemo() Hook.  react-hooks/exhaustive-deps
apps/hps-dealengine build: ./lib/dealSessionContext.tsx
apps/hps-dealengine build: 269:5  Warning: React Hook useMemo has a missing dependency: 'deal'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 270:7  Warning: React Hook useMemo has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 271:7  Warning: React Hook useMemo has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 272:7  Warning: React Hook useMemo has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 273:7  Warning: React Hook useMemo has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 634:5  Warning: React Hook React.useCallback has a missing dependency: 'dbDeal'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
apps/hps-dealengine build: 804:6  Warning: React Hook useEffect has missing dependencies: 'dbDeal.payload' and 'posture'. Either include them or remove the dependency array. You can also replace multiple useState variables with useReducer if 'setDeal' needs the current value of 'dbDeal.payload'.  react-hooks/exhaustive-deps
apps/hps-dealengine build: info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/basic-features/eslint#disabling-rules
apps/hps-dealengine build:    Collecting page data ...
apps/hps-dealengine build:    Generating static pages (0/36) ...
apps/hps-dealengine build:    Generating static pages (9/36) 
apps/hps-dealengine build:    Generating static pages (18/36) 
apps/hps-dealengine build:    Generating static pages (27/36) 
apps/hps-dealengine build:  ✓ Generating static pages (36/36)
apps/hps-dealengine build:    Finalizing page optimization ...
apps/hps-dealengine build:    Collecting build traces ...
apps/hps-dealengine build: Route (app)                              Size     First Load JS
apps/hps-dealengine build: ┌ ƒ /                                    165 B          87.3 kB
apps/hps-dealengine build: ├ ƒ /_not-found                          165 B          87.3 kB
apps/hps-dealengine build: ├ ƒ /admin/valuation-qa                  14.4 kB         167 kB
apps/hps-dealengine build: ├ ƒ /ai-bridge/debug                     1.18 kB         138 kB
apps/hps-dealengine build: ├ ƒ /api/agents/analyst                  0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/agents/negotiator               0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/agents/strategist               0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/deals                           0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/deals/[id]                      0 B                0 B
apps/hps-dealengine build: ├ ○ /api/debug/openai                    0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/health                          0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/places/autocomplete             0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/places/details                  0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/scenarios                       0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/scenarios/[id]                  0 B                0 B
apps/hps-dealengine build: ├ ○ /api/tokens                          0 B                0 B
apps/hps-dealengine build: ├ ○ /api/user-prefs                      0 B                0 B
apps/hps-dealengine build: ├ ƒ /api/version                         0 B                0 B
apps/hps-dealengine build: ├ ƒ /deals                               1.74 kB         372 kB
apps/hps-dealengine build: ├ ƒ /debug/ping                          1.1 kB          138 kB
apps/hps-dealengine build: ├ ƒ /debug/ping/policy                   1.2 kB          138 kB
apps/hps-dealengine build: ├ ƒ /login                               2.8 kB          145 kB
apps/hps-dealengine build: ├ ƒ /logout                              2.93 kB         329 kB
apps/hps-dealengine build: ├ ƒ /overview                            20.1 kB         362 kB
apps/hps-dealengine build: ├ ƒ /repairs                             9.86 kB         342 kB
apps/hps-dealengine build: ├ ƒ /runs                                2.96 kB         342 kB
apps/hps-dealengine build: ├ ƒ /runs/[id]                           1.89 kB         146 kB
apps/hps-dealengine build: ├ ƒ /sandbox                             14 kB           346 kB
apps/hps-dealengine build: ├ ƒ /settings                            778 B          87.9 kB
apps/hps-dealengine build: ├ ƒ /settings/overrides                  3.01 kB         335 kB
apps/hps-dealengine build: ├ ƒ /settings/policy                     1.63 kB         337 kB
apps/hps-dealengine build: ├ ƒ /settings/policy-overrides           2.75 kB         335 kB
apps/hps-dealengine build: ├ ƒ /settings/policy-versions            1.95 kB         148 kB
apps/hps-dealengine build: ├ ƒ /settings/sandbox                    373 B          87.5 kB
apps/hps-dealengine build: ├ ƒ /settings/user                       6.49 kB         318 kB
apps/hps-dealengine build: ├ ƒ /sources                             738 B          96.8 kB
apps/hps-dealengine build: ├ ƒ /startup                             2.1 kB          373 kB
apps/hps-dealengine build: ├ ƒ /trace                               9.44 kB         344 kB
apps/hps-dealengine build: └ ƒ /underwrite                          27.2 kB         359 kB
apps/hps-dealengine build: + First Load JS shared by all            87.1 kB
apps/hps-dealengine build:   ├ chunks/5145c5cb-1f9f09b35f8e0904.js  53.6 kB
apps/hps-dealengine build:   ├ chunks/5736-fbeb3ee5117d124c.js      31.5 kB
apps/hps-dealengine build:   └ other shared chunks (total)          1.97 kB
apps/hps-dealengine build: ƒ Middleware                             26.2 kB
apps/hps-dealengine build: ○  (Static)   prerendered as static content
apps/hps-dealengine build: ƒ  (Dynamic)  server-rendered on demand
apps/hps-dealengine build: Done
```

## Verification table
| Item | Status (DONE / IN PROGRESS / NOT STARTED / BLOCKED) | Evidence (paths + commands) | What’s missing / next step |
| --- | --- | --- | --- |
| Stand up QA Supabase with seeded READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals; run env-gated Playwright specs and consider enabling in CI. | BLOCKED | `docs/QA_ENV_V1.md`, `scripts/seed-qa.ts`, `scripts/qa-preflight.ps1`, `tests/e2e/*`, `Get-Content docs\QA_ENV_V1.md`, env var check output, `.github/workflows/ci.yml` Playwright step | Load QA env vars (`. .\scripts\qa-env.ps1`) or seed QA locally; run `scripts/qa-preflight.ps1` and `pnpm -w test:e2e`; wire QA secrets + `PLAYWRIGHT_ENABLE=true` in CI if desired. |
| Valuation Spine (Address → Comps → ARV → Prefill): document and wire address versioning → valuation_run history, org-scoped property_snapshot caching, and UI hydration from persisted valuations. | IN PROGRESS | `supabase/migrations/20251212120000_property_snapshots_and_valuation_runs.sql`, `supabase/functions/_shared/valuationSnapshot.ts`, `supabase/functions/_shared/valuation.ts`, `apps/hps-dealengine/lib/valuation.ts`, `apps/hps-dealengine/app/(app)/underwrite/page.tsx` | No explicit address versioning triggers or UI behavior on address edits found; add documentation + wiring for address changes to create new valuation_run entries. |
| Repairs UX/ergonomics: fix org alignment for repair profiles/rates, tighten RepairsTab meta and presentation. | DONE | `packages/contracts/src/repairRates.ts`, `supabase/functions/v1-repair-rates/index.ts`, `supabase/functions/v1-repair-profiles/index.ts`, `apps/hps-dealengine/components/repairs/RepairsTab.tsx`, `apps/hps-dealengine/tests/repairsTabRender.test.tsx` | None. |
| Overrides/governance: light UI for override request/review, keep governance RLS and trace visibility. | DONE | `supabase/migrations/20251126233123_create_policy_overrides.sql`, `apps/hps-dealengine/components/underwrite/RequestOverrideModal.tsx`, `apps/hps-dealengine/app/(app)/settings/policy-overrides/page.tsx`, `apps/hps-dealengine/app/(app)/trace/page.tsx` | None. |
| AI surfaces: Tri-agent chat with Supabase history is live; `/api/agents` + @hps/agents/HPS MCP groundwork exists. Remaining hardening is tone/copy plus strategist/negotiator stability without changing engine math/policy. | IN PROGRESS | `apps/hps-dealengine/components/ai/*`, `supabase/migrations/20251208133000_ai_chat_history.sql`, `supabase/migrations/20251209120000_agent_runs.sql`, `apps/hps-dealengine/app/api/agents/*/route.ts` | Tone/copy hardening not audited; no UI retry/backoff surfaces found for strategist/negotiator; consider adding stability guards. |
| Agent Platform vNext: ✅ `/api/agents` tri personas with caller JWT + `agent_runs` logging; ✅ @hps/agents SDK; ✅ HPS MCP server; ⭕ expand Strategist/Negotiator evals/tools and UI retries/backoff. | IN PROGRESS | `apps/hps-dealengine/app/api/agents/*/route.ts`, `supabase/migrations/20251209120000_agent_runs.sql`, `packages/agents/src`, `packages/hps-mcp/src`, `rg -n "strategist|negotiator" packages/agents/tests` | Add strategist/negotiator evals/tools, and UI retry/backoff hooks. |
| Negotiator Playbook Unblock: handle OpenAI responses 429/token caps/dataset load resilience and user-facing retry/error copy. | IN PROGRESS | `packages/agents/src/negotiator/negotiatorAgent.ts` (retry + 429 detection), `packages/agents/src/negotiator/shared.ts` (dataset fallback), `apps/hps-dealengine/lib/aiBridge.ts` (rate-limit message), `apps/hps-dealengine/app/api/agents/negotiator/route.ts` | No explicit token-cap/context-length handling found; add explicit detection + user copy. |
| Minor ergonomics: Sandbox/Startup/Deals copy and hints; numeric/UX-only knob presentation where safe (rounding, buyer-cost presentation) without changing math (null-backed numeric input foundation in shared components/defaults is done; rollout across all forms still pending). | IN PROGRESS | `apps/hps-dealengine/components/ui/NumericInput.tsx`, `rg -n "NumericInput" apps/hps-dealengine`, `rg -n 'type="number"' apps/hps-dealengine` | Roll NumericInput (null-backed) through remaining forms (UnderwriteTab, RepairsTab, RepairsSandbox, DoubleCloseCalculator, admin valuation-qa, etc). |
| Ground-truth/eval harness migrations and admin QA page are in repo; RentCast closed-sales seeder added (caller JWT only). QA rollout/seeded datasets beyond `orlando_smoke_32828_sf_v2` still to be confirmed. | IN PROGRESS | `supabase/migrations/20260107101500_valuation_ground_truth_eval_runs.sql`, `supabase/migrations/20251223120000_valuation_continuous_calibration.sql`, `apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx`, `supabase/functions/v1-valuation-eval-run/index.ts`, `scripts/valuation/seed-ground-truth-from-rentcast.ps1`, `Get-ChildItem scripts/valuation/datasets` | Confirm QA rollout + datasets beyond `orlando_smoke_32828_sf_v2`. |
| Underwriting integration alignment: engine input uses latest persisted valuation artifacts (ARV/As-Is/market signals) and traces reference valuation artifact IDs; never reintroduce Offer Price as an Underwrite input. | IN PROGRESS | `apps/hps-dealengine/components/underwrite/UnderwriteTab.test.tsx`, `apps/hps-dealengine/lib/dealSessionContext.tsx`, `rg -n "offer_price|offerPrice" packages/contracts packages/engine` (no matches), `apps/hps-dealengine/lib/sandboxPolicy.ts` | Add valuation_run_id/property_snapshot_id to analyze inputs and trace; persist valuation artifact IDs with runs; show IDs in Trace UI. |
| Slice 8A (valuation quality comps-only) - Implemented/evaluated selection_v1_3 (deterministic outliers + diagnostics). Result: regressed on orlando_smoke_32828_sf_v2; keep default selection_v1_1, leave selection_v1_3 policy-gated/opt-in for future datasets. | DONE | `supabase/functions/_shared/valuationSelection.ts`, `supabase/functions/v1-valuation-run/index.ts`, `apps/hps-dealengine/components/underwrite/CompsPanel.tsx` | None. |
| Slice 8 - E2E/regression rails: core underwriting rails are implemented (login/startup/deep-links + overview/underwrite/repairs/trace + pixel snapshots + autosave), valuation-specific assertions (deal create/valuation refresh/comps/override gating) remain for that slice. | IN PROGRESS | `tests/e2e/*`, `tests/e2e/underwrite.analyze.spec.ts` | Add valuation-specific assertions and run under QA env. |
| Offer Package Generation: seller-facing offer artifact tied to run_id + valuation artifact + policy snapshot + timestamp (auditable event). | NOT STARTED | `rg -n "offer_package|offer_artifact|seller_facing" supabase apps packages` (no matches); `rg -n "offer-package|/offer|/package|/export|/pdf" apps/hps-dealengine/app` | Add schema + RLS, edge function to generate artifact, UI route to export/download with run_id + policy snapshot + valuation artifact. |
| Under Contract capture: deal status transition + executed contract price capture, separate from pre-offer workflow. | NOT STARTED | `rg -n "deal_status|contract_status|executed_contract_price|under_contract" supabase apps packages` (no matches), `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx` read-only contract price | Add deal status column + RLS, capture flow, and UI controls separate from pre-offer workflow. |
| Consider enabling Playwright in CI. | IN PROGRESS | `.github/workflows/ci.yml` Playwright steps (`rg -n "playwright" .github/workflows`) | CI uses optional Playwright step; enable via QA env/secrets + `PLAYWRIGHT_ENABLE=true` if desired. |

## ✅ DONE
- Repairs UX/ergonomics: org alignment and RepairsTab meta presentation are implemented. Evidence: `packages/contracts/src/repairRates.ts`, `supabase/functions/v1-repair-rates/index.ts`, `supabase/functions/v1-repair-profiles/index.ts`, `apps/hps-dealengine/components/repairs/RepairsTab.tsx`.
- Overrides/governance: RLS + request/review UI + trace visibility are implemented. Evidence: `supabase/migrations/20251126233123_create_policy_overrides.sql`, `apps/hps-dealengine/components/underwrite/RequestOverrideModal.tsx`, `apps/hps-dealengine/app/(app)/settings/policy-overrides/page.tsx`, `apps/hps-dealengine/app/(app)/trace/page.tsx`.
- Slice 8A selection_v1_3: selection_v1_3 exists and default remains selection_v1_1, policy-gated. Evidence: `supabase/functions/_shared/valuationSelection.ts`, `supabase/functions/v1-valuation-run/index.ts`, `apps/hps-dealengine/components/underwrite/CompsPanel.tsx`.

## 🟡 IN PROGRESS
- Ground-truth/eval harness: migrations + admin QA page + RentCast seeder exist; datasets beyond `orlando_smoke_32828_sf_v2` not confirmed. Evidence: `supabase/migrations/20260107101500_valuation_ground_truth_eval_runs.sql`, `supabase/migrations/20251223120000_valuation_continuous_calibration.sql`, `apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx`, `scripts/valuation/seed-ground-truth-from-rentcast.ps1`, `scripts/valuation/datasets/orlando-dealids.json`.
- Underwriting integration alignment: Offer Price input absent, but analyze inputs/traces don’t reference valuation artifact IDs. Evidence: `apps/hps-dealengine/components/underwrite/UnderwriteTab.test.tsx`, `apps/hps-dealengine/lib/dealSessionContext.tsx`, `apps/hps-dealengine/lib/sandboxPolicy.ts`, `rg -n "arv_valuation_run_id" packages/contracts/src/analyze.ts` (no matches).
- Valuation Spine wiring: property_snapshots + valuation_runs + UI hydration exist, but no explicit address versioning trigger found. Evidence: `supabase/migrations/20251212120000_property_snapshots_and_valuation_runs.sql`, `supabase/functions/_shared/valuationSnapshot.ts`, `apps/hps-dealengine/lib/valuation.ts`, `apps/hps-dealengine/app/(app)/underwrite/page.tsx`.
- E2E/regression rails: baseline specs exist, valuation-specific assertions still missing. Evidence: `tests/e2e/*`, `tests/e2e/underwrite.analyze.spec.ts`.
- AI surfaces + Agent Platform vNext: tri-agent routes + history + agent_runs logging exist; strategist/negotiator evals and UI retry/backoff still missing. Evidence: `apps/hps-dealengine/app/api/agents/*/route.ts`, `supabase/migrations/20251209120000_agent_runs.sql`, `packages/agents/tests/strategist-kb.test.ts`.
- Negotiator Playbook Unblock: rate-limit handling + retries + dataset fallback exist; token cap handling not found. Evidence: `packages/agents/src/negotiator/negotiatorAgent.ts`, `packages/agents/src/negotiator/shared.ts`, `apps/hps-dealengine/lib/aiBridge.ts`.
- Minor ergonomics: NumericInput foundation exists, but not rolled out widely. Evidence: `apps/hps-dealengine/components/ui/NumericInput.tsx`, `apps/hps-dealengine/components/underwrite/ScenarioModeler.tsx`, `rg -n 'type="number"' apps/hps-dealengine`.
- Playwright in CI: steps exist but env-gated; enable with QA env + `PLAYWRIGHT_ENABLE=true`. Evidence: `.github/workflows/ci.yml`.

## 🔴 NOT STARTED
- Offer Package Generation: no schema, edge function, or UI route found. Evidence: `rg -n "offer_package|offer_artifact|seller_facing" supabase apps packages` (no matches).
- Under Contract capture: no deal status schema or UI transition found; only read-only contract price display. Evidence: `rg -n "deal_status|contract_status|executed_contract_price|under_contract" supabase apps packages` (no matches).

## ⛔ BLOCKED/UNKNOWN
- QA Supabase seeding + Playwright runtime validation: `.env.qa` exists but required env vars are missing in shell (`PLAYWRIGHT_ENABLE`, `DEALENGINE_QA_API_URL`, etc.). Run `scripts/qa-preflight.ps1` and `pnpm -w test:e2e` after loading QA env.

## Evidence log (selected snippets)
### Ground-truth/eval harness + calibration buckets/weights
- rg -n "valuation_ground_truth|valuation_eval_runs|valuation_calibration_buckets|valuation_weights" supabase/migrations
```
supabase\migrations\20251223120000_valuation_continuous_calibration.sql:3:--   - public.valuation_calibration_buckets (per-strategy aggregated error metrics by bucket)
supabase\migrations\20251223120000_valuation_continuous_calibration.sql:4:--   - public.valuation_weights (versioned per-strategy weight publishes by bucket)
...
supabase\migrations\20260107101500_valuation_ground_truth_eval_runs.sql:6:-- ========= valuation_ground_truth =========
supabase\migrations\20260107101500_valuation_ground_truth_eval_runs.sql:79:-- ========= valuation_eval_runs =========
```
- supabase/migrations/20260107101500_valuation_ground_truth_eval_runs.sql (RLS)
```
   7: create table if not exists public.valuation_ground_truth (
  25: alter table public.valuation_ground_truth enable row level security;
  31:       'valuation_ground_truth_sel',
  79: create table if not exists public.valuation_eval_runs (
  97: alter table public.valuation_eval_runs enable row level security;
 103:       'valuation_eval_runs_sel',
```
- supabase/migrations/20251223120000_valuation_continuous_calibration.sql (RLS)
```
  16: create table if not exists public.valuation_calibration_buckets (
  45: alter table public.valuation_calibration_buckets enable row level security;
  48: drop policy if exists valuation_calibration_buckets_select on public.valuation_calibration_buckets;
  99: create table if not exists public.valuation_weights (
 125: alter table public.valuation_weights enable row level security;
 127: drop policy if exists valuation_weights_select on public.valuation_weights;
```
- Admin QA page exists
```
FullName                                                                                          Length
--------                                                                                          ------
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\app\(app)\admin\valuation-qa\page.tsx  84648
```
- Eval function exists
```
FullName                                                                                  Length
--------                                                                                  ------
C:\Users\oziha\Documents\hps-dealengine\supabase\functions\v1-valuation-eval-run\index.ts  18895
```
- RentCast seeder uses caller JWT
```
 184: Write-Host ("Caller JWT acquired via password grant ({0}, not printed)." -f $cred.label) -ForegroundColor Green
 196: Write-Host "FAIL: Caller JWT missing. Provide HPS_CALLER_JWT/SUPABASE_CALLER_JWT or HPS_SMOKE_EMAIL/HPS_SMOKE_PASSWORD; dev fallback requires reset-dev-auth-users.ts." -ForegroundColor Red
 206: Authorization  = "Bearer $ResolvedCallerJwt"
```
- Dataset list
```
FullName
--------
C:\Users\oziha\Documents\hps-dealengine\scripts\valuation\datasets\orlando-dealids.json
```

### Underwriting integration alignment (Offer Price removal + valuation artifact IDs)
- Offer Price not rendered in UI
```
  64:   it("does not render Offer Price input in Market & Valuation", () => {
  73:     expect(screen.queryByText(/Offer Price \(Draft\)/i)).toBeNull();
```
- Legacy offer_price stripped in session context
```
 137:   const { offer_price: _legacyOfferPrice, ...restMarket } = marketSource;
 138:   d.market = {
 139:     arv: marketSource?.arv ?? null,
```
- No offer_price in contracts/engine inputs
```
rg -n "offer_price|offerPrice" packages\contracts packages\engine
(no matches)
```
- Analyze payload uses market.arv/as_is (no valuation_run_id)
```
 537:     deal: {
 538:       dealId: dbDealId,
 539:       arv: toNumberOrNull(market.arv ?? market.arv_value),
 540:       aiv: toNumberOrNull(market.as_is_value ?? market.aiv),
```
- Valuation run persistence includes property_snapshot_id
```
 804:       property_snapshot_id: snapshot.id,
 950:       property_snapshot_id: snapshot.id,
 987:         property_snapshot_id: snapshot.id,
```
- UI hydration reads valuation_runs + property_snapshots
```
  79:     .from("valuation_runs")
  81:       "*, property_snapshots:property_snapshot_id(id, org_id, address_fingerprint, source, provider, as_of, window_days, sample_n, comps, market, raw, stub, expires_at, created_at)",
```
- Underwrite page hydrates latest valuation run
```
 299:       const latest = await fetchLatestValuationRun(dbDeal.id);
 301:         setValuationRun(latest as ValuationRun);
 302:         const snapshot = (latest as any)?.property_snapshots ?? null;
```
- No valuation_run_id in analyze inputs
```
rg -n "arv_valuation_run_id|as_is_value_valuation_run_id" packages\contracts\src\analyze.ts packages\engine
(no matches)
```

### Selection v1.3 + default v1.1
- Selection default + v1_3 implemented
```
 999:     (opts.policyValuation as any)?.selectionVersion ??
1000:     "selection_v1_1";
1001:   if (version === "selection_v1_3") {
1002:     return runValuationSelectionV1_3(opts);
1004:   return runValuationSelectionV1_1(opts);
```
- v1-valuation-run default selection_v1_1
```
 216:     const selectionVersion =
 217:       (valuationPolicy as any)?.selection_version ??
 218:       (valuationPolicy as any)?.selectionVersion ??
 219:       "selection_v1_1";
```
- UI badge shows selection version
```
 262:   const selectionVersionLabel = selectionVersion ?? selectionDiagnostics?.version ?? "selection_v1_1";
 320:           Selection: {selectionVersionLabel}
```

### Offer Package Generation
- No offer package artifacts in repo
```
rg -n "offer_package|offer_artifact|seller_facing" supabase apps packages
(no matches)
```
- No offer package routes
```
apps\hps-dealengine\app\(app)\layout.tsx:24:import OfferChecklistPanel from "@/components/offerChecklist/OfferChecklistPanel";
```

### Under Contract capture
- No status columns found
```
rg -n "deal_status|contract_status|executed_contract_price|under_contract" supabase apps packages
(no matches)
```
- Only read-only executed contract price display
```
 193:   const contractPriceExecuted = market.contract_price_executed ?? null;
 644:                 <span className="w-40 text-text-primary">Contract Price (Executed)</span>
 652:                     <span className="sr-only">No contract price yet</span>
```

### Playwright in CI
- CI workflow has Playwright step
```
  43:       # Optional Playwright step (kept after build; enable if repo has PW tests)
  44:       - name: Install Playwright Browsers
  45:         if: hashFiles('**/playwright.config.*') != ''
  46:         run: npx playwright install --with-deps
  48:       - name: Playwright Tests
  49:         if: hashFiles('**/playwright.config.*') != ''
  50:         run: npx playwright test --reporter=dot
```

### Valuation Spine wiring
- property_snapshots + valuation_runs schema + RLS
```
  28: alter table public.property_snapshots enable row level security;
  62: -- ========= valuation_runs (append-only valuation artifacts) =========
  87: alter table public.valuation_runs enable row level security;
  95:     execute $$create policy valuation_runs_select_in_org on public.valuation_runs
```
- address_fingerprint caching in valuationSnapshot
```
 671:       "id, org_id, address_fingerprint, source, provider, as_of, window_days, sample_n, comps, market, raw, stub, expires_at, created_at",
 674:     .eq("address_fingerprint", fingerprint)
 703:     address_fingerprint: fingerprint,
```
- fingerprintAddress helper
```
 112: export async function fingerprintAddress(address: DealAddress): Promise<string> {
 113:   const normalized = normalizeAddress(address);
```
- Address versioning explicit references not found
```
rg -n "address version|address_version|addressVersion" apps supabase packages
(no matches)
```

### Repairs UX/ergonomics
- Request contract uses dealId (org alignment)
```
  5:  * dealId is preferred to anchor org resolution to the active deal.
  8:   dealId: z.string().uuid(),
```
- v1-repair-rates resolves org via deal
```
  88: async function resolveOrgIdFromDeal(
 111:   debugLog("org resolved from deal", { dealId, orgId: data.org_id }, { force: true });
 212:     orgId = await resolveOrgIdFromDeal(supabase, dealId, userId);
```
- v1-repair-profiles resolves org via dealId
```
 214:   if (dealId) {
 223:       .eq("id", dealId)
 248:     debugLog("org resolved from deal", { dealId, orgId: data.org_id, userId }, { force: true });
```
- RepairsTab meta bar exists
```
  76: const RatesMetaBar: React.FC<{
 695:       <RatesMetaBar
```

### Overrides/governance
- policy_overrides RLS
```
  56: ALTER TABLE public.policy_overrides ENABLE ROW LEVEL SECURITY;
  69:   CREATE POLICY "Analysts request overrides" ON public.policy_overrides
  90:   CREATE POLICY "Org members view overrides" ON public.policy_overrides
```
- Request/review UI + trace display
```
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\components\underwrite\RequestOverrideModal.tsx
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\app\(app)\settings\policy-overrides\page.tsx
 835:                 {selected ? "No approved overrides for this run yet." : "// Select a run"}
```

### AI surfaces + agent platform
- AI window components
```
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\components\ai\DealAnalystWindow.tsx
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\components\ai\DealStrategistWindow.tsx
C:\Users\oziha\Documents\hps-dealengine\apps\hps-dealengine\components\ai\DealNegotiatorWindow.tsx
```
- Agent routes use caller JWT
```
  42:   const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  90:         Authorization: `Bearer ${accessToken}`,
```
- agent_runs table with RLS
```
  41: alter table public.agent_runs enable row level security;
  48:     execute $$create policy agent_runs_select on public.agent_runs
  64:     execute $$create policy agent_runs_insert on public.agent_runs
```
- ai_chat_history RLS
```
 105: alter table public.ai_chat_threads enable row level security;
 106: alter table public.ai_chat_messages enable row level security;
```
- Strategist/negotiator evals absent
```
rg -n "strategist|negotiator" packages\agents\tests
packages\agents\tests\strategist-kb.test.ts:9:} from "../src/strategist/shared";
```

### Negotiator Playbook Unblock
- Retry + rate limit detection
```
 105: async function callNegotiatorLLMWithRetry(args: {
 122:         code === "rate_limit_exceeded" ||
 123:         status === 429 ||
```
- Dataset fallback paths
```
 111:     path.resolve(process.cwd(), "data/negotiation-matrix/negotiation-matrix.data.json"),
 112:     path.resolve(process.cwd(), "docs/ai/negotiation-matrix/negotiation-matrix.example.json"),
```
- Rate-limit user copy
```
 342:     const rateLimitMessage =
 345:       const message = error === "rate_limited" ? rateLimitMessage : json?.error ?? "Negotiator is unavailable. Please try again.";
```
- No explicit token cap/context-length handling found
```
rg -n "context_length|token cap|max_tokens|too many tokens|rate_limit" packages/agents apps/hps-dealengine
```

### Minor ergonomics (numeric input rollout)
- NumericInput foundation and limited usage
```
rg -n "NumericInput" apps/hps-dealengine
apps\hps-dealengine\components\underwrite\ScenarioModeler.tsx:5:import NumericInput from "../ui/NumericInput";
apps\hps-dealengine\components\ui\NumericInput.tsx:3:export interface NumericInputProps
```
- Remaining type="number" usages (partial list)
```
apps\hps-dealengine\components\repairs\RepairsTab.tsx:510:              type="number"
apps\hps-dealengine\components\underwrite\UnderwriteTab.tsx:492:                type="number"
apps\hps-dealengine\components\underwrite\DoubleCloseCalculator.tsx:63:              type="number"
apps\hps-dealengine\app\(app)\admin\valuation-qa\page.tsx:1169:                type="number"
```

## Security scan (service_role / verify_jwt)
- git grep -n "service_role" -- .
```
AGENTS.md:134:- All user-facing reads/writes must use the **caller’s JWT**, never `service_role`.
apps/hps-dealengine/lib/supabase/server.ts:4: * Server-side Supabase client factory (no service_role).
... (docs + schema dumps + admin scripts)
scripts/reset-dev-auth-users.ts:9: * - auth.users: Supabase Auth store (managed via service_role).
... supabase-schema-*.sql and supabase/migrations/20251108001201_remote_schema.sql grants ...
```
Classification: OK (docs + schema dumps + admin/seed tooling). No user-facing UI/Edge function usage of service_role found.

- git grep -n "SUPABASE_SERVICE_ROLE_KEY" -- .
```
scripts/reset-dev-auth-users.ts:112:  "SUPABASE_SERVICE_ROLE_KEY",
scripts/seed-qa.ts:617:  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
... tools/seed-qa-membership.ps1 ...
```
Classification: OK (admin/seed scripts only).

- git grep -n "SERVICE_ROLE" -- .
```
scripts/reset-dev-auth-users.ts:113:  "SERVICE_ROLE_KEY",
scripts/seed-qa.ts:65:  if (!env.SUPABASE_SERVICE_ROLE_KEY && env.SERVICE_ROLE_KEY) {
... tools/seed-qa-membership.ps1 ...
```
Classification: OK (admin/seed scripts only).

- git grep -n "createClient(.*service" -- .
```
scripts/reset-dev-auth-users.ts:340:  const client = createClient(supabaseUrl, serviceRoleKey, {
```
Classification: OK (dev/admin script).

- verify_jwt scan
```
rg -n "verify_jwt" supabase
supabase\config.toml:344:verify_jwt = false
supabase\functions\v1-ping\deno.json:3:  "verify_jwt": true
supabase\functions\v1-ping\config.toml.off:1:verify_jwt = false
... other functions have verify_jwt=true ...
```
Note: `supabase/config.toml` sets `functions.v1-ping.verify_jwt = false` (health check). If v1-ping is user-facing, consider whether it should remain unauthenticated; all other functions appear verify_jwt=true.

## Doc drift (exact lines to change; no edits applied)
1) `docs/roadmap-v1-v2-v3.md:358` currently says:
   - "Stand up QA Supabase with seeded READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals; run env-gated Playwright specs and consider enabling in CI."
   Proposed update: reflect that Playwright steps already exist in `.github/workflows/ci.yml` but are env-gated; e.g. "... run env-gated Playwright specs; CI already includes Playwright steps, enable by setting QA env + PLAYWRIGHT_ENABLE in CI."

2) `docs/roadmap-v1-v2-v3.md:360` currently says:
   - "Repairs UX/ergonomics: fix org alignment for repair profiles/rates, tighten RepairsTab meta and presentation."
   Repo evidence shows org alignment and RepairsTab meta already implemented; move this bullet into DONE or mark complete.

3) `docs/devlog-hps-dealengine.md:49` currently says:
   - "... repairs math uses live rates. (Org alignment bug noted earlier, tracked as v1.1 hardening.)"
   Repo evidence shows org alignment fixed (dealId-based org resolution in v1-repair-rates/profiles). Update the parenthetical to reflect completion.

4) `docs/devlog-hps-dealengine.md:75` currently says:
   - "Fix org alignment for repair profiles/rates sync; tidy RepairsTab meta and presentation."
   Evidence indicates this is done; mark as completed or move out of Near-Term Focus.

5) `docs/devlog-hps-dealengine.md:893` currently says:
   - "2025-12-02 - Repairs org alignment & sandbox reset ((pending))"
   If org alignment is now fixed, remove the "pending" qualifier or add a follow-up entry noting completion.
