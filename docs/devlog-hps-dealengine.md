# HPS DealEngine - Devlog

Lightweight running log of what's actually been done and what's next.  
This is the **"what changed, when, and what's the next move?"** companion to:

- `docs/primer-hps-dealengine.md` - stable architecture + non-negotiables.
- `docs/roadmap-v1-v2-v3.md` - roadmap, phases, and sprint framing.

Use this file to orient quickly before doing work or delegating to an agent.

---

## 0. How to Use This Devlog

- **Audience:** You (OZi), future collaborators, and AI agents.
- **Granularity:** High-level but concrete - no commit hashes, just meaningful milestones.
- **Sections:**
  - **0.x Status Snapshots** - current truth, kept up to date.
  - **Dated Entries** - chronological log of key changes.
  - **Near-Term Focus** - what weve agreed is "next" based on roadmap.

When something significant ships, changes direction, or gets blocked, add a dated entry here.

---

## 0.1 Current Status Snapshot (as of 2025-12-18)

**V1 is field-ready**: deterministic single-deal underwriting with Business Sandbox v1, Dashboard/Trace explainability, and an env-gated QA/E2E harness.

- **Architecture & principles**
  - Primer + roadmap are the guardrails (policy-first, deterministic hashes via `runs`, RLS-first).
  - Edge-backed engine (`v1-analyze` + `buildUnderwritingPolicyFromOptions`) is the single source of underwriting math; no browser-only finals.

- **Business Sandbox v1**
  - 196 knobs classified in `docs/knobs-audit-v1.md` with coverage in `tools/knob-coverage-report.cjs/json`.
  - All `KEEP` knobs are runtime-wired (runtime_math/risk_gate/workflow) except three `ux_only`: `abcConfidenceGradeRubric`, `allowAdvisorOverrideWorkflowState`, `buyerCostsLineItemModelingMethod` (surfaced as UX/policy context, no math impact).
  - `BusinessLogicSandbox` hides DROP backlog knobs; `KnobFamilySummary` + UX band show policy context; coverage map lives in repo.

- **Dashboard / nav / flows**
  - `/overview` labeled **Dashboard** with `TopDealKpis` (ARV, MAO, discount, assignment vs target/max, DTM/speed, risk/confidence/workflow), Strategy/Guardrails, Timeline & Carry, Risk & Evidence cards.
  - Nav split: left `Dashboard`; right `Repairs  Underwrite  Deals  Trace  Sandbox  Settings`. Deal-required routes append `?dealId=`; no-deal clicks fall back to `/startup`.
  - `/startup` hub (empty state + "View all deals"), `/deals` list sets `DealSession` and routes to `/overview?dealId=...`.

- **Evidence / risk / workflow**
  - Placeholder knob (`assumptionsProtocolPlaceholdersWhenEvidenceMissing`) drives evidence freshness, confidence downgrade, workflow state, and traces (allowed/used/kinds). Workflow card shows one-line reason; per-kind freshness has blocking markers; risk pills show disabled/failing states; confidence badge follows rubric.
  - Trace renders EVIDENCE_FRESHNESS_POLICY, RISK_GATES_POLICY, CONFIDENCE_POLICY, WORKFLOW_STATE_POLICY with thresholds, placeholders, rubric text, and gate enablement.

- **Repairs**
  - `repair_rate_sets` + `v1-repair-rates` + RepairsTab wired to live ORL defaults with RLS. Profiles served via `v1-repair-profiles`; repairs math uses live rates. (Org alignment bug noted earlier, tracked as v1.1 hardening.)

- **QA / E2E harness**
  - `docs/QA_ENV_V1.md` defines QA Supabase setup, required env vars (QA user + READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals), and how to run specs.
  - Playwright specs (`golden-path`, `timeline-and-carry`, `risk-and-evidence`) align to Startup -> Deals -> Dashboard IA, assert Dashboard heading and current risk/evidence/workflow surfaces, and skip cleanly when env vars are absent.
  - Core commands green: `pnpm -w typecheck`, `pnpm -w build` (Sentry/require-in-the-middle warning only), `pnpm -w test`.
- **AI & Agents (v1 + vNext)**
  - Tri-agent UI (Analyst/Strategist/Negotiator) is live with Supabase chat history + run freshness gating; client calls hit `/api/agents/*` with caller JWT (no service_role).
  - @hps/agents package backs the routes; `agent_runs` table logs persona/agent/workflow_version/model/input/output/error/tokens under memberships-scoped RLS.
  - HPS MCP server exists (stdio + Streamable HTTP); tools include deal/run/evidence loaders, negotiation matcher, KPI/risk aggregations, sandbox fetch, and KB search; HTTP auth via `HPS_MCP_HTTP_TOKEN` env.
  - Known blocker: Negotiator "Generate playbook" can hit provider rate limits (429) on the OpenAI responses endpoint; UI surfaces a rate-limit message when triggered.
- **Calibration loop (Slice 7)**: `input_hash=fa0ed738edbe9c0258b382bf86b453d5618bca19700f9cea01e6e12351f1f7b4`, `eval_run_id=c8aef542-09b9-4a0b-9a6c-4ff6bf3b3de9`, `ranges_present=11`, `in_range_rate_overall~0.3636`; ensemble sweep best at `avm_weight=0` (`MAE~85091.95`, `MAPE~0.1422`) so ensemble stays OFF by default.

---

## 0.2 Near-Term Focus (Next Sprints)

V1 is complete. Near-term is v1.1 hardening; v2+ stays backlog:

1) **QA Supabase + E2E enablement**
   - Stand up QA Supabase with seeded READY/TIMELINE/STALE_EVIDENCE/HARD_GATE deals per `docs/QA_ENV_V1.md`.
   - Run env-gated Playwright specs against QA; optionally enable in CI.

2) **Repairs/UX polish**
   - Fix org alignment for repair profiles/rates sync; tidy RepairsTab meta and presentation.
   - Consume UX-only knobs where safe (rounding, buyer-cost presentation) without changing math.

3) **Overrides/governance hardening**
   - Light UI for override request/review and trace visibility; keep governance RLS intact.

4) **Minor ergonomics**
   - Tidy Sandbox/Startup/Deals copy and hints; keep Dashboard KPIs stable.

Everything else (connectors, portfolio/analytics, deeper economics, UX-only presentation richness, SRE v2/v3) is explicitly v2+.

---

## 1. Dated Entries

