---
doc_id: "engine.trace-anatomy"
category: "engine"
audience: ["ai-assistant", "engineer", "underwriter"]
trust_tier: 1
summary: "Defines trace frame structure and semantics so UI/AI can explain underwriting decisions without re-deriving math."
---

# Trace Anatomy — HPS DealEngine

## Purpose
- Define the trace schema and frame semantics for explainability across UI and AI; trace is a contract, not an implementation detail.
- Enable frontend and AI to answer “why” using authoritative frames instead of re-deriving math.
- Align with `docs/engine/architecture-overview.md`, `docs/engine/analyze-contracts.md`, and domain docs in `docs/domain/*`.

## Trace Structure
- Envelope: `trace` accompanies `AnalyzeOutput`; same run payload saved via `v1-runs-save`.
- Frame shape (conceptual, align to engine types):
  - `id` (string/uuid), `code` (SCREAMING_SNAKE frame code), `label`, `category` (e.g., valuation, repairs, guardrails, risk, timeline, strategy), `severity` (info/warn/error), `message`.
  - `data` payload: inputs used, computed values, thresholds/knobs, results (pass/watch/fail), and relevant excerpts of policy/sandbox.
  - Optional: `inputRefs` / `outputRefs` (link to fields), `policySnapshot` snippets when helpful.
  - Ordering: frames are emitted in logical sequence; children may nest under parent (e.g., guardrails with sub-frames for floor/ceiling, spread, cash gate).
- Grouping by stage (logical, UI uses categories to group/filter):
  - Valuation
  - Repairs
  - Floors & Ceilings / Guardrails
  - Spread Ladder / Cash Gate / Borderline
  - Risk Gates
  - Timeline & Carry
  - Strategy / Workflow / Confidence
  - Evidence Freshness / Info Needed

## Core Frame Types & Intent
- **SPREAD_LADDER**: Min-spread band selection (inputs: ARV, ladder thresholds; outputs: band, required spread). Severity warn if spread shortfall.
- **CASH_GATE**: Cash presentation gate (inputs: MAO vs payoff; outputs: pass/deficit). Warn if deficit; error if blocked.
- **BORDERLINE** (or equivalent tight-spread flag): Uses band width/confidence; warn when near thresholds.
- **RESPECT_FLOOR**: Floor composition (investor floor vs payoff floor; result: respect_floor). Error if MAO below floor.
- **BUYER_CEILING / MAO_CLAMP**: Ceiling and clamp steps (inputs: margin, repairs, buyer costs, AIV cap; outputs: buyer_ceiling, mao_clamped). Warn if clamped; error if impossible.
- **TIMELINE_SUMMARY / DTM_URGENCY / CARRY_MONTHS_POLICY**: Days-to-money, urgency band, carry months and dollars; warn for auction proximity/long DTM/missing CTC evidence.
- **RISK_GATES**: Per-gate statuses (title, insurance, flood/50% rule, condo/SIRS, FHA/VA, PACE/UCC/solar, FIRPTA, SCRA, bankruptcy). Severity = fail blocks ReadyForOffer; warn for watch.
- **EVIDENCE_FRESHNESS**: Evidence presence/age by kind (payoff, title, insurance, repairs, comps). Warn when stale/missing; info when current.
- **MARKET_TEMP** (if emitted): DOM/MOI band used; info severity unless missing → warn.
- **STRATEGY_RECOMMENDATION**: Recommended exit track; reasoning from guardrails/risk/timeline; info unless blocked alternatives.
- **WORKFLOW_DECISION**: Workflow state (ReadyForOffer/NeedsReview/NeedsInfo) and reasons; error if blocked gates; warn if pending evidence.
- **REPAIRS**: Quick/Big5/line-item totals and contingencies applied; warn if missing bids or structural/unknowns increase contingency.
- **VALUATION**: ARV/AIV selection, caps, comp quality; warn if thin comps/age over policy.

Severity pattern:
- Info: normal passage with context.
- Warn: near-threshold, missing/stale evidence, shortfall but not hard stop.
- Error: hard stops (floor violation, blocked gate, impossible cash gate, missing critical evidence).

## Using Trace in the App
- `/trace`: Displays ordered frames grouped by category; supports expand/collapse and filtering by category/code/severity. Frames are tied to the selected run (dealId+runId).
- `/overview` & `/underwrite`: Cards/banners draw from trace frames and outputs:
  - Guardrails (Respect Floor, Buyer Ceiling, MAO clamp, Spread Ladder, Cash Gate, Borderline).
  - Risk & Evidence (RISK_GATES, EVIDENCE_FRESHNESS).
  - Timeline & Carry (TIMELINE_SUMMARY / DTM_URGENCY / CARRY_MONTHS_POLICY).
  - Strategy/Workflow (STRATEGY_RECOMMENDATION, WORKFLOW_DECISION).
- Rule: UI must not recompute business logic; display outputs and refer to trace messages/details for “why.”

## Using Trace for AI
- AI must prefer trace facts over recomputing math. Cite frame codes in plain language (e.g., “See SPREAD_LADDER for required spread band”).
- Common pivots:
  - “Explain this deal” → SPREAD_LADDER, CASH_GATE, RESPECT_FLOOR/MAO_CLAMP, RISK_GATES, EVIDENCE_FRESHNESS, TIMELINE_SUMMARY, STRATEGY_RECOMMENDATION, WORKFLOW_DECISION.
  - “What changed between runs?” → compare frame payloads/severity across runs.
- AI should highlight missing evidence from EVIDENCE_FRESHNESS/infoNeeded rather than inventing numbers.
- AI must not ignore Error frames; Warn frames should be presented with required next actions.

## Stability & Change Management
- Frame codes are contracts (SCREAMING_SNAKE_CASE). Changing meaning requires docs/tests/UI updates; avoid breaking semantics for existing runs.
- Adding frames: define clear semantics, emit from engine, add tests, update `/trace` UI and docs if user-facing.
- Deprecating: do not silently remove; keep old runs interpretable; document replacements; UI/AI should safely ignore unknown frames.
- Backwards compatibility: old runs’ trace blobs must render without 500s; clients should ignore unknown fields but use known ones.

## Cross-References
- Architecture & contracts: `docs/engine/architecture-overview.md`, `docs/engine/analyze-contracts.md`
- Domain: `../domain/wholesale-underwriting-handbook.md`, `../domain/risk-gates-and-compliance.md`, `../domain/timeline-and-carry-policy.md`, `../domain/repairs-and-contingency-model.md`, `../domain/market-temp-methodology.md`
- Product: `../product/vision-and-positioning.md`, `../product/end-to-end-deal-lifecycle.md`
- Planned: `docs/ai/assistant-behavior-guide.md`, `docs/dashboard/kpi-inventory.md`, `docs/ai/data-sources-and-trust-tiers.md`
