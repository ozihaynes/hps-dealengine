# Engine/Computation Functions Audit
Date: 2026-01-03
Auditor: Claude Code

## Overview

The HPS DealEngine computation engine is located in `packages/engine/src/`. The main file `compute_underwriting.ts` contains 3400+ lines of computation logic.

---

## Main Engine Files

| File | Lines | Purpose |
|------|-------|---------|
| compute_underwriting.ts | 3400+ | Core underwriting computation |
| policy_builder.ts | 500+ | Policy construction from options |
| snapshot_computations.ts | 300+ | Portfolio snapshot calculations |
| signal_generator.ts | 400+ | Alert/signal generation |
| snapshot_policy_defaults.ts | 100+ | Default snapshot policy values |
| index.ts | 50+ | Package exports |

---

## Core Functions

### computeUnderwriting()

**Location:** `packages/engine/src/compute_underwriting.ts`

**Signature:**
```typescript
export function computeUnderwriting(
  input: UnderwritingInput,
  policy: UnderwritingPolicy,
  trace: TraceFrame[]
): AnalyzeOutputs
```

**Purpose:** Main entry point for all underwriting calculations.

**Input Dependencies:**
- `input.property` - Property details (address, sqft, beds, baths)
- `input.market` - Market data (ARV, AIV, DOM, MOI)
- `input.payoff` - Payoff details (mortgage balance, liens)
- `input.repairs` - Repair estimates
- `input.evidence` - Evidence attachments
- `policy.*` - Policy configuration tokens

**Output:** Full `AnalyzeOutputs` object with 23+ keys.

---

### buildUnderwritingPolicyFromOptions()

**Location:** `packages/engine/src/policy_builder.ts`

**Signature:**
```typescript
export function buildUnderwritingPolicyFromOptions(
  options: SandboxOptions,
  posture: Posture
): UnderwritingPolicy
```

**Purpose:** Constructs policy object from sandbox options and posture.

**Posture Values:** 'aggressive', 'balanced', 'conservative'

---

### computeFloorInvestor()

**Location:** `packages/engine/src/compute_underwriting.ts:~1400`

**Signature:**
```typescript
function computeFloorInvestor(
  aiv: number,
  discountP20: number,
  discountTypical: number,
  zipTier: 'p20' | 'typical'
): number
```

**Purpose:** Calculates investor floor based on AIV and ZIP tier discount.

**Formula:**
```
floor_investor = AIV * (1 - investor_discount)
```

---

### computePayoffPlusEssentials()

**Location:** `packages/engine/src/compute_underwriting.ts:~1450`

**Signature:**
```typescript
function computePayoffPlusEssentials(
  payoff: PayoffDetails,
  moveOutCash: number,
  retainedEquityPct: number
): number
```

**Purpose:** Calculates payoff floor with seller essentials.

**Formula:**
```
payoff_floor = payoff_balance + liens + move_out_cash + (equity * retained_equity_pct)
```

---

### computeRespectFloor()

**Location:** `packages/engine/src/compute_underwriting.ts:1497-1522`

**Signature:**
```typescript
function computeRespectFloor(
  floorInvestor: number,
  payoffPlusEssentials: number,
  compositionMode: 'max' | 'investor_only' | 'payoff_only'
): { respect_floor: number; dominant_floor: string }
```

**Purpose:** Computes unified floor from investor and payoff floors.

**Trace Frame:** `RESPECT_FLOOR`

---

### computeBuyerCeiling()

**Location:** `packages/engine/src/compute_underwriting.ts:2243-2701`

**Signature:**
```typescript
function computeBuyerCeiling(
  arv: number,
  marginSelection: MarginSelection,
  repairsTotal: number,
  buyerCostsTotal: number,
  carryMonths: number,
  holdCostPerMonth: number
): BuyerCeilingResult
```

**Purpose:** Calculates Maximum Allowable Offer (MAO) by strategy.

**Strategies Computed:**
- `mao_wholesale` - Wholesale exit
- `mao_flip` - Fix-and-flip exit
- `mao_wholetail` - Wholetail exit
- `mao_as_is_cap` - As-is cap rate exit

**Formula:**
```
MAO = ARV * (1 - margin) - repairs - buyer_costs - (carry_months * hold_cost)
```

**Trace Frames:** `BUYER_CEILING`, `HOLD_COST_POLICY`

---

### computeOfferMenuCash()

**Location:** `packages/engine/src/compute_underwriting.ts:3311-3323`

**Signature:**
```typescript
function computeOfferMenuCash(
  buyerCeiling: number,
  respectFloor: number,
  riskSummary: RiskSummary,
  evidenceSummary: EvidenceSummary
): OfferMenuCash
```

**Purpose:** Generates tiered cash offer menu.

**Tiers:**
- `base` - Conservative offer (floor + small margin)
- `stretch` - Mid-range offer (floor + larger margin)
- `premium` - Aggressive offer (approaching ceiling)

**Trace Frame:** `OFFER_MENU_ELIGIBILITY_OVERLAY`

---

### computeHviUnlocks()

**Location:** `packages/engine/src/compute_underwriting.ts:3325-3396`

**Signature:**
```typescript
function computeHviUnlocks(
  offerMenuCash: OfferMenuCash,
  evidence: EvidenceRecord[],
  policy: UnderwritingPolicy
): HviUnlock[]
```

**Purpose:** Calculates High-Value Item unlock opportunities.

**HVI Categories:**
- Four-point inspection
- Insurance quote
- Title commitment
- Recent appraisal
- Updated repair scope

**Trace Frame:** `HVI_UNLOCK_LOOP`

---

