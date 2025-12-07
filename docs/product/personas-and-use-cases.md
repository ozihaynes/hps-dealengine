---
doc_id: "product.personas-and-use-cases"
category: "product"
audience: ["ai-assistant", "product", "underwriter", "exec"]
trust_tier: 2
summary: "Defines primary personas, jobs-to-be-done, workflows, and expectations that guide DealEngine product and AI behavior."
---

# Personas & Use Cases — HPS DealEngine

## Why This Exists
This document defines the people who use DealEngine and how they work so product, UX, engine, and AI remain aligned. It is a companion to `docs/product/vision-and-positioning.md` and should be read before changing flows, defaults, or sandbox presets.

## How It Will Be Used
- Ground product decisions, UI flows, and copy by persona.
- Drive engine defaults and sandbox presets (guardrails, risk gates, posture).
- Inform AI behaviors (what to explain, what to flag, what to avoid inventing).
- Anchor acceptance for new slices: if it does not serve these personas and workflows, reconsider.

## Persona Catalog

### Solo wholesaler / small operator
Wears acquisitions and dispo hats, often alone or with one VA. Needs speed, clarity, and guardrails that prevent overpaying. Intermediate underwriting comfort; wants guided defaults and quick “go/no-go” with evidence freshness cues.

| Field | Details |
| --- | --- |
| Role in lifecycle | Lead intake, first-pass underwriting, negotiation, dispo handoff (often self), closing follow-up. |
| Experience level | Underwriting: Intermediate. Risk: Intermediate. |
| Primary goals | Decision-ready run in \<15 minutes; defensible MAO/ask tied to policy; clear next actions. |
| Pain points | Spreadsheet drift, stale comps, inconsistent fees/repairs, forgetting risk gates. |
| Key fears | Overpaying, missing title/insurance blockers, losing buyer trust with thin spreads. |
| Success metrics | Spread vs target, assignment fee, DTM, ReadyForOffer rate, win/loss. |
| Primary routes | `/startup`, `/deals`, `/underwrite`, `/repairs`, `/overview`, `/trace`. |
| AI expectations | Summarize guardrails, highlight missing evidence, prep seller talk tracks without inventing numbers. |

### Acquisitions rep / closer
Frontline on calls and appointments. Works fast, needs crisp MAO bands, risk/status cues, and negotiation-ready language. Intermediate underwriting; advanced negotiation.

| Field | Details |
| --- | --- |
| Role in lifecycle | Lead intake, first-pass and quick deep pass, seller negotiation, handoff to IC/dispo. |
| Experience level | Underwriting: Intermediate. Risk: Intermediate. |
| Primary goals | Get to defensible MAO + track/terms; know when to walk; surface concessions. |
| Pain points | Slow tooling, unclear spreads, missing payoff/insurance signals, decision thrash. |
| Key fears | Overpaying, thin spreads exposed post-offer, failing hard gates mid-escrow. |
| Success metrics | Time-to-decision, guardrail adherence %, conversion to contract, fallout rate. |
| Primary routes | `/underwrite`, `/repairs`, `/overview` (Dashboard), `/trace` for talking points. |
| AI expectations | Explain KPIs and gates in plain language; generate negotiation briefs tied to trace frames (e.g., CASH_GATE, RISK_GATES). |

### Team lead / owner
Sets policy, approves overrides, monitors consistency. Advanced underwriting; cares about governance and replayability.

| Field | Details |
| --- | --- |
| Role in lifecycle | Policy posture/sandbox tuning, IC review, override approval, post-mortems. |
| Experience level | Underwriting: Advanced. Risk: Advanced. |
| Primary goals | Policy compliance, margin consistency, fast IC decisions with evidence. |
| Pain points | Shadow math, uncontrolled overrides, lack of replayable trace. |
| Key fears | Governance gaps, off-policy offers, capital partner distrust. |
| Success metrics | Policy compliance %, override latency/volume, hash/replay stability, margin variance. |
| Primary routes | `/overview`, `/trace`, `/sandbox`, `/settings`, `/runs`, `/deals`. |
| AI expectations | Summaries of variance vs policy, highlight overrides and missing evidence, no number invention. |

### Underwriter / analyst / VA
Normalizes inputs, runs deterministic engine, documents evidence gaps. Intermediate-to-advanced underwriting; methodical and trace-driven.