### 2025-12-18 - Slice 7 calibration loop closed (eval + sweep + proofs)
- Fixes: comp selection now excludes the subject property, townhouse/singlefamily are treated as one compatibility group with warning code `property_type_group_match_sfr_townhome`, and eval posture normalizes `underwrite` -> `base`.
- Proofs: `prove-eval-run-inrange.ps1` (Org=033ff93d..., Dataset=orlando_smoke_32828_sf_v2, Posture=base, Limit=50, Force=true) produced `input_hash=fa0ed738edbe9c0258b382bf86b453d5618bca19700f9cea01e6e12351f1f7b4`, `eval_run_id=c8aef542-09b9-4a0b-9a6c-4ff6bf3b3de9`, deduped on rerun, `ranges_present=11`, `in_range_rate_overall~0.3636`.
- Sweep: `v1-valuation-ensemble-sweep` on that eval run scored 11/11; best_by_mae/best_by_mape both at `avm_weight=0` (`mae~85091.95`, `mape~0.1422`); diagnostics all zero for missing cases.
- Scripts committed: RentCast ground-truth seeder (caller-JWT only), self-comp exclusion proof, failsoft townhouse/SFR proof, eval inspector. Functions re-deployed: `v1-valuation-run`, `v1-valuation-eval-run`, `v1-valuation-ensemble-sweep` to zjkihnihhqmnhpxkecpy. Gates re-run: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w clean:next`, `pnpm -w build`.

### 2025-12-16 16:20 ET - Slice 4 proof hardened (time + sqft ledger) and redeployed
- `_shared/valuationAdjustments.ts` now always emits `time` and `sqft` ledger lines (applied or skipped) with explicit skip reasons/notes; sqft entry reflects basis selection (ppsf_subject vs time_adjusted_price). Feature adjustments remain policy-driven and can skip when unit_value is 0.
- Proof script `scripts/valuation/prove-adjustments-ledger.ps1` hardened: verifies policy patch by id (no policy_versions), asserts `suggested_arv_basis=adjusted_v1_2`, `adjustments_version=selection_v1_2`, selected comps present, and time+sqft ledger lines exist (fails otherwise). Policies are backed up/restored; uses `policy@hps.test.local` (role=vp) to satisfy RLS update on `policies`.
- Proof run (Org=033ff93d..., Deal=f84bab8d..., Posture=base) after deploy: `output_hash=3251ffabbe47ba88dcf5410212d5b1c2703e5e3a3cfe07ae3dc783038ad42b39`, `run_hash=7acab0501fd827cc8285c6345709f4c0dac7629a8fe96d0b67f9ff3ee0ba164d`; first comp ledger shows time (skipped: missing_time_adjustment) and sqft (applied) even with zero unit_values.
- Deploy/DB push executed against zjkihnihhqmnhpxkecpy: `supabase db push` (linked) and `supabase functions deploy v1-valuation-run --project-ref zjkihnihhqmnhpxkecpy`. `scripts/valuation/coverage-smoke.ps1 -DealId f84bab8d-e377-4512-a4c8-0821c23a82ea` PASS post-deploy; backups at `supabase/backups/prove-adjustments-ledger-*.json`.

### 2025-12-16 15:00 ET - Slice 4: adjustments ledger v1.2 (policy-gated, default OFF)
- New migration `20260107120000_valuation_adjustments_v1_2_tokens.sql` seeds valuation.adjustments tokens (enabled=false, version=selection_v1_2, rounding.cents=2, missing_field_behavior=skip, enabled_types [time,sqft,beds,baths,lot,year_built], caps, unit_values all 0) only on active policies; legacy backups relocated to `supabase/migrations_bak/_bak` to keep push clean.
- Added deterministic adjustments module `_shared/valuationAdjustments.ts` (roundMoney, weightedMedianDeterministic, buildCompAdjustedValue with caps/skip reasons). `v1-valuation-run` now policy-gates an adjustments ledger and adjusted ARV (weighted median of adjusted_value) when enabled; hashes unchanged when disabled.
- Contracts updated for optional adjustments fields; CompsPanel shows time-adjusted/adjusted values + expandable ledger per selected comp (date fallback close/listed/listed_at); admin valuation-qa page surfaces adjustments enabled/basis/version and per-comp ledger for recent runs.
- Proof script `scripts/valuation/prove-adjustments-ledger.ps1` executed (Org=033ff93d..., Posture=base) via owner@hps.test.local; output_hash/run_hash matched (5ad2fb27... / 495c438d...), policies backed up to `supabase/backups/prove-adjustments-ledger-<timestamp>.json` and restored.
- Supabase deploys: `supabase db push --include-all` applied migration chain; `supabase functions deploy v1-valuation-run` completed. Coverage smoke `scripts/valuation/coverage-smoke.ps1 -DealId f84bab8d-e377-4512-a4c8-0821c23a82ea` PASS.
- Gates rerun locally: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.

### 2025-12-30 - Closed-sale comps raw coverage + smoke verifier
- Policy guardrail: active policies/policy_versions backfilled with closed-sales valuation tokens when missing; valuation snapshots now always persist subject_property, closed_sales (primary + stepout + attempted flag), AVM request/response, and market request/response even when providers error out.
- Smoke check: `scripts/valuation/coverage-smoke.ps1 -DealId f84bab8d-e377-4512-a4c8-0821c23a82ea -SupabaseAccessToken $env:SUPABASE_ACCESS_TOKEN` forces a valuation run, prints comp counts + raw flags, and exits non-zero if `raw.closed_sales` is absent.
- Deploy (PowerShell):
  ```powershell
  supabase db push --project-ref zjkihnihhqmnhpxkecpy
  supabase functions deploy v1-connectors-proxy v1-valuation-run --project-ref zjkihnihhqmnhpxkecpy
  ```

### 2025-12-16 04:37 ET - Slice 2/3/QA hardening: market time adjustment + ATTOM enrichment + eval harness
- Slices touched: Slice 2 (Valuation Spine v1.1 selection/market-time), Slice 3 (public records ATTOM enrichment), QA harness (eval/proof).
- New artifacts:
  - Edge/runtime: deterministic market time adjustment (FHFA/FRED HPI fallback, eligibility gating, adjusted price/factor surfaced) in `_shared/marketIndex.ts` + selection passthrough, ATTOM basicprofile normalizer in `_shared/publicRecordsSubject.ts`, valuation confidence helper in `_shared/valuationConfidence.ts`.
  - Functions deployed: `v1-valuation-run`, `v1-connectors-proxy` (supabase functions deploy ... zjkihnihhqmnhpxkecpy).
  - Migrations: `20251214182758_market_price_index.sql` (state HPI cache), `20251215140000_public_records_subject_enrichment.sql`, `20260107101500_valuation_ground_truth_eval_runs.sql` (ground-truth/eval harness), plus ATTOM/public-records evidence paths. Nonconforming backup remains: `20251215120000_valuation_ground_truth_eval_runs.sql.bak-20260107` (skip on db push).
  - Contracts/tests: marketIndex helpers + tests, determinism hash, valuation confidence/determinism/public-records subject tests, ATTOM fixture; valuation selection exposes adjusted comps; docs `valuation-eval-harness.md`.
  - Scripts: `prove-market-time-adjustment.ps1`, `coverage-smoke.ps1`, `prove-attom-enrichment.ps1`, policy set scripts, eval harness dataset (`scripts/valuation/datasets/orlando-dealids.json`), admin QA page `/admin/valuation-qa`.
  - UI: comps panel collapse controls; address autocomplete support components.
- Checks run locally (verified in session): `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`; proofs: `prove-market-time-adjustment.ps1` PASS (fallback 2025Q4 -> 2025Q3, comps_adjusted_count=48, selected comp factor present) and `coverage-smoke.ps1` PASS (shows adjusted comps/factors). Deploy executed as above.
- Follow-ups/TODOs: clean up nonconforming migration filenames before db push; ensure QA Supabase seeds for ground-truth eval harness; monitor ATTOM enrichment traces in production; consider nulling preserved price_adjusted when factor missing (design choice noted).

### 2025-12-13 - Valuation Spine Closeout: Offer-as-output + Underwrite valuation-only + Comps summary/rerun

1) Product decision (canonical truth)
- Offer is an engine output surfaced on Dashboard as "Offer (Computed)"; Underwrite does not collect Offer Price.
- Market & Valuation is valuation-first; contract/executed price is read-only and only relevant after a deal is under contract.

2) UI/UX shipped (verified)
- Dashboard Overview: Offer (Computed) tile formats dollars when present, shows em dash when missing; fallback order is outputs.primary_offer -> outputs.instant_cash_offer -> calc.instantCashOffer; tooltip clarifies it is computed from the latest underwriting run.
- Underwrite Market & Valuation: ARV/As-Is are read-only with override modal that requires reason >= 10 chars; exactly one "Use Suggested ARV" surface that shows Applied when arv_source === "valuation_run" and arv_valuation_run_id matches the current valuation run; no offer/contract price inputs or "offer required" banners.
- Comps panel: summary band with count + min-comps gating language, provider/as-of badges, stub badge, status counts, date range, median distance, price variance (cv), concessions placeholder; "Re-run comps" button calls the existing refresh handler with a 30s cooldown and does not fire on mount.

3) Safety and correctness
- Override save merges only the market subtree into deal payload/in-memory state so other edits remain intact.
- No provider calls on mount; valuation/comp refresh is user-triggered (Refresh Valuation / Re-run comps).

4) Tests and tooling
- Tests: apps/hps-dealengine/components/overview/TopDealKpis.test.tsx, apps/hps-dealengine/components/underwrite/UnderwriteTab.test.tsx, apps/hps-dealengine/components/underwrite/CompsPanel.test.tsx.
- Vitest config includes both apps/**/*.test.ts and apps/**/*.test.tsx patterns.

5) Open questions / next work
- Canonical offer output key across postures (code currently prefers primary_offer then instant_cash_offer).
- Where Under Contract status + executed contract price is captured and surfaced.
- Provider concessions data: whether it will be supplied and the canonical field/type when present.
- Valuation refresh policy: current behavior is explicit user-triggered; address-change-triggered valuation runs remain to be formalized without violating "no mount calls".

### 2025-12-13 - Slice 6 - Comps summary + re-run control
- Comps section now shows a summary band (count, date range, median distance, price variance cv) with provenance badges and concessions placeholder; min-comps gating unchanged.
- Added “Re-run comps” button wired to the existing Refresh Valuation handler with a simple cooldown; no provider calls on mount.
- Tests cover comps summary rendering and rerun cooldown; commands run: `pnpm -w lint`, `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.

