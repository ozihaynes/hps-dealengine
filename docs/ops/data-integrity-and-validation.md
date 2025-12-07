---
doc_id: "ops.data-integrity-and-validation"
category: "ops"
audience: ["ai-assistant", "engineer", "ops", "underwriter"]
trust_tier: 1
summary: "Validation and integrity guidance across DB, engine, and UI plus SOPs for fixing bad data without breaking determinism or RLS."
---

# Data Integrity & Validation — HPS DealEngine

## Purpose
- Catalog validation and integrity guarantees across DB, engine, and UI, and highlight sharp edges where bad data can slip through.
- Provide SOPs for repairing bad data and guidance for AI/users so no one silently “smooths over” invalid inputs.
- Aligns with determinism/RLS (product vision), lifecycle/ReadyForOffer gating, and risk/evidence policies.

## Validation Layers Overview
- **DB-level:** Schemas, PK/FK, NOT NULL/UNIQUE, enums, hashes for runs, RLS on org-scoped tables, audit logging (where present).
- **Engine-level:** AnalyzeInput contract validation; sanity checks on values; policy guardrails (floors/ceilings, spread ladder, risk gates, timeline/carry); no silent invention of external data.
- **UI-level:** Form hints and required fields on Underwrite/Repairs/Deals; advisory toasts/guards for missing deal/run selection; UX reminders for evidence uploads. Engine+DB remain the hard enforcement.

## DB-Level Validation & RLS
- **Tables & constraints (representative):**
  - `deals`: PK id; org-scoped; required address/market metadata.
  - `runs`: PK id; FK to deals/org; uniqueness on hashes (e.g., org_id/deal_id/policy_hash/input_hash/posture) to enforce determinism; posture/sandbox metadata.
  - `sandbox_settings`, `sandbox_presets`: org-scoped; posture/posture presets; FK to org; likely unique per org/posture/name.
  - `repair_rate_sets`: org/posture/market scoped; version/as_of; FK to org; required PSF/Big5 data.
  - `evidence_*`: org/deal scoped; FK to deals/runs where applicable; metadata for freshness.
  - `audit_logs`: captures critical changes (where triggers exist).
- **RLS:** Enabled on org-scoped tables; policies typically allow rows where `org_id` is in memberships for `auth.uid()`. Service role for admin/back-office only (never in user flows).
- **Determinism:** `runs` hash uniqueness prevents duplicate runs with same input/policy; replay safety.
- **Audit:** Where triggers exist, critical tables log to `audit_logs`; treat as required for manual corrections.
- **CEO-level assumption:** Exact PK/FK/unique combos vary per table; policies follow standard membership pattern; audit triggers present on critical tables.

## Engine-Level Validation & Sanity Checks
- **Contracts:** AnalyzeInput validated via contracts (types, required fields). AnalyzeOutput includes floors/ceilings, spread, timeline_summary, risk_summary, evidence_summary, strategy data.
- **Sanity patterns:**
  - Non-negative valuations/repairs; clamps where needed (CEO-level assumption: negatives are coerced to safe minima).
  - Floors/ceilings/MAO computed under policy; cannot cross Respect Floor/Buyer Ceiling.
  - Timeline uses `timeline_summary` (DTM, urgency, carry months); policy caps/buffers applied.
  - Risk gates Pass/Watch/Fail based on inputs (flood/FHA/FIRPTA/condo/PACE/uninsurable/SCRA, etc.).
- **No fabrication:** Engine does not invent payoff, comps, or market data; missing data degrades into risk/evidence warnings, not hidden defaults.
- **Gaps (current sharp edges):**
  - If inputs are zero/blank but typed as numbers, engine may treat as zero unless UI/DB blocks (CEO-level assumption).
  - Payoff nuances (per-diem, fees) may be under-modeled unless entered explicitly.

## UI-Level Validation & UX
- **Forms:** Underwrite/Repairs require core fields (deal selection, posture, ARV/AIV, repairs class/PSF). Numeric inputs generally type=number; some guards for missing vs zero.
- **Guards:** “Select a deal/run” blockers; evidence upload toasts; repairs/quick-estimate disabled when rates missing.
- **Advisory only:** UI hints/toasts do not replace DB/engine rules; critical constraints enforced downstream.
- **Known light areas (CEO-level assumption):** Some fields allow blanks (e.g., optional timeline notes) and rely on engine risk/evidence summaries to flag incompleteness.

## Known Sharp Edges & Risky Patterns
- **Payoff incompleteness:** Missing per-diem/fees/taxes/HOA or PACE/UCC can understate payoff; risk gates may only catch obvious payoff gaps. Mitigation: demand payoff letter; risk/evidence Watch.
- **Repairs without sqft:** QuickEstimate PSF needs living area; if missing, PSF may mislead (CEO-level assumption: UI may block but engine could accept zero and warn). Mitigation: fill sqft or use line items.
- **Evidence schema drift:** Older evidence rows may lack freshness timestamps/flags; Evidence Freshness may show stale/unknown. Mitigation: re-upload key docs.
- **Extreme markets:** Very high DOM/MOI or ultra-fast markets may exceed assumed bands; Market Temp/urgency may be less precise (CEO-level assumption). Mitigation: manual review and conservative posture.
- **Risk flag blind spots:** Unentered condo/SIRS/FIRPTA/insurance facts won’t fire gates. Mitigation: explicit intake questions; AI/user checklists.
- **Manual sandbox tweaks:** Aggressive posture/knobs can reduce guardrails if misused. Mitigation: governed access and review of presets.

## Data Repair SOP (Manual Corrections)
1. **Detect & triage:** Identify bad data (payoff wrong, repairs bogus, missing evidence) via Dashboard/Trace/risk/evidence cards.
2. **Who can fix:** Admin/owners or designated ops only; end-users should not edit directly if it breaks policy.
3. **How to fix:**
   - Correct source data in UI where possible (repairs, payoff, timeline, flags).
   - If DB update required, use admin/ops tooling; ensure org scoping and RLS-compliant paths.
   - Ensure audit logging (audit_logs) captures the change; add deal notes for context.
4. **Re-run:** Execute v1-analyze and save a new run; verify runs hash uniqueness and updated outputs.
5. **Verify:** Check Dashboard/Trace for guardrails/risk/evidence correctness; confirm gates/Confidence Grade reflect the fix.
6. **Escalate to engineering:** If pattern/systemic (bad import, repeated API bug), file an issue and patch code rather than repeated manual fixes.

## Guidelines for AI & Users
- **AI:**
  - Treat DB + engine outputs/trace as truth; flag inconsistencies (e.g., spread too good vs payoff, repairs mismatched with photos).
  - Refuse to guess structured data (payoff, repairs) or override risk gates; recommend evidence collection or SOP steps.
  - Use trust tiers; if data is stale/missing, say so and request specifics.
- **Users:**
  - If UI and reality differ, add notes, refresh evidence, and notify underwriter/owner.
  - Escalate with dealId/runId, screenshots, expected vs actual; trigger repair SOP when critical fields are wrong.

## Cross-References
- docs/product/vision-and-positioning.md
- docs/product/end-to-end-deal-lifecycle.md
- docs/domain/risk-gates-and-compliance.md
- docs/domain/timeline-and-carry-policy.md
- docs/engine/architecture-overview.md
- docs/engine/analyze-contracts.md
- docs/ai/assistant-behavior-guide.md
- docs/ai/data-sources-and-trust-tiers.md
- docs/ops/error-conditions.md