| Field | Details |
| --- | --- |
| Role in lifecycle | Data intake/normalization, deep underwriting, evidence checks, IC prep. |
| Experience level | Underwriting: Intermediate/Advanced. Risk: Advanced. |
| Primary goals | Accurate inputs, complete evidence, reproducible runs with hashes. |
| Pain points | Manual data wrangling, unclear policy tokens, stale evidence uncertainty. |
| Key fears | Math drift across runs, missing hard gates, reruns that change silently. |
| Success metrics | % runs with complete evidence, hash stability, replay pass rate, IC rework. |
| Primary routes | `/underwrite`, `/repairs`, `/trace`, `/sandbox`, `/runs`. |
| AI expectations | Detect missing inputs, explain trace frames, suggest evidence to collect; never override outputs. |

### Disposition / transactions manager
Packages the deal for buyers, manages escrow, and clears conditions. Intermediate underwriting; advanced process and compliance awareness.

| Field | Details |
| --- | --- |
| Role in lifecycle | Dispo path selection, buyer packaging, escrow/title coordination, closing checklist. |
| Experience level | Underwriting: Intermediate. Risk: Intermediate/Advanced (title/insurance). |
| Primary goals | Clear buyer ask within guardrails; avoid surprises (title, insurance, HOA, payoff). |
| Pain points | Incomplete evidence, unclear spread vs payoff, seasoning/HOA blind spots. |
| Key fears | Fallout from uncovered liens/insurance issues, failed assignments, seasoning violations. |
| Success metrics | Fallout rate, carry/delay days, buyer satisfaction, clean closings. |
| Primary routes | `/overview`, `/trace`, `/underwrite` (for ask/terms), `/runs`. |
| AI expectations | Summarize risk/evidence for buyer packages; flag seasoning/assignment/HOA issues; never change numbers. |

### JV partner / capital partner (light access)
Consumes outputs to validate risk/reward. Underwriting familiarity varies; expects clarity and traceability.

| Field | Details |
| --- | --- |
| Role in lifecycle | Review decision-ready runs, confirm guardrails, approve/decline funding. |
| Experience level | Underwriting: Novice–Advanced (varies). Risk: Intermediate. |
| Primary goals | Fast read on spread, risk grade, evidence completeness; trust in policy adherence. |
| Pain points | Opaque assumptions, missing evidence, non-reproducible numbers. |
| Key fears | Capital loss from off-policy deals, undisclosed risk, unreliable math. |
| Success metrics | Time-to-yes/no, variance vs policy targets, post-close surprises. |
| Primary routes | `/overview`, `/trace` (read-only), exported run artifacts. |
| AI expectations | Plain-language summaries of trace and risk gates; highlight evidence gaps; no new math. |

## Core Workflows

### First-pass underwriting (triage)
Fast pass to decide whether to continue. Driven by acquisitions reps, solo operators, analysts.

**Workflow Blueprint**

| Field | Details |
| --- | --- |
| Start context | `/startup` → select/create deal → `/underwrite` (dealId set) or deep-link `/overview?dealId=…`. |
| Preconditions | Deal selected; minimal property facts (address, ARV/AIV estimates, sqft/beds/baths), market speed inputs (DOM/MOI) if available. |
| Primary routes | `/underwrite` for inputs; `/repairs` for quick estimate; `/overview` for guardrails; `/trace` if rerunning. |
| Key KPIs/frames | Respect Floor, Buyer Ceiling, MAO bundle, SPREAD_LADDER, CASH_GATE, TIMELINE_SUMMARY. |
| Navigation order | Underwrite → Repairs (QuickEstimate) → Run analyze → Overview guardrails. |
| Decision outputs | Proceed/Pass; provisional offer track/number; list of missing evidence (infoNeeded). |
| Where recorded | Run saved with hashes; workflow_state in outputs; notes/evidence placeholders. |
| Done definition | Run saved; guardrails visible; missing evidence noted; no UI-only math. |

### Deep underwriting pass
Full evidence-backed run. Driven by analysts and owners for IC readiness.

