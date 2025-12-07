---
doc_id: "product.end-to-end-deal-lifecycle"
category: "product"
audience: ["ai-assistant", "product", "underwriter", "exec"]
trust_tier: 2
summary: "Maps the full lead-to-close lifecycle to DealEngine routes, data models, edge functions, and statuses."
---

# End-to-End Deal Lifecycle

## 1. Purpose
- Describes the full lifecycle from raw lead → closed/failed deal, tying business stages to DealEngine routes, data models, and edge functions.
- Clarifies which stages DealEngine owns vs supports via external tools (CRM, MLS, title/lender).
- Maps lifecycle stages to product surfaces:
  - Routes: `/startup`, `/deals`, `/overview`, `/underwrite`, `/repairs`, `/trace`, `/runs`, `/sandbox`, `/sources`, `/settings`.
  - Tables: `deals`, `runs`, `evidence_*`, `policies`, `policy_versions`, `sandbox_settings`, `sandbox_presets`, `audit_logs`.
  - Edge functions: `v1-analyze`, `v1-runs-save`, `v1-evidence-*`, `v1-repair-rates`, `v1-repair-profiles`, `v1-policy-*`, `v1-ai-bridge` (advisory), sandbox GET/PUT.

## 2. Lifecycle Stages (Business View)

### 2.1 Lead Intake & Qualification
- Mostly external (CRM/marketing/dialer). Capture address, seller contact, motivation/lead type, and basic notes before entering DealEngine.
- DealEngine touchpoint: none yet; optional source metadata stored later on deal creation.

### 2.2 Deal Creation in DealEngine
- Creates `deals` row (address, city/state/zip, optional seller/contact meta, org membership). DealEngine becomes system of record for the deal object.
- Surfaces: `/startup` (new deal), `/deals` (list/select); DealSession set.
- Data: `deals` (org_id, created_by, payload), `audit_logs`.

### 2.3 Evidence Collection
- Evidence types: photos, payoff, title, insurance, repairs, comps, HOA/estoppel, inspection. Stored in evidence tables + Supabase Storage via signed URLs.
- Surfaces: `/underwrite` (evidence prompts), `/repairs`, `/overview` risk/evidence cards, `/trace` evidence frames.
- Data/edges: `evidence_*` tables; `v1-evidence-start`, `v1-evidence-url`; `audit_logs`.

### 2.4 First-Pass Underwriting (Triage)
- Quick ARV/AIV, Quick Estimate repairs (PSF/Big 5), minimal risk gates to decide “is this worth a deep pass?”
- Surfaces: `/underwrite` (inputs), `/repairs` (quick estimate), `/overview` (guardrails), `/trace` (triage trace if run).
- Data: early `runs` with `workflow_state` (e.g., NeedsInfo/NeedsReview/ReadyForOffer pending evidence); policy snapshot + hashes; `v1-analyze`, `v1-runs-save`.

### 2.5 Deep Underwriting & Scenarios
- Full repairs (PSF + Big 5 + line items), payoff data, carry, sandbox variations, posture comparisons, risk gate clearance, evidence freshness.
- Surfaces: `/repairs`, `/underwrite`, `/sandbox` (governed), `/trace` (deep frames), `/overview` (Strategy, Risk, Timeline).
- Data: multiple `runs` per deal with policy snapshots/hashes; `sandbox_settings`, `sandbox_presets`; `policies`/`policy_versions`; `v1-repair-rates`, `v1-repair-profiles`, sandbox functions, `v1-ai-bridge` (advisory-only).

### 2.6 Decision & IC (Investment Committee)
- Formal decision with rationale; workflow_state transitions (ReadyForOffer, Hold, Kill) tied to evidence/risk gates.
- Surfaces: `/overview` (Guardrails, Strategy, Risk/Evidence), `/trace` (policy frames), `/runs` (if enabled).
- Data: `runs` (workflow_state, outputs, trace), notes/overrides, `audit_logs`.

### 2.7 Offer & Negotiation
- Offer terms, concession ladders, negotiation playbooks; communication occurs via phone/email/CRM (external).
- DealEngine records numbers, rationale, and guardrails—not the call itself.
- Surfaces: `/overview` (Guardrails/Strategy), `/underwrite` (offer entries), `/trace` (supporting reasons).
- Data: latest `runs`, notes; no external comms stored here.

### 2.8 Contract, Closing, and Disposition
- External: title/attorney, MLS listing, lenders/buyers. Paths: assignment/double-close, wholetail flip, list/MLS.
- DealEngine captures: chosen exit track, contract/closing snapshots if provided, realized outcomes where available.
- Surfaces: `/overview` (Timeline & Carry, Strategy), `/trace` (timeline/closing buffers), `/runs` (closing snapshot if captured).
- Data: `deals` payload updates, `runs` outputs (primary_offer/track, timeline), evidence for title/insurance/payoff; `audit_logs`.

### 2.9 Post-Mortem and Archive
- Capture final outcome vs underwrite; feed calibration and policy tweaks.
- Surfaces: `/trace` (compare runs), `/sandbox` (preset adjustments), `/overview` (post-close notes if recorded).
- Data: final `runs`, outcomes added to `deals` payload, `audit_logs`; informs `policy_versions` updates and `sandbox_presets`.