### 2025-12-13 - Slice 5 - Market & Valuation UI rebuild (Facts/Market/Comps/Confidence)
- Market & Valuation rebuilt into four lanes with Offer Price (Draft) canonical at `market.contract_price` (warning-only when missing) + read-only Contract Price (Executed) display; Valuation Basis selector stays with RentCast AVM/manual options. ARV/As-Is are read-only with explicit "Override ARV/As-Is Value" modals (reason required) calling RLS edge `v1-valuation-override-market`. No provider calls on mount; Market lane is read-only from the latest valuation snapshot with provenance and "Not connected (v1)" flood placeholder.
- Comps panel stays truthful to RentCast sale listings (list price/listed date), keeps stub/provider/as_of badges, and min-comps gating. Confidence/warnings remain sourced from valuation_run output/provenance.
- Tests added for required contract banner, override reason gating, and “Applied” suggested ARV state; commands run: `pnpm -w lint`, `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.

### 2025-12-13 - Slice 2.2.1 — UI semantics bugfix + release hygiene
- Comps panel now labels price/date based on evidence kind (listings show “List Price” / “Listed”, future closed_sales will show “Close Price” / “Closed”); header remains “Comparable sale listings (RentCast)” with listing-based gating copy.
- “Use Suggested ARV” reduced to a single button in Market & Valuation with an “Applied” state when already persisted via valuation_run provenance.
- Added root lint runner (`pnpm -w lint`) and a drift doctor script (`scripts/doctor-valuation-spine.ps1`, `pnpm doctor:valuation`) to detect missing valuation tables/functions without exposing secrets.
- Commands: `pnpm -w lint`, `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.

### 2025-12-12 - Slice 2.2 — Valuation Spine Correctness Patch
- Policy lookup now org + posture scoped in `v1-connectors-proxy` and `v1-valuation-run` via a shared helper; missing/multiple active policies return explicit errors instead of posture-only fallbacks.
- RentCast mapping hardened: comps marked `comp_kind=sale_listing` with status/correlation/daysOld/listingType preserved; market snapshot includes `/markets` stats when ZIP is present; correlation missing now caps confidence at C with a `missing_correlation_signal` warning; TTL remains policy-driven.
- UI/contracts: comps relabeled “Comparable sale listings (RentCast)” with status counts; valuation warnings surfaced; contracts add `comp_kind` + `warnings`; min comps stays policy token (no hardcoded defaults).
- New Edge `v1-valuation-apply-arv` + Underwrite buttons persist suggested ARV with provenance (`arv_source=valuation_run`, `arv_valuation_run_id`, `arv_as_of`) via RLS-safe deal update; CompsPanel/Underwrite copy aligned to listing semantics.
- Secrets/doc hygiene: `supabase/functions/.env` ignored with `.env.example` added; valuation spec/roadmap updated; roadmap v2 tracks closed-sales comps ingestion; checks: `pnpm -w lint` (script missing), `pnpm -w typecheck` ✅, `pnpm -w test` ✅, `pnpm -w build` ✅ (after clearing `.next` lock).

### 2025-12-12 - Slice 2.1 — Valuation Spine Hardening (Provider fidelity, policy-driven thresholds)
- RentCast adapter aligned to official fields (AVM price/range, comparables distance/daysOld/correlation/status/listingType/pricePerSqFt) with raw payload preserved; market stats pulled from RentCast /markets when ZIP present.
- Snapshot TTL is policy-driven (`valuation.snapshot_ttl_hours`); property_snapshots now expire/refresh per policy with force_refresh override; provenance includes endpoints and stub flag.
- Valuation runs now enforce policy tokens (min_closed_comps_required, confidence_rubric) with no hard-coded defaults; confidence rubric derives grade from comp count, correlation, AVM range width; status fails with explicit reasons when tokens/evidence missing.
- Contracts/UI hardened: typed valuation schemas, Underwrite shows Valuation Confidence, ARV range, comp stats, provenance badge, and policy-driven gating; Comps panel renders correlation/daysOld/status/listingType without fallback mins.
- Deferred to roadmap: richer provider mix and MOI/sale-to-list from Redfin; address normalization upgrade; flood/climate connector.

### 2025-12-12 - Slice 2 — Valuation Spine v1 (Address → Snapshot → Valuation Run → UI)
- Added org-scoped `property_snapshots` cache and append-only `valuation_runs` tables (RLS, audit, dedupe via hashes); policy default `valuation.min_closed_comps_required` seeded to 3.
- Implemented `v1-connectors-proxy` (RentCast + deterministic stub fallback) and `v1-valuation-run` (policy-driven min comps, append-only runs, valuation confidence surfaced) with JWT-only Supabase clients.
- UI: Underwrite Market & Valuation hydrates suggested ARV + comps panel, preserves user ARV, and adds a Refresh Valuation action; new Comps display with provenance/badging; address creation triggers valuation run post-deal creation.
- Contracts: Added valuation schemas (PropertySnapshot, MarketSnapshot, Comp, ValuationRun) in `packages/contracts`.
- Next slice targets: multi-provider connectors + richer confidence rubric; UI polish for valuation provenance badges; MOI ingestion (Redfin) deferred to v2.

### 2025-12-12 - Slice 1 — Valuation Spine: Truth Map + Target Model
- Added `docs/app/valuation-spine-v1-spec.md` covering current-state map, target valuation_run/contracts, org-scoped property_snapshot cache expectations, and plan tweaks (min closed comps configurable default 3, “Valuation Confidence” wording, address edits create new valuation_run).
- Inventory captured: Market & Valuation block at `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx` (DealSession state → autosave to `deal_working_states`), Underwrite orchestration at `app/(app)/underwrite/page.tsx`, deal intake flow (`StartupPage`, `/deals` pages, `lib/deals.ts` write to `public.deals` + payload), no Comps UI today (only sandbox knobs/offer checklist references).
- Slice 2 preview: add valuation_run + property_snapshots tables/migrations, org-scoped caching, address-edit append-only runs, provider stub for comps/market stats, UI hydration from persisted valuation runs.

### 2025-12-13 - AI chat UX + routing + underwrite evidence + settings nav + theming (Slices A-F)

- **AI Agent Chat:** Composer always mounted with guidance in placeholders; no auto-summary bubbles for Analyst/Strategist; Negotiator keeps Playbook as the first seeded response with send gated until available; chat windows open taller with prompt chips visible; Tone + "Your Chats" live in a hamburger menu; sessions auto-title from the first user message (trimmed/truncated with playbook fallback).
- **Startup & Routing:** "Run New Deal" now routes to `/underwrite?dealId=...`; selecting an existing deal routes to `/overview?dealId=...` while preserving session/deal context.
- **Underwrite Evidence & Actions:** Evidence Checklist is a compact orange (i) popover; satisfied evidence rows show a green checkmark; header buttons order Analyze → Save Run → Request Override.
- **Settings Navigation:** Desktop settings views now keep the main app nav inline with the HPS header; mobile bottom nav unchanged.
- **Theme Parity:** Burgundy and Green themes use the same dark glass shell depth as Blue while keeping their own accent borders/rings.

### 2025-Q4 - Dual-Agent AI, Theming, and Dashboard Brain