| Field | Details |
| --- | --- |
| Start context | From triage run → `/underwrite` with dealId + saved run; or `/trace` to inspect prior run. |
| Preconditions | Deal selected; baseline comps, payoff letter, insurance/title evidence targets; repairs refined. |
| Primary routes | `/underwrite`, `/repairs` (line items), `/overview` (Strategy/Risk/Evidence), `/trace` (trace frames), `/sandbox` (if policy tuning with governance). |
| Key KPIs/frames | EVIDENCE_FRESHNESS_POLICY, RISK_GATES_POLICY, CONFIDENCE_POLICY, WORKFLOW_STATE_POLICY, TIMELINE_SUMMARY, carry/DTM, guardrails. |
| Navigation order | Underwrite → Repairs → Analyze → Overview (Strategy, Risk, Evidence) → Trace. |
| Decision outputs | Offer track/price/terms; workflow_state (ReadyForOffer/NeedsReview/NeedsInfo); evidence gaps list. |
| Where recorded | Saved run with policy_snapshot, hashes, trace; evidence rows; overrides if any. |
| Done definition | Evidence completeness meets policy; workflow_state set; trace reviewed; run persisted. |

### Deal review / IC meeting
Owner/lead reviews runs for approval. Focused on guardrails, overrides, and evidence completeness.

| Field | Details |
| --- | --- |
| Start context | `/overview?dealId=…` with latest run; optional `/trace` open. |
| Preconditions | At least one saved run; evidence list populated; policy posture known. |
| Primary routes | `/overview` (Guardrails, Strategy, Risk/Evidence), `/trace`, `/runs`, `/sandbox` (reference posture, not editing during IC). |
| Key KPIs/frames | Workflow_state, confidence grade, risk gates, evidence freshness, MAO bundle, payoff/shortfall. |
| Navigation order | Overview (Guardrails → Strategy → Risk/Evidence → Timeline/Carry) → Trace details. |
| Decision outputs | Approve/decline offer; request more evidence; adjust posture if governed; set notes. |
| Where recorded | Runs (workflow_state, trace), notes/override records, audit logs for posture changes. |
| Done definition | Decision logged; overrides (if any) approved; no pending evidence blockers for ReadyForOffer. |

### Negotiation prep with seller
Prepares talk tracks and guardrails for calls/appointments. Driven by acquisitions reps and owners.

| Field | Details |
| --- | --- |
| Start context | Latest run on `/overview` + `/trace` for talking points. |
| Preconditions | Saved run with MAO/guardrails; known gaps flagged. |
| Primary routes | `/overview` (Guardrails, Strategy), `/trace` (cash gate, spread ladder), `/underwrite` for offer entry. |
| Key KPIs/frames | Respect Floor, Buyer Ceiling, MAO, SPREAD_LADDER, CASH_GATE, risk/evidence notes, timeline urgency. |
| Navigation order | Overview guardrails → Strategy → Trace excerpts for reasons. |
| Decision outputs | Negotiation plan: offer number, concessions, walk-away, evidence asks. |
| Where recorded | Notes in deal/run; offer entry in Underwrite; follow-up tasks external if needed. |
| Done definition | Talk track ready; offer anchored to policy/trace; gaps to close identified. |

### Risk/compliance review
Ensures hard gates and evidence freshness are satisfied. Driven by analysts, dispo/TC, owners.

| Field | Details |
| --- | --- |
| Start context | `/overview` Risk & Evidence cards; `/trace` policy frames. |
| Preconditions | Run exists; evidence attached or placeholders noted. |
| Primary routes | `/overview` (Risk & Evidence), `/trace` (EVIDENCE_FRESHNESS_POLICY, RISK_GATES_POLICY, WORKFLOW_STATE_POLICY). |
| Key KPIs/frames | Risk gates (insurability, title, FHA/VA timing, PACE/UCC/HOA), evidence freshness by kind, workflow_state. |
| Navigation order | Overview risk/evidence → Trace frames for reasons → Underwrite/Sandbox only if policy tuning (governed). |
| Decision outputs | Ready/Block/NeedsReview; required artifacts list; escalation if hard stop. |
| Where recorded | Run trace, workflow_state, evidence records, audit logs for overrides. |
| Done definition | All required evidence current; gates pass or approved override logged; workflow_state updated. |

### Disposition strategy selection (Cash / Wholesale / Wholetail / List)
Chooses disposition path and buyer ask. Driven by dispo managers and owners, informed by analysts.