### 2.10 Failure Modes
- Examples: dead lead, declined by IC, risk gate fail, seller walked, financing failure, missed auction, compliance/HOA block.
- Tie to deal/run status and evidence: set ClosedLost with reason; runs show failing gates/workflow_state; evidence gaps/notes capture why.

## 3. Where DealEngine Fits (System Boundaries)

### 3.1 Stages DealEngine Owns
- Deal-level intake once in app (`/startup`, `/deals`) and canonical deal identity (`deals`).
- Evidence capture (`evidence_*`, `v1-evidence-*`).
- Underwriting & strategy selection (engine, `v1-analyze`, `v1-runs-save`, `runs`, `policies`/`policy_versions`, `sandbox_*`).
- Negotiation prep (guardrails/trace on `/overview`, `/underwrite`, `/trace`, playbooks inline).

### 3.2 Stages DealEngine Supports but Does Not Own
- Lead capture/CRM pipeline (external system of record).
- MLS listing workflows (external).
- Closing with title/attorneys and lenders (external systems).
- For each supported stage: DealEngine stores decisions/outputs (runs, evidence, notes) and expects external systems to manage execution.

### 3.3 System-of-Record Mapping

| Domain | System of record | Key objects | Required transitions |
| --- | --- | --- | --- |
| Lead & pipeline status | CRM/dialer | Lead, activity | Must meet minimal fields (address, contact, notes) before DealEngine intake. |
| Deal identity & facts | DealEngine | `deals`, payload, `audit_logs` | Create deal with org membership; updates audited. |
| Underwriting outputs & risk gates | DealEngine | `runs` + `policy_snapshot` + hashes, `trace`, `workflow_state` | Cannot mark ReadyForOffer without passing risk gates + evidence minimums. |
| Evidence storage | DealEngine | `evidence_*`, Storage objects | Evidence linked to `deal_id`/`run_id`; freshness tracked. |
| Contract/closing dates | External (title/CRM) with snapshot in DealEngine | External closing package, optional payload on `deals`/`runs` | Capture key dates/outcomes when available; maintain linkage to authoritative source. |

## 4. Lifecycle Statuses & Workflow States

### 4.1 Canonical Deal Lifecycle Statuses
- Proposed flow (aligning to v1 behavior and workflow_state): `New` → `Underwriting` → `ReadyForOffer` → `UnderContract` → `DispoActive` (if marketing to buyers) → `ClosedWon` / `ClosedLost`.
- ClosedLost reasons (examples): `ICDecline`, `RiskFail`, `SellerWalked`, `FinancingFail`, `AuctionMissed`, `ComplianceBlock`, `DeadLead`.

### 4.2 Relationship: Deal Status, Run workflow_state, Evidence & Risk
- Deal status reflects the latest authoritative run + external progression:
  - `Underwriting`: latest run exists but workflow_state not ReadyForOffer.
  - `ReadyForOffer`: latest run.workflow_state = ReadyForOffer AND required evidence/risk gates pass.
  - `UnderContract`: external contract signed; tie to deal payload; underlying run remains reference.
  - `DispoActive`: contract in place and disposition path active (assignment/list/wholetail).
  - `ClosedWon`: closed; final run + outcomes captured.
  - `ClosedLost`: closed with reason; failing gates/evidence gaps or external failure recorded.
- Evidence completeness and risk gate status are prerequisites for moving to ReadyForOffer/UnderContract; missing or stale evidence keeps status in Underwriting/NeedsReview.

### 4.3 UI Indicators & Filters
- `/deals`: filters by lifecycle status (New/Underwriting/ReadyForOffer/UnderContract/ClosedWon/ClosedLost); tags show reason codes where applicable.
- `/overview`: chips/badges for workflow_state, confidence, risk gates, evidence freshness; banner if status < ReadyForOffer.
- `/trace`: shows workflow policy frames, risk/evidence freshness, and status rationale; no UI-only overrides.

## 5. Handoffs and Feedback Loops

### 5.1 Acquisitions → Dispo Handoffs
- Selected “authoritative” run (latest ReadyForOffer) shared with dispo; includes guardrails, MAO bundle, risk/evidence summary.
- Fields updated: deal status to UnderContract/DispoActive, disposition track/ask stored in run outputs or deal payload.
- Notes live on deal (context) and runs (decision rationale); audit logged.

### 5.2 Post-Close Feedback into Policies & Sandbox
- Post-close outcomes inform `sandbox_settings`/`sandbox_presets` (e.g., margin adjustments, Market Temp tuning) and `policy_versions` updates.
- Use final run vs actuals to recalibrate repairs, carry, spreads; document in devlog and audit logs.

### 5.3 AI’s Role in Lifecycle Awareness
- AI agents read deal status + latest run.workflow_state to tailor advice (triage vs IC vs dispo).
- AI may recommend next steps and missing evidence to advance stage; never changes status directly.
- Advice must cite engine outputs, policy tokens, and evidence; no new math or unstated assumptions.

## 6. Cross-References
- `docs/product/vision-and-positioning.md`
- `docs/product/personas-and-use-cases.md`
- `docs/domain/wholesale-underwriting-handbook.md` (future)
- `docs/domain/risk-gates-and-compliance.md` (future)
- `docs/engine/analyze-contracts.md` (future)
- `docs/app/routes-overview.md` (future)