- Implemented 5-theme design system (Navy/Burgundy/Green/Black/White) with CSS variables and ThemeProvider; Navy stays source-of-truth and other themes follow the electric-navy glass aesthetic.
- Simplified dashboard headline KPIs: removed ARV / Buyer Ceiling / Respect Floor / AIV stat cards from the top grid; wholesale fee pair remains primary. Documented dashboard KPIs and inputs (kpi-inventory, input-surfaces, kpi-input-matrix) and added coverage check (`check:dashboard-coverage`).
- Built trust-tiered docs (product/domain/engine/app/dashboard/glossary/ai/ops) with frontmatter and `ai.index-for-ai` as the sitemap; audited AI surfaces and standardized on the tri-agent model (Deal Analyst, Deal Strategist, Deal Negotiator) via persona-aware `v1-ai-bridge` (OpenAI-only) with structured outputs, tone hooks, and stale-run awareness; client helpers now match `packages/contracts/src/aiBridge.ts` payloads and Strategist 400s are gone.
- Added global draggable, modeless AI windows (react-rnd) with FAB launchers; per-persona sessions (title/pin/tone/history) now persist chat via Supabase (30-day TTL, RLS) while layout/pinned state remains localStorage; Analyst run-freshness gating (no-run + stale consent) remains.
- Kept tests/typecheck/build green; no changes to engine math or contracts.

### 2025-12-13 - AI tri-agent chat history, Negotiator pipeline, and UX polish

- Context: moved AI history off localStorage into Supabase with RLS and finished the tri-agent pipeline (Analyst, Strategist, Negotiator) on the shared bridge.
- Chat history: Supabase-backed history keyed by org/user/persona/session with automatic 30-day TTL; `apps/hps-dealengine/lib/ai/chatHistory.ts` handles CRUD/purge; `docs/ai/chat-history.md` documents table shape, RLS posture, and TTL. Analyst/Strategist/Negotiator hydrate/persist the same server thread; layout/pin state stays localStorage.
- Edge/contracts: `packages/contracts/src/aiBridge.ts` now enforces persona-aware payloads (persona/dealId/runId/posture/tone + prompts); client helpers send typed payloads so Strategist 400s are resolved; `pnpm -w typecheck`, `pnpm -w build`, `pnpm -w test` green.
- Provider consolidation: removed Gemini Strategist route/shims/types; all personas route through the OpenAI-backed `v1-ai-bridge`; `docs/deploy-ai-bridge.md` and `docs/ai/surfaces-audit.md` updated accordingly.
- Negotiator: Edge contracts add `dealNegotiator`; `v1-ai-bridge` routes Negotiator through a negotiation pipeline (logic tree + matrix) with tone-aware prompts; `supabase/functions/v1-ai-bridge/negotiation/*` + `data/negotiation_logic_tree.json` drive deterministic selection; negotiation matrix docs package lives at `docs/ai/negotiation-matrix/`; matrix matcher test covers deterministic selection.
- UI/UX: Shared `DealNegotiatorPanel` (inline and window) with tone selector (Objective/Empathetic/Assertive); DualAgentLauncher is effectively tri-agent with Negotiator FAB gated until playbook generation; chat panes are scrollable with anchored inputs, unified `AgentSessionHeader` chrome, colorized FABs, and AGENTS toggle glow; Analyst stale-run warnings use brand dark orange (“Analyze deal to chat”); Negotiator gating copy reads “Generate playbook to chat.” Chat history persists server-side; layout persistence stays localStorage.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (pass).

### 2025-12-13 - Dashboard/Repairs/Deals UX hardening + null-backed numeric foundation