| Field | Details |
| --- | --- |
| Start context | Latest run → `/overview` Strategy + Timeline/Carry; `/trace` for disposition logic. |
| Preconditions | MAO bundle computed; payoff/shortfall known; timeline/carry outputs present; disposition tracks enabled by policy. |
| Primary routes | `/overview` (Strategy, Timeline & Carry, Guardrails), `/trace` (strategy-related frames), `/underwrite` (offer entry). |
| Key KPIs/frames | MAO bundle, Buyer Ceiling, Respect Floor, payoff/shortfall, timeline urgency, carry, disposition track enablement. |
| Navigation order | Overview Strategy → Timeline/Carry → Guardrails → Trace if needed. |
| Decision outputs | Track selection (cash/wholesale/wholetail/list), ask price, terms, double-close need. |
| Where recorded | Run outputs (primary_offer/track), notes, double-close model if used. |
| Done definition | Track chosen; ask/terms documented; alignment with policy enablement and gates. |

## User Stories & Acceptance Examples

### Solo wholesaler / small operator
- As a solo operator, when a warm lead arrives, I want a first-pass run in ≤15 minutes so I can decide to pursue or recycle the lead.  
  Acceptance criteria: run saved with hashes; workflow_state set; guardrails visible; missing evidence list produced; uses `/underwrite` + `/repairs` + `/overview`.
- As a solo operator, when evidence is thin, I want the system to flag blockers and placeholders so I avoid overpaying.  
  Acceptance criteria: evidence_summary shows missing/stale items; RISK_GATES_POLICY visible in `/trace`; workflow_state not ReadyForOffer until blockers cleared or overridden.

### Acquisitions rep / closer
- As an acquisitions rep, when I book a seller call, I want policy-backed MAO and negotiation bullets so I can anchor credibly.  
  Acceptance criteria: Respect Floor/Buyer Ceiling/MAO shown on `/overview`; trace provides SPREAD_LADDER and CASH_GATE reasons; talk track avoids any numbers not in outputs.
- As an acquisitions rep, when payoff/title/insurance is missing, I want to see what’s needed before offering.  
  Acceptance criteria: evidence_summary lists missing payoff/title/insurance; workflow_state is NeedsInfo/NeedsReview; no “ReadyForOffer” badge until satisfied or overridden.

### Team lead / owner
- As a team lead, when reviewing yesterday’s deals, I want to see which offers breached guardrails so I can coach or block.  
  Acceptance criteria: runs show workflow_state and guardrail deltas; any overrides are logged; policy posture noted; review can be done from `/overview` + `/trace`.
- As an owner, when an override is requested, I want to see evidence and trace before approving.  
  Acceptance criteria: override reason and artifacts present; trace frames show gating policies; approval captured in audit logs; final run hashes preserved.

### Underwriter / analyst / VA
- As an analyst, when normalizing a deal, I want clear required fields and policy tokens so my runs are reproducible.  
  Acceptance criteria: inputs validated; sandbox/policy tokens visible (read-only if governed); rerun yields same hashes given same inputs/policy; evidence freshness computed.
- As an analyst, when preparing IC, I want risk/evidence and workflow_state to be unambiguous.  
  Acceptance criteria: RISK_GATES_POLICY, EVIDENCE_FRESHNESS_POLICY, WORKFLOW_STATE_POLICY trace entries present; workflow_state set; evidence completeness meets policy.

### Disposition / transactions manager
- As a transactions manager, when setting buyer ask, I want disposition tracks and carry/timeline to be explicit so I avoid fallout.  
  Acceptance criteria: disposition track enablement visible; Timeline & Carry outputs present; MAO bundle and payoff/shortfall shown; seasoning/assignment/HOA flags surfaced.
- As a transactions manager, when moving to closing, I want all hard gates cleared or documented.  
  Acceptance criteria: risk gates all pass or have approved overrides; evidence freshness current; workflow_state ReadyForOffer; notes include closing requirements (e.g., HOA/insurance/title).

### JV partner / capital partner
- As a capital partner, when I review a deal, I want a plain-language summary with trace-backed numbers so I can decide quickly.  
  Acceptance criteria: Overview shows spread, risk grade, evidence completeness; Trace available for audit; no AI-invented numbers; decision in ≤10 minutes of review.
- As a capital partner, when risk is high, I want it called out with reasons so I can decline with clarity.  
  Acceptance criteria: risk_summary highlights failing/blocked gates; evidence gaps listed; payoff/shortfall visible; policy posture stated.

## Cross-References
- `docs/product/vision-and-positioning.md`
- `docs/product/end-to-end-deal-lifecycle.md` (planned)
- `docs/domain/wholesale-underwriting-handbook.md`
- `docs/glossary/terms.md`
- KPI references: see `docs/dashboard/kpi-inventory.md`