### computeRiskGates()

**Location:** `packages/engine/src/compute_underwriting.ts:~2800`

**Signature:**
```typescript
function computeRiskGates(
  input: UnderwritingInput,
  policy: UnderwritingPolicy
): RiskSummary
```

**Purpose:** Evaluates all risk gates.

**Gates Evaluated:**
- `insurability` - Can property be insured?
- `title` - Title issues
- `flood` - Flood zone concerns
- `bankruptcy` - Legal blocks
- `liens` - Outstanding liens
- `condition` - Property condition
- `market` - Market risk factors
- `compliance` - Regulatory compliance

**Trace Frame:** `RISK_GATES_POLICY`

---

### computeEvidenceFreshness()

**Location:** `packages/engine/src/compute_underwriting.ts:~3000`

**Signature:**
```typescript
function computeEvidenceFreshness(
  evidence: EvidenceRecord[],
  policy: UnderwritingPolicy
): EvidenceSummary
```

**Purpose:** Evaluates evidence freshness and completeness.

**Evidence Kinds:**
- payoff_letter
- title_commitment
- insurance_quote
- four_point_inspection
- repair_estimate

**Trace Frame:** `EVIDENCE_FRESHNESS_POLICY`

---

### computeConfidenceGrade()

**Location:** `packages/engine/src/compute_underwriting.ts:~3100`

**Signature:**
```typescript
function computeConfidenceGrade(
  riskSummary: RiskSummary,
  evidenceSummary: EvidenceSummary,
  compQuality: CompQuality,
  policy: UnderwritingPolicy
): { grade: 'A' | 'B' | 'C'; reasons: string[] }
```

**Purpose:** Computes overall confidence grade.

**Grade Criteria:**
- A: No risk STOPs, all critical evidence fresh, good comp quality
- B: WATCH gates present, some evidence aging, moderate comp quality
- C: Any STOP gate, missing critical evidence, poor comp quality

**Trace Frame:** `CONFIDENCE_POLICY`

---

### computeWorkflowState()

**Location:** `packages/engine/src/compute_underwriting.ts:~3150`

**Signature:**
```typescript
function computeWorkflowState(
  confidenceGrade: string,
  riskSummary: RiskSummary,
  evidenceSummary: EvidenceSummary,
  spreadCash: number,
  policy: UnderwritingPolicy
): { state: WorkflowState; reasons: string[] }
```

**Purpose:** Determines deal workflow state.

**States:**
- `NeedsInfo` - Missing critical evidence
- `NeedsReview` - Has risk watches requiring analyst review
- `ReadyForOffer` - All gates pass, ready for offer presentation

**Trace Frame:** `WORKFLOW_STATE_POLICY`

---

## Slice Functions

Located in `packages/engine/src/slices/`:

### computeAiv() - slices/aiv.ts

```typescript
export function computeAiv(
  arv: number,
  condition: number,
  safetyCapPct: number
): number
```

### computeCarry() - slices/carry.ts

```typescript
export function computeCarry(
  dom: number,
  strategy: string,
  policy: CarryPolicy
): number
```

---

## Snapshot Functions

### computePortfolioSnapshot()

**Location:** `packages/engine/src/snapshot_computations.ts`

**Signature:**
```typescript
export function computePortfolioSnapshot(
  deals: DealRecord[],
  runs: RunRecord[],
  policy: SnapshotPolicy
): PortfolioSnapshot
```

**Purpose:** Aggregates deal data into portfolio-level metrics.

**Output Metrics:**
- Total deals by workflow state
- Total ARV across portfolio
- Average confidence grade
- Risk distribution
- Potential profit estimates

---

## Signal Generator

### generateSignals()

**Location:** `packages/engine/src/signal_generator.ts`

**Signature:**
```typescript
export function generateSignals(
  deal: DealRecord,
  outputs: AnalyzeOutputs,
  trace: TraceFrame[]
): Signal[]
```

**Purpose:** Generates actionable signals from analysis.

**Signal Types:**
- Evidence upload prompts
- Risk gate warnings
- Opportunity indicators
- Stale data alerts

**Trace References:**
- `trace://EVIDENCE_FRESHNESS_POLICY`
- `trace://RISK_GATES_POLICY`
- `trace://RISK_GATES_POLICY.{gate_key}`

---

## Engine Package Exports

**Location:** `packages/engine/src/index.ts`

```typescript
export { computeUnderwriting } from './compute_underwriting';
export { buildUnderwritingPolicyFromOptions } from './policy_builder';
export { computePortfolioSnapshot } from './snapshot_computations';
export { generateSignals } from './signal_generator';
export { getSnapshotPolicyDefaults } from './snapshot_policy_defaults';
export type { UnderwritingPolicy, SnapshotPolicy } from './types';
```

---

## Summary

| Category | Function Count |
|----------|---------------|
| Core Computation | 12 |
| Slices | 4 |
| Snapshot | 2 |
| Signal Generation | 1 |
| Policy Building | 2 |
| **Total** | **21+** |

| Trace Frames Emitted | Count |
|---------------------|-------|
| RESPECT_FLOOR | 1 |
| BUYER_CEILING | 1 |
| HOLD_COST_POLICY | 1 |
| RISK_GATES_POLICY | 1 |
| EVIDENCE_FRESHNESS_POLICY | 1 |
| CONFIDENCE_POLICY | 1 |
| WORKFLOW_STATE_POLICY | 1 |
| OFFER_MENU_ELIGIBILITY_OVERLAY | 1 |
| HVI_UNLOCK_LOOP | 1 |
| MARKET_PROVENANCE | 1 |
| **Total** | **10** |