- Context: production polish for Repairs/Dashboard/Deals plus numeric input groundwork.
- Repairs: removed the dev-only “Active Repair Profile (dev)” block from `RepairsTab`; production Quick Estimate/Big 5 UI unchanged; Big 5 test expectations updated to match current labels (math unchanged).
- Dashboard/Trace: header + summary now sit above the address; guardrails helper tagline removed; knob summary renamed “Quick Glance”; UX & Presentation settings block removed from Dashboard and Trace.
- UI primitives: switches gain visible borders/contrast; native date/select controls themed for dark usage with glassy calendar indicator and inverted dropdown colors.
- Deals table: new shared `DealsTable` used by `/startup` and `/deals` from a single Supabase fetch; optional print button (`window.print()`) with print CSS that hides controls, removes scroll height limits, sets white page background, and preserves dark table contrast.
- Inputs: shared numeric inputs and default deal state now use null-backed semantics (empty == placeholder, not 0) so zeros only commit when typed; foundation in `components/ui.tsx` + `dealSessionContext.tsx` for broader rollout.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` green after test alignment.

### 2025-12-13 - Dashboard contact modal, nav dedupe, and AI window stacking

- Context: Dashboard contact UX plus nav/window stability.
- Client profile: Dashboard “CLIENT” pill now opens `ClientProfileModal` showing deal contact info with `—` for missing fields and a gated “Send Offer” button (logs TODO when workflow_state is ready); `ButtonProps` widened for modal actions without breaking existing buttons.
- Nav: MobileBottomNav duplication fixed via stable keys/single render when `dealId` is missing; nav renders once per view.
- AI windows: normalized z-index/stacking so Analyst/Strategist/Negotiator windows stay above nav/content on desktop and mobile; minimize/open order is deterministic.
- Commands: `pnpm -w typecheck`, `pnpm -w test` (pass); build not rerun in this slice.

### 2025-12-13 - V1 field-ready (Dashboard, Sandbox, traces, QA harness)

- Business Sandbox v1: 196 knobs with KEEP/DROP/DROP_BACKLOG classification; coverage tool + JSON snapshot checked in; only three KEEP knobs are UX-only (`abcConfidenceGradeRubric`, `allowAdvisorOverrideWorkflowState`, `buyerCostsLineItemModelingMethod`), all others wired runtime through sandbox -> policy -> engine -> traces -> UI. Sandbox hides DROP backlog knobs and surfaces UX-only in the UX band and KnobFamilySummary.
- Engine/policy: Shared `buildUnderwritingPolicyFromOptions` used by `v1-analyze`; workflow/guardrail knobs (borderline, cash gate, placeholders, rubric) drive math and traces. Evidence placeholders degrade confidence and workflow, recorded in traces with placeholder kinds.
- Dashboard/nav: `/overview` labeled Dashboard with TopDealKpis, Strategy/Guardrails, Timeline & Carry, Risk & Evidence cards. Nav split Dashboard | Repairs  Underwrite  Deals  Trace  Sandbox  Settings; deal-required routes append `?dealId` and fall back to `/startup` when unset. Startup hub offers create + "View all deals"; /deals selection routes to Dashboard.
- Evidence/risk/workflow UI: Overview shows workflow reason line, per-kind freshness with blocking markers, placeholders allowed/used notes, risk pills with disabled/failing states, confidence badge. Trace shows placeholder policy, gate enablement, confidence rubric text, borderline/cash gate thresholds, workflow reasons.
- QA/E2E: `docs/QA_ENV_V1.md` added; Playwright specs (golden path, timeline/carry, risk/evidence) updated to the new IA and surfaces and skip cleanly when QA env vars are absent.
- Commands: `pnpm -w typecheck`, `pnpm -w build` (Sentry/require-in-the-middle warning only), `pnpm -w test` all green.

### 2025-12-13 - QA E2E alignment (login, deep-links, Supabase gating)

- Login/UI: `/login` renders LoginForm (placeholders `email` / `password`, button "Sign in"); Playwright specs updated to use the same selectors with `.first()` safety.
- Login styling: refactored LoginForm + LoginClient to a glassy gradient card via `app/login/login.module.css`, animated background layers, and icon-decorated inputs/button; Supabase auth behavior unchanged (same auto-signup/redirect/validation as before).
- DealSession/nav: Deep-link hydration from `?dealId=` exercised via E2E specs; guarded routes defer redirect while hydration is in flight and nav tabs preserve `dealId`.
- QA env fixtures: Specs now expect env-driven QA deal IDs (READY, STALE_EVIDENCE, HARD_GATE, TIMELINE) plus QA user creds/API URL; IDs are passed via env, not hard-coded.
- Playwright/E2E status (at time): golden path green locally with QA envs; timeline/carry and risk/evidence gated on env and app availability; underwrite/analyze API spec gated on QA API URL + anon key.
- Commands this session: `pnpm -w typecheck` (pass), `pnpm -w test` (pass); `pnpm -w build` not run in that block.

### 2025-12-13 - Slice QA-OptionA - Deal deep-link hydration & nav persistence

- DealSession now hydrates `dbDeal` from `?dealId=` on guarded routes using the caller JWT (RLS-safe); URL takes precedence over localStorage, and hydration is tracked to avoid premature redirects.
- DealGuard defers redirect while URL-based hydration is in flight; guarded routes bounce to `/startup` when no active deal and no valid deep-link.
- App nav (desktop tabs + mobile nav) now preserves `?dealId=<active>` on guarded routes, keeping deal context when switching Overview/Underwrite/Repairs/Trace.
- Commands: `pnpm -w typecheck` (pass), `pnpm -w test` (pass), `pnpm -w build` (failed on Windows EPERM opening `.next/trace`; Next build otherwise compiled with existing require-in-the-middle warnings).

### 2025-12-10 - Slice W1-1 - Buyer Ceiling & AIV Cap Clamp (Epic 1, Task 1)

- Engine: implemented canonical buyer ceiling helper (ARV x (1 - margin) - repairs - buyer costs - carry) with infoNeeded when margin/ARV missing; added AIV safety cap helper and MAO clamp (mao_final = min of presentation, cap, buyer ceiling) with new trace steps BUYER_CEILING, AIV_SAFETY_CAP, MAO_CLAMP. Added optional diagnostics (mao_cap_wholesale, buyer_ceiling_unclamped).
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

- Engine: implemented ARV-band min-spread ladder (<=200k: 15k; 200-400k: 20k; 400-650k: 25k; >650k: max(30k, 4% ARV)), cash spread, cash gate (>=$10k pass) and borderline flag (+/-$5k around ladder or confidence C). Added trace steps `SPREAD_LADDER`, `CASH_GATE`, `BORDERLINE` and outputs `spread_cash`, `min_spread_required`, `cash_gate_status`, `cash_deficit`, `borderline_flag`.
- Contracts/edge: AnalyzeOutputs extended with optional spread/cash/borderline fields; v1-analyze typings updated to pass them through.
- Tests: strategy spec expanded for ladder bands, cash gate shortfall/pass, borderline triggers, and trace presence; all vitest suites remain green.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (green after clearing stale .next/trace lock).
- TODO(policy): replace hardcoded ladder, cash gate $10k, and +/-$5k borderline band with sandbox/SoTruth knobs per the manual.

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

### 2025-12-10 - Slice A - /overview Deal Health & Guardrails

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
- Launch checklist documented (`docs/LAUNCH_CHECKLIST_V1.md`); roadmap marked v1 done and v1.2 backlog carved out.
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
  - v1-repair-rates now enforces org-aware profileId selection: uses the requested profile only if it belongs to the callers org/market/posture; otherwise logs cross-org attempts and falls back to the correct active/default profile.
  - RepairsSandbox scopes all profile list/create/update/activate calls to the active deals org, with guards when no deal/org is selected.
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
  - UI "fat trim" branch is now on main: (app) shell + Startup/Overview/Repairs/Underwrite/Trace/Settings/Sandbox routed through a shared DealSessionProvider with AppTopNav + MobileBottomNav.
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
  - Add explicit "View all deals" entry point in nav or startup when no deals exist (empty state and CTA).
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
  - This file is now explicitly the **"what changed / what's next"** stream for humans and agents.
  - Primer + Roadmap are the stable reference; Devlog is allowed to be "live" and updated frequently.

**Status after this day:**

- Architecture, roadmap, and operating manual are now captured in repo-local docs.
- Next concrete move is to start executing Sprint 0 with the current codebase.

---

### 2025-11-24 to 2025-11-25 - Repairs Stack and SPA Shell Stabilization

**Repairs**

- Confirmed `repair_rate_sets` migration is live and wired:

  - ORL defaults seeded at the DB level.
  - RLS and audit behavior attached via triggers and policies.

- Verified `v1-repair-rates`:

  - Returns a normalized `RepairRates` object for the callers org/market.
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

### 2025-11-22 - Route Consolidation and Visual Shell

- Focused on getting a cohesive SPA-style dashboard:

  - Unified navy theme across main app routes.
  - Ensured that `/overview`, `/underwrite`, `/repairs`, `/trace`, `/settings`, `/sandbox` all share the same shell.
  - Hooked up **top nav** and **bottom nav** components for consistent navigation on desktop and mobile.

- Confirmed that:
  - Core pages load without runtime errors in dev.
  - Navigation between major tabs is stable.
  - Dark/navy styling is applied across the main app surfaces.

**Status after this day:**

- Visual experience is no longer "fragmented pages"; its one cohesive app.
- This provided the foundation needed for the current roadmaps Phase 1 ("SPA shell & shared deal session").

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

  - `### YYYY-MM-DD - Short Title`
  - Bullets for:
    - What changed.
    - Why it matters.
    - Any follow-ups or regressions.

- When a sprint item from the roadmap moves from planned -> in progress -> done:
  - Reflect it in:
    - A dated entry here.
    - Optionally, update the checklist in `docs/roadmap-v1-v2-v3.md` or the "Remaining Sprints" section.

This file is the story of how HPS DealEngine actually got from v1 -> v2 -> v3, one vertical slice at a time.

### 2025-11-26 - Sprint C  Policy Overrides Table + RLS

- Context: Sprint 2 / Sprint C - create `policy_overrides` table with `policy_version_id` and base RLS.
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

- Context: Sprint A - Anchor Auth + Deal Session (Auth bridging, canonical deals, engine-as-SOT).
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
  - Sprint B - Evidence flows (deploy `v1-evidence-*`, EvidenceUpload wiring in Underwrite/Trace).

### 2025-11-27 - Sprint B  Evidence Flows

- Context: Sprint B - Evidence Flows (info-needed to real evidence uploads).
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

### 2025-12-02 - Repairs org alignment & sandbox reset ((pending))

- v1 stays field-ready per earlier entries; this pass focused on Repairs alignment and the sandbox reset.
- Repairs DB migrations: applied the normalization/reset chain (`20251206120000`, `20251206121500`, `20251206220000`, `20251206230000`, `20251206231000`, `20251207`, `20251208104500`) to move ORL/base profiles into the canonical deals org (`ed6ae332-2d15-44be-a8fb-36005522ad60`), clear legacy org rows, and enforce a single active+default ORL/base profile per org/market/posture (seeded canonical profile).
- v1-repair-rates now enforces a strict `RepairRatesRequest` contract `{ dealId: uuid; marketCode: string; posture: string; profileId: uuid | null }`, resolves org_id deal-first (membership RPC fallback), and returns structured 404/400/500 errors with no silent defaults.
- v1-repair-profiles resolves org_id via `dealId` when present (membership fallback otherwise), filters list/create/update/activate by org_id + marketCode + posture, and clears competing active/default rows when toggling flags.
- Client/UI alignment: `repairRates.ts`, `repairProfiles.ts`, DealSession, RepairsSandbox, `/repairs`, and `RepairsTab` now pass `dealId` through, use DealSession.repairRates as the single source of truth, and surface active profile metadata in UI.
- Still broken: RepairsSandbox list (`v1-repair-profiles?dealId=<dealId>&marketCode=ORL&posture=base&includeInactive=true`) returns `count: 0` with edge error `{"error":"Missing or invalid orgId in request body."}`; `/repairs` sees v1-repair-rates 400/404 for ORL/base and falls back to zero/investor defaults.
- Diagnosis: residual org resolution bug in v1-repair-profiles (still validating/expecting a request-body orgId on some paths) rather than React wiring; data is seeded but not visible under the callers deal org.
- Surgical reset plan: treat `ed6ae332-2d15-44be-a8fb-36005522ad60` as the canonical deals org; ship one reset/seed migration that deletes all ORL/base profiles for that org + the legacy org, inserts one active+default ORL/base profile, and enforces one active+default per org/market/posture; fix v1-repair-profiles list/create/update/activate so it never requires client orgId when `dealId` is present and always filters by the deal-resolved org.
- Expected after fix: `/sandbox -> Repairs` lists the seeded ORL/base profile; `/repairs` calls to v1-repair-rates return 200 for ORL/base and stop showing the "falling back to defaults" banner.
- Files/migrations touched (high level): the repair_rate_sets normalization/reset migrations above; `supabase/functions/v1-repair-rates`; `supabase/functions/v1-repair-profiles`; `apps/hps-dealengine/lib/repairRates.ts`; `apps/hps-dealengine/lib/repairProfiles.ts`; `apps/hps-dealengine/lib/dealSessionContext.tsx`; `apps/hps-dealengine/components/sandbox/RepairsSandbox.tsx`; `apps/hps-dealengine/app/(app)/repairs/page.tsx`; `apps/hps-dealengine/components/repairs/RepairsTab.tsx`.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (re-run this session; all green).
- Next Up: (1) Fix v1-repair-profiles to stop requiring orgId when dealId is present and always resolve/filter by the deal org; (2) run the reset/seed migration enforcing one active+default ORL/base profile for the canonical org; (3) redeploy `v1-repair-profiles` + `v1-repair-rates` and re-test `/sandbox` + `/repairs`.

