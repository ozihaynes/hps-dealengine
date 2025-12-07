---
doc_id: "ai.ceo-assumptions-by-doc"
category: "ai"
audience: ["ai-assistant", "exec", "product", "engineer"]
trust_tier: 1
summary: "Captures CEO-level assumptions baked into docs, clarifying when to treat guidance as authoritative vs subject to override."
---

# CEO Assumptions by Doc — HPS DealEngine

> CEO assumption = judgment call made when the repo was silent/ambiguous, aligned to DealEngine’s deterministic, policy-driven vision.

| doc_id | what_to_assume | when_to_override | notes_from_oz |
| --- | --- | --- | --- |
| product.vision-and-positioning | v1 scope = SFR/townhome (condo w/ caveats); engine is single source of truth; AI is strategist only; vertical slices mandatory. | If newer product/roadmap doc changes scope or delivery model. | Use to align tone and strategic recommendations. |
| product.personas-and-use-cases | Primary personas = acquisitions, underwriter/VA, team lead/owner, dispo/TC, capital/JV; metrics = spread, fee, DTM, risk consistency. | If personas/metrics are superseded in devlog/roadmap. | Map flows and copy to these personas unless replaced. |
| product.end-to-end-deal-lifecycle | Canonical statuses (New → ReadyForOffer → UnderContract → DispoActive → ClosedWon/ClosedLost); `/dashboard` is lifecycle anchor; runs.workflow_state drives readiness. | If lifecycle/status taxonomy changes in product/engine docs. | Treat listed failure modes as defaults until updated. |
| domain.wholesale-underwriting-handbook | Respect Floor is hard floor; spread ladder bands and MAO tie-breaks follow policy even if code differs; assignment fee relationships as documented. | If policy tokens or engine contracts publish newer thresholds. | Treat as Tier 0 policy unless devlog marks change. |
| domain.risk-gates-and-compliance | Gates (Flood 50%, FHA 90-day, PACE/UCC, condo SIRS, FIRPTA/SCRA) default to conservative Fail/Watch without evidence. | If updated policy or engine trace semantics override a gate. | Placeholder—fill details soon; default to strict compliance. |
| domain.timeline-and-carry-policy | Urgency bands (Emergency ≤~14d, Critical 15–30d, etc.) and carry examples apply even if not codified; unresolved gates add buffers. | If engine outputs/trace show updated bands or formulas. | Use Market Temp as driver for carry/urgency when absent in code. |
| domain.repairs-and-contingency-model | QuickEstimate ok for triage/light; heavy/structural/flood/condo/high ARV requires bids/photos; contingency layers for risk/unknowns. | If repair profiles/policies add explicit gating or caps. | Big 5 additive; do not strip contingency to fit price. |
| domain.market-temp-methodology | DOM/MOI → Hot/Warm/Neutral/Cool bands; fallback to Neutral when data sparse; slower markets demand wider spreads. | If sandbox/engine outputs add inputs or new thresholds. | Use Market Temp to influence carry and exit bias unless superseded. |
| engine.architecture-overview | Engine is deterministic; DB is system of record; RLS everywhere; AI bridge advisory-only. | Only if architecture doc/engine code changes responsibilities. | Assume service_role never used in user flows. |
| engine.analyze-contracts | MAO ≥ Respect Floor and ≤ Buyer Ceiling/AIV cap; hashes and policy snapshots required; field defaults follow contract text. | If updated contracts redefine fields or relationships. | Treat unspecified defaults conservatively (no invented values). |
| engine.trace-anatomy | Frame codes listed are stable contracts; severity/grouping follow documented patterns; KPIs map to frames even if wiring partial. | If trace schema versioning changes or new frames replace old ones. | Ignore unknown frames gracefully; prefer documented ones. |
| engine.knobs-and-sandbox-mapping | Posture/knobs act as global risk dials affecting spreads/timeline/repairs even if mapping incomplete. | When a filled-in mapping doc or engine change specifies exact effects. | Placeholder—use knobs-audit for current inventory. |
| app.routes-overview | `/dashboard` is primary (legacy /overview); routes guard against missing deal/run; deep links assume DealSession. | If routing/guard logic changes in app docs or code. | Placeholder until route matrix is filled; follow lifecycle doc meanwhile. |
| dashboard.kpi-inventory | KPIs (Respect Floor, Buyer Ceiling, Spread) expected; color/state bands follow documented thresholds even if UI differs. | If KPI definitions shift in code/tests. | Treat as canonical before shipping UI changes. |
| dashboard.kpi-stories | Green/yellow/red narratives/actions valid even when numbers illustrative; actions tied to wholesaling practice. | If product revises KPI messaging or thresholds. | Use for AI explanations and UX copy until updated. |
| app.overview-layout-map | `/dashboard` layout regions/cards as documented; responsive behavior inferred from current grid patterns. | If layout changes in code or design system updates. | Treat Dashboard as primary view unless noted otherwise. |
| app.underwrite-flow | ReadyForOffer checklist (Confidence ≥ B, gates Pass/mitigated, evidence present, timeline within policy) applies even if engine doesn’t hard-block. | If engine/UI add stricter gating or alter workflow_state rules. | Re-run after material changes; don’t rely on stale runs. |
| app.repairs-flow | Repair profiles must be valid; do not guess when rates missing; “done” criteria for triage/deep/IC follow doc guidance. | If repairs API/UI enforce new behaviors or rate selection rules. | Align Repairs with Underwrite and Dashboard impacts. |
| glossary.terms | Illustrative examples (DOM/MOI bands, AIV clamps, confidence rules) apply unless engine/policy overrides. | If glossary is regenerated from code/contracts. | Confidence Grade cannot be A with Fail gates; Watch-heavy runs cap at B by default. |
| glossary.concepts-by-page | Label → glossary key mapping stands even if UI labels diverge; risk/condo/flood items assumed visible where relevant. | If UI/helpKey mappings change. | Keep tooltips and AI wording consistent. |
| examples.deal-scenarios | Example numbers are plausible but not engine outputs; Emergency auction ≈ ≤14d; decisions follow policy judgment. | If scenario library refreshed with real runs. | Use for storytelling, not as math authority. |
| playbooks.negotiation-playbook-templates | Offers anchored at Respect Floor and hard ceilings; concessions over price for tight spreads; risk/walk-away scripts mandatory on Fail gates. | If policy/UX changes negotiation posture. | Do not invent numbers; fill with current KPIs. |
| playbooks.user-faq | Default causes/fixes (evidence stale, urgency impacts) apply by policy stance even without exact thresholds. | If FAQ refreshed with new thresholds or flows. | ReadyForOffer blockers are spread/timeline/gates/evidence together. |
| ai.assistant-behavior-guide | Logging of AI interactions expected; conservative stance on Watch/Fail; AI never invents numbers. | If AI governance doc revises scope or tone. | Treat Dashboard as main surface unless stated otherwise. |
| ai.prompting-patterns | Standard answer structures and default to latest run; Emergency = short runway cash-first. | If new patterns or surfaces replace these templates. | Keep responses structured and source-cited. |
| ai.data-sources-and-trust-tiers | Prioritize Tier 0/1 (math/policy, engine/app) over Tier 2/3; no external data without citation/uncertainty. | If trust tier definitions change. | Cite sources and mark estimates explicitly. |
| ops.error-conditions | Analyze/runs-save failures are high priority; pause underwriting rather than manual math; outage playbooks apply. | If ops runbooks change or new error classes added. | Capture dealId/runId/org/route/timestamp for escalation. |
| ops.data-integrity-and-validation | Assume PK/FK/unique/audit and RLS on org tables; engine clamps negatives/blanks; missing sqft for PSF yields warnings. | If migrations or validation rules change. | Admin/ops only for data fixes; always audit and re-run. |
| ai.index-for-ai | Priority: policies/contracts/trace > domain > UX/KPI > examples/playbooks. | If index categories or ordering change. | Use doc_ids from frontmatter to cross-reference. |