#### UX & Flow Hardening - Deferred to v1.1 ((pending))

- Numeric input UX:
  - Shared numeric input + default deal shape now null-backed (empty == placeholder, not 0); rollout to all forms/engine contracts still pending.
  - Use `placeholder="0"` for numeric fields and auto-select on focus so typing replaces the visible 0.

- Governed UX for Debt & Liens / Timeline & Legal / Policy & Fees:
  - Analysts: governed knobs remain read-only with "Request Override" flow.
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

### 2025-12-10 - Slice W1-PW2-IMPLEMENT-1 - Policy-driven spread ladder, cash gate, borderline

- Engine: `UnderwritingPolicy` now carries `min_spread_by_arv_band`, `cash_gate_min`, and `borderline_band_width`; `buildUnderwritingPolicy` maps sandbox ladders (`minSpreadByArvBand`), cash gate (`cashPresentationGateMinimumSpreadOverPayoff`), and borderline band (`analystReviewTriggerBorderlineBandThreshold`) with canonical fallbacks only when absent.
- Spread ladder / cash / borderline logic: `computeMinSpreadRequired`, `computeCashGate`, and borderline checks now read policy values (no hardcoded 15k/20k/25k/30k, 10k, or 5k). SPREAD_LADDER, CASH_GATE, and BORDERLINE traces emit the policy band, gate, and band width used.
- Tests: strategy spec extended with a policy-driven ladder/gate case; existing expectations updated implicitly via policy fallbacks.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (all green).
- TODO(policy/data): Hold-cost per track/speed and AIV cap override gating still to be wired in PW2-IMPLEMENT-2; gap/tight bands remain TODO(policy).

### 2025-12-10 - Slice W1-PW2-IMPLEMENT-2 - Policy-driven hold costs & AIV cap override

- Engine: `UnderwritingPolicy` extended with track/speed hold-cost bands and default monthly bills; Buyer Ceiling now uses policy-driven hold costs (with HOLD_COST_POLICY trace) when explicit bills are missing. AIV safety cap now supports default vs override pct with override gating (bindable insurance, clear title, fast ZIP, approval role/log) and emits detailed AIV_SAFETY_CAP trace (cap pct used, override allowed/block reasons).
- Builder: `buildUnderwritingPolicy` now maps hold cost knobs (`holdCostsFlip*`, `holdCostsWholetail*`, `holdCostsWholesaleMonthlyPctOfArvDefault`, `holdingCostsMonthlyDefault*`) and AIV override knobs (approval role + conditions + logging) into policy fields; percent knobs normalized to decimals.
- Tests: strategy spec adds hold-cost sensitivity and AIV override allow/deny scenarios; all existing tests updated and green.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` (all green).
- TODO(data/policy): override pct knob still TODO(policy) if a dedicated value is added; role/approval evidence is minimal-override stays conservative when evidence is missing.

### 2025-12-10 - Slice E2-W2-IMPLEMENT - Timeline & Carry / Speed Bands / DTM -> Urgency

- Engine: Legacy DOM-only carry/speed logic replaced with policy-driven helpers (`computeSpeedBandPolicy`, `computeCarryMonthsFromPolicy`, `computeCarryTotals`, `computeDaysToMoneyPolicy`). Added SPEED_BAND_POLICY, CARRY_MONTHS_POLICY, HOLD_COST_POLICY (carry reuse), and DTM_URGENCY_POLICY traces.
- Contracts: `AnalyzeOutputs.timeline_summary` now includes dom/moi, raw & capped carry months, hold_monthly_dollars, carry_total_dollars, per-path DTM + source + buffer, while keeping prior fields for back-compat.
- UI: Timeline presenters/components read the richer `timeline_summary` (no calc fallbacks) for speed band, days-to-money, urgency, carry months, hold monthly, and carry total.
- Tests/commands: Typecheck/test/build all green after wiring; existing engine/app tests updated. (No new e2e added; TODO(e2e) to cover Timeline & Carry panels.)
- TODO(policy/data): Urgency thresholds and auction DTM remain TODO(policy/data) pending explicit knobs and deterministic "today" reference; clear-to-close buffers and role/evidence signals should be expanded when data is available.

### 2025-12-11 - Dev auth reset script + Underwrite header/Recent Runs (v1.1 hardening)

- Context: v1.1 hardening for dev auth hygiene + underwrite ergonomics.
- Done:
  - `scripts/reset-dev-auth-users.ts`: dev guard enforces Supabase ref `zjkihnihhqmnhpxkecpy`; backs up auth.users/memberships/organizations to `supabase/backups/dev-auth-users-<timestamp>.json`; deletes memberships/auth users; upserts dev org `033ff93d-ff97-4af9-b3a1-a114d3c04da6` / "HPS DealEngine Dev Org"; reseeds 6 accounts (owner@hps.test.local -> owner, manager@hps.test.local -> manager, policy@hps.test.local -> vp, qa-policy@hps.test.local -> analyst, underwriter@hps.test.local -> analyst, viewer@hps.test.local -> analyst) with dev-only password `HpsDev!2025` (service role env required).
  - Audit logs: `audit_logs.actor_user_id` NOT NULL dropped manually in dev console (no migration in repo). SQL to codify later: `alter table public.audit_logs alter column actor_user_id drop not null;`.
  - Underwrite UX: themed dark posture select; header actions renamed to "Analyze Deal" / "Save"; header Request Override button removed (OverridesPanel + field-level overrides remain); Recent Runs card on `/underwrite` queries org+deal runs newest-first limit 5 with "View all" link; file-level nav comment added.
- Code touched: `scripts/reset-dev-auth-users.ts`, `apps/hps-dealengine/app/(app)/underwrite/page.tsx`.
- DB: manual audit_logs nullability change not yet in a migration.
- Commands: `pnpm -w lint` (fail - script missing), `pnpm -w typecheck` (pass), `pnpm -w test` (pass), `pnpm -w build` (fail - Windows EPERM opening `.next/trace`), `pnpm -w test:agents:analyst` (pass).
- Notes/TODO: promote the audit_logs nullability change into a migration; fix Windows Next build EPERM; dev role tiers stay owner/manager/vp/analyst for seeded accounts.

### 2025-12-11 - Slice E2-W3 - DTM/Urgency policy wiring + Timeline & Carry trace

- Engine: UnderwritingPolicy extended with DTM policy fields (max DTM, selection method, default cash/wholesale days, roll-forward, buffers, urgency bands). `computeDaysToMoneyPolicy` now selects DTM via policy, applies clear-to-close/board buffers, maps urgency via policy bands, and emits enriched DTM_URGENCY_POLICY trace with candidates/selection. Speed/carry helpers reused; timeline_summary populated with per-path DTM/source/buffer plus carry + hold dollars.
- Contracts: `AnalyzeOutputs.timeline_summary` remains additive; engine now populates new fields (dom/moi, raw/capped carry, hold monthly/total, per-path DTM, source, buffer, urgency) consistently.
- UI: /overview timeline presenter consumes hold/carry from timeline_summary; /trace gains a "Timeline & Carry" summary card based on outputs/timeline_summary.
- Tests/commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` all green. No Playwright/e2e added yet (TODO(e2e): cover Timeline & Carry on /overview and /trace).
- TODO(policy/data): Auction DTM still needs deterministic "today" input; urgency thresholds should move to explicit knobs when available; buffer triggers depend on richer title/insurance/board evidence.

### 2025-12-11 - Slice E2-W4 - Timeline & Carry e2e coverage (scaffold)

- Added Playwright test scaffold (`tests/e2e/timeline-and-carry.spec.ts`) and root script `pnpm -w test:e2e`. The spec is currently skipped pending a deterministic seeded deal/auth harness but documents the intended assertions for Timeline & Carry on /overview and /trace (speed band, days_to_money, urgency, carry months, hold monthly, carry total).
- No engine/UI behavior changes; existing `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` remain green.
- TODO(e2e): wire a seeded deal + auth fixture to enable the spec and assert engine-driven timeline_summary values end-to-end.

### 2025-12-12 - Agent Platform vNext groundwork: agent_runs + @hps/agents + HPS MCP + /api/agents (Negotiator playbook still unstable)

- Context: v1 tri-agent UX stays live; this slice lays vNext infra (logging, shared agents SDK, MCP) without changing engine math.
- DB: Migration `supabase/migrations/20251209120000_agent_runs.sql` adds `agent_runs` with org/user/persona/agent_name/workflow_version/deal_id/run_id/thread_id/trace_id/model/status/input/output/error/latency_ms/total_tokens + RLS (memberships + `auth.uid()`) + audit trigger.
- Next.js routes: `/api/agents/analyst`, `/api/agents/strategist`, `/api/agents/negotiator` (runtime=node) accept `Authorization: Bearer <Supabase access_token>`, resolve org via memberships, forbid cross-org deals, and log success/error rows to `agent_runs` with workflow_version ids. No `service_role` in user flows.
- Client wiring: `apps/hps-dealengine/lib/aiBridge.ts` now hits `/api/agents/*` (no feature flag); DualAgentLauncher + persona panels keep Supabase chat history and stale-run gating.
- Packages: `packages/agents` exports runAnalyst/Strategist/Negotiator + RLS Supabase client; Strategist KB resolver `resolveKbRegistryPath` walks upward to `docs/ai/doc-registry.json` with ENOENT-tolerant fallback + tests (`packages/agents/tests/strategist-kb.test.ts`, `tests/analyst-evals/runAnalystEval.test.ts`); dataset search tolerates missing registry.
- Negotiator: dataset loader checks `data/negotiation-matrix/negotiation-matrix.data.json` then `docs/ai/negotiation-matrix/negotiation-matrix.example.json`; OpenAI Responses API w/ retry and rate-limit detection -> route surfaces `rate_limited` (429) and UI copy shows provider rate limit message.
- MCP: `packages/hps-mcp` ships stdio + Streamable HTTP server; dev harness `packages/hps-mcp/dev/mcpClient.cjs`; root script `dev:hps-mcp:http` starts HTTP endpoint (auth via `HPS_MCP_HTTP_TOKEN`). Tools include `hps_get_deal_by_id`, `hps_get_latest_run_for_deal`, `hps_list_evidence_for_run`, `hps_get_negotiation_strategy`, `hps_get_kpi_snapshot`, `hps_get_risk_gate_stats`, `hps_get_sandbox_settings`, `hps_kb_search_strategist`. No tunnel script in package.json (resolves prior prompt conflict).
- Agent Builder: workflows remain external/out-of-band; workflow_version ids are logged in `agent_runs` rows.
- Commands: `pnpm -w test` (pass), `pnpm -w test:agents:analyst` (pass).

### 2025-12-12 - Slice E3-W2 - Engine confidence/workflow/risk/evidence wiring

- Engine: `UnderwritingPolicy` extended with confidence, workflow, gates, and evidence_freshness policies. Added helpers `computeEvidenceSummary`, `computeRiskGates`, `computeConfidenceGrade`, `computeWorkflowState`, and new traces (`EVIDENCE_FRESHNESS_POLICY`, `RISK_GATES_POLICY`, `CONFIDENCE_POLICY`, `WORKFLOW_STATE_POLICY`). Borderline now relies on policy band + confidence grade C flag.
- Outputs: `AnalyzeOutputs`/engine outputs now populate `confidence_grade/reasons`, `risk_summary` (overall + per_gate), `evidence_summary` (freshness_by_kind with status/age/blocking), and `workflow_state/reasons`; wired through the edge unchanged.
- Tests: Updated strategy/risk timeline specs for policy-driven outputs; all workspace tests remain green.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build`.
- TODO(policy/data): Many policy fields still pass-through only when provided; evidence timestamps and gate flags need richer inputs; workflow overrides and gate-specific evidence mapping to be expanded when data/knobs are available.

### 2025-12-12 - Slice E3-W3 - Risk & Evidence UI + e2e scaffold

- UI: /overview Risk & Compliance card now reads policy-driven per-gate statuses; Evidence card surfaces freshness rows (missing/stale/blocking) with confidence reasons. /trace page adds a Risk, Confidence & Evidence summary card sourced purely from run outputs (workflow, confidence, per-gate risk, evidence freshness).
- Playwright: Added scaffold spec `tests/e2e/risk-and-evidence.spec.ts` (skipped until deterministic fixtures/auth are available) outlining expected assertions for risk/evidence/workflow across /overview and /trace.
- Commands: `pnpm -w typecheck`, `pnpm -w test`, `pnpm -w build` all green. `pnpm -w test:e2e` exists; risk/evidence spec remains skipped pending fixtures.
- TODO(e2e-fixtures): seed deterministic deals + auth harness to enable risk/evidence e2e and unskip the spec.

### 2025-12-13 - Slice E3-W3 - Risk/Evidence UI polish + trace waterfall

- /overview risk/evidence cards now use engine outputs only: confidence/workflow badges with reasons, risk gates + evidence freshness badges with blocking indicators, and stable `data-testid` hooks for e2e.
- /trace adds a full Risk, Confidence & Evidence section plus dedicated trace cards for CONFIDENCE_POLICY, EVIDENCE_FRESHNESS_POLICY, RISK_GATES_POLICY, and WORKFLOW_STATE_POLICY, all rendered directly from run outputs/traces (no recompute).
- Playwright `tests/e2e/risk-and-evidence.spec.ts` updated with ReadyForOffer vs stale/missing evidence scenarios using the new selectors; still skipped pending deterministic seeded deals/auth harness.
- TODO(e2e-fixtures): create seeded deals with known risk/evidence states to unskip specs; consider adding gate/evidence reason strings once policy tokens are finalized.

### 2025-12-13 - Slice V - Placeholder gate TODO sweep

- Workflow/evidence knob `assumptionsProtocolPlaceholdersWhenEvidenceMissing` now controls blocking vs downgrade: evidence freshness respects the flag, CONFIDENCE_POLICY adds placeholder reasons (grade downgraded to B when used), and WORKFLOW_STATE_POLICY traces include whether placeholders were allowed/used.
- Added unit coverage in `packages/engine/src/__tests__/compute_underwriting.risk_timeline.spec.ts` to assert NeedsInfo when placeholders are disallowed vs Ready/Review with downgraded confidence when allowed.
- Traces (EVIDENCE_FRESHNESS_POLICY, CONFIDENCE_POLICY, WORKFLOW_STATE_POLICY) now emit allow/used/placeholder kinds + rubric context for auditability.
- Backlog pushed to v2+: (1) policy-driven hold_cost_per_month per speed/track + deterministic repairs totals instead of placeholder constants; (2) explicit AIV override pct knob plus policy tokens for gap bands/DTM urgency thresholds and deterministic "today"; (3) doc-stamp/closing cost tables + UX-only knobs (bankers rounding, dual-scenario buyer costs, line-item vs aggregate) consumed in offer/strategy presenters.

### 2025-12-13 - Slice E4-W1 - QA env doc + E2E harness alignment

- Docs: Added `docs/QA_ENV_V1.md` describing QA Supabase setup, required env vars, and seeded deal expectations for running the gated Playwright specs.
- E2E: Updated `golden-path`, `timeline-and-carry`, and `risk-and-evidence` specs to follow the v1 IA (Startup hub -> Deals -> Dashboard) and the refreshed evidence/risk/workflow surfaces. Specs remain env-gated and skip cleanly when QA vars are absent.
- Commands: `pnpm -w typecheck`, `pnpm -w build`, `pnpm -w test` all green. Playwright specs still opt-in via QA env.

### 2026-01-08 - Slice 5 (Comp overrides: concessions + condition)

- DB: Added `valuation_comp_overrides` (org/deal/comp-keyed, RLS + audit + updated_at trigger, unique on org/deal/comp_id/comp_kind, seller_credit_pct/usd, condition_adjustment_usd, required notes) and seeded active policies with concessions/condition tokens + ceiling defaults (defaults OFF; precedence usd_over_pct). Ceiling token seed migration applied via `supabase db push --project-ref zjkihnihhqmnhpxkecpy`.
- Engine/Edge: `v1-valuation-run` now loads overrides, computes `overrides_hash`, applies concessions pre-selection (policy-gated) and condition as a ledger line (policy-gated), includes overrides_hash/applied_count in outputs when enabled, and prevents time/sqft double-counting. Deployed with `supabase functions deploy v1-valuation-run --project-ref zjkihnihhqmnhpxkecpy`.
- Ledger/proof: valuationAdjustments adds informational concessions + applied condition line items. Proof `scripts/valuation/prove-comp-overrides.ps1` shows overrides change hashes and remain deterministic on repeat; baseline input_hash `568dd228dbb26a6541c2536b8e7f679b47e89b676511822086c103d43730114c`, override input_hash `a1ca1df01bbcbfea81d1f51eabc3820a59fb50b03d0ccc76349fe2dbb765cd5e`, Run2/Run3 output_hash equal True, run_hash equal True, policies restored and override row deleted. Coverage smoke: PASS (valuation_run.id `6a929802-f7fd-4bf3-a423-55883c4334bd`).
- UI (5C): Admin Valuation QA page now surfaces Comp Overrides CRUD (caller JWT/RLS) for selected comps; Underwrite CompsPanel shows an Override badge when ledger contains manual_override concessions/condition. Docs updated to record proof/deploy evidence; Slice 5 marked ✅ after gates+proof+smoke.

### 2025-12-16 21:30 ET - Slice 6 ensemble/uncertainty UI surfaces (read-only)

- UI: Underwrite valuation summary now shows an Ensemble badge when basis=`ensemble_v1`, weights (comps/avm), ceiling value/applied flag, and uncertainty range (low/high + pct) when present. Admin Valuation QA adds an “Ensemble & Uncertainty” panel for the selected run (basis, version, weights, comp/avm estimates, cap, uncertainty range/method); displays OFF badge when unset. No policy toggles in UI; caller JWT only.
- Engine proof reused from Slice 6A: `scripts/valuation/prove-ensemble-uncertainty.ps1` PASS (Org=033ff93d..., Deal=f84bab8d..., Posture=base). Baseline input_hash `f36a52eb7cbd821f9a3e954d0c54308895b556e48385c904d2cd62c594b5edf9` → ensemble/uncertainty input_hash `47bca9f7aa0725705b00bcea3aac9106ed2e8dfd7eeb88606897014fd9ea1c06`; Run2/Run3 output_hash equal True; run_hash equal True; policies restored. Coverage smoke PASS. Edge already deployed (`supabase functions deploy v1-valuation-run --project-ref zjkihnihhqmnhpxkecpy`).
- Build note: `pnpm -w build` still blocked on Windows `.next/trace` access-denied; typecheck/test are green.

### 2025-12-06 - Glossary-driven tooltips v1 + guardrails

- **Context:** UX polish slice for v1 — make all non-obvious policy/engine terms explainable in‑app without bloating the UI, and lock the rules so future agents don’t re‑invent tooltip patterns.
- **Glossary inventory (Stage 1):**
  - Created `docs/glossary/glossary_candidates.json` (~40 terms) and `docs/glossary/glossary_v1_shortlist.json` (32 v1 keys with `reason` fields) as machine‑readable inventories for valuation/floors, spread/profit, DTM/carry, risk/compliance, evidence/workflow, repairs, and sandbox knobs.
  - Excluded obvious labels (taxes, insurance, closing costs, provider names) and kept the focus on policy/engine concepts and gates (Respect Floor, Buyer Ceiling, AIV safety cap, spread ladder, DTM, EMD, uninsurable, FHA 90‑day, FEMA 50%, FIRPTA, PACE, SIRS/Milestone, etc.).
- **Single-source glossary module (Stage 2):**
  - Added `apps/hps-dealengine/lib/glossary.ts` with:
    - `ALL_GLOSSARY_KEYS` + `GlossaryKey` union.
    - `GlossaryEntry` interface and `GLOSSARY` map (v1 terms fully populated).
    - `getGlossaryEntry(key: GlossaryKey)` helper as the single runtime accessor.
  - Definitions are short, plain-language (“what it is + why it matters”) and aligned with the SoTruth / secondary underwriting manuals; no formulas or task‑critical instructions.
  - Authoring rules baked into the file comment: no inline tooltip strings, stable snake_case keys, and glossary.ts as the only source of truth for in‑app definitions.
- **Tooltip wiring (Stage 3):**
  - Introduced a small tooltip primitive and `InfoTooltip` component under `apps/hps-dealengine/components/ui/`, with a `helpKey?: GlossaryKey` prop on shared components (e.g., StatCard, InputField, SelectField, key headers).
  - Applied v1 tooltips to high‑value, non-obvious terms only:
    - `/overview`: ARV, AIV, Respect Floor, Buyer Ceiling, DTM, Carry Months, risk gate rows.
    - `/underwrite`: AIV Safety Cap, Carry Months snapshot, ARV/AIV inputs.
    - `/repairs`: QuickEstimate header, Big 5 “Budget Killers”.
    - `/trace`: Confidence policy trace, Evidence section.
    - `/sandbox`: Business Logic Sandbox posture selector (Conservative/Base/Aggressive).
  - Kept scope tight: no tours or onboarding flows — just contextual definitions.
- **Visual + layering polish:**
  - Refined tooltips into a horizontal “card” pattern: compact, landscape aspect ratio, rounded corners consistent with cards, light brand-blue background with navy outline, small text and padding.
  - Implemented a portal-based tooltip (`createPortal` to `document.body`) to escape parent stacking contexts and `overflow: hidden` containers; tooltips now reliably render above neighboring cards (e.g., “Respect Floor” over “Current Offer”).
  - Thinned the outline to ~⅓ of the original width and tuned the glow/shadow so the card is readable without feeling bulky; added a dark, semi-transparent inner backdrop + blur for text legibility on complex backgrounds.
- **Guardrails & checks:**
  - Added `apps/hps-dealengine/lib/glossary.test.ts` to enforce:
    - Every `GlossaryKey` has a `GLOSSARY` entry.
    - Every `description` is non-empty and tooltip-length (min/max characters).
  - Added `scripts/check-glossary-alignment.ts` and `package.json` script `"check:glossary"` to keep `glossary_v1_shortlist.json` in sync with `GlossaryKey`/`GLOSSARY`.
  - All checks green after this slice:
    - `pnpm -w typecheck`
    - `pnpm -w test` (includes glossary invariants)
    - `pnpm run check:glossary`
- **Result:** Glossary + tooltips v1 is now **locked** — single source of truth, tests + alignment script, and a consistent, portal-based tooltip UX across Overview/Underwrite/Repairs/Trace/Sandbox. Future tooltip work must go through `GlossaryKey` + `GLOSSARY` and respect these guardrails.
