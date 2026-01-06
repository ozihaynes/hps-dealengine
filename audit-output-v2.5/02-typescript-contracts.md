# TypeScript Types & Contracts Audit
Date: 2026-01-03
Auditor: Claude Code

## Overview

The HPS DealEngine uses **Zod** for runtime schema validation. All contracts are defined in `packages/contracts/src/`.

---

## Contract Modules

### packages/contracts/src/index.ts

Exports 22 contract modules:

```typescript
export * from "./posture";
export * from "./settings";
export * from "./analyze";
export * from "./runs";
export * from "./runsSave";
export * from "./policyOverrides";
export * from "./repairs";
export * from "./userSettings";
export * from "./repairRates";
export * from "./sandboxSettings";
export * from "./evidence";
export * from "./aiBridge";
export * from "./sandboxStrategist";
export * from "./sandboxMeta.generated";
export * from "./valuation";
export * from "./determinismHash";
export * from "./publicRecordsSubject";
export * from "./marketIndex";
export * from "./dealContracts";
export * from "./intake";
export * from "./bulkImport";
export * from "./snapshot";
```

---

## Core Schemas

### AnalyzeOutputsSchema (analyze.ts:370-509)

The main output schema for underwriting analysis.

```typescript
const AnalyzeOutputsSchema = z.object({
  // Valuation outputs
  arv: z.number().nullable(),
  aiv: z.number().nullable(),

  // Floor/Ceiling outputs
  buyer_ceiling: z.number().nullable(),
  respect_floor: z.number().nullable(),
  floor_investor: z.number().nullable().optional(),
  payoff_plus_essentials: z.number().nullable().optional(),

  // MAO outputs
  mao_wholesale: z.number().nullable().optional(),
  mao_flip: z.number().nullable().optional(),
  mao_wholetail: z.number().nullable().optional(),

  // Primary offer
  primary_offer: z.number().nullable().optional(),
  primary_offer_track: z.string().nullable().optional(),

  // V2 Competitive Offer Engine
  offer_menu_cash: OfferMenuCashSchema.nullable().optional(),
  hvi_unlocks: z.array(HviUnlockSchema).nullable().optional(),

  // Workflow state
  workflow_state: z.enum(["NeedsInfo", "NeedsReview", "ReadyForOffer"]).nullable().optional(),
  workflow_reasons: z.array(z.string()).nullable().optional(),

  // Confidence
  confidence_grade: z.enum(["A", "B", "C"]).nullable().optional(),
  confidence_reasons: z.array(z.string()).nullable().optional(),

  // Risk & Evidence summaries
  risk_summary: RiskSummarySchema.optional(),
  evidence_summary: EvidenceSummarySchema.optional(),
  timeline_summary: TimelineSummarySchema.optional(),

  // Spread & gates
  spread_cash: z.number().nullable().optional(),
  cash_gate_status: GateStatusSchema.optional(),
  borderline_flag: z.boolean().optional(),
});
```

**Output Keys Count:** 23+ keys

---

### OfferMenuCashSchema (analyze.ts:339-355)

V2 Competitive Offer Engine output.

```typescript
const OfferMenuCashSchema = z.object({
  base: z.object({
    offer: z.number(),
    label: z.string(),
    tier_key: z.string(),
  }),
  stretch: z.object({
    offer: z.number(),
    label: z.string(),
    tier_key: z.string(),
  }).nullable(),
  premium: z.object({
    offer: z.number(),
    label: z.string(),
    tier_key: z.string(),
  }).nullable(),
  eligibility: z.record(z.enum(['eligible', 'blocked_risk', 'blocked_evidence'])),
});
```

---

### HviUnlockSchema (analyze.ts:359-368)

High-Value Item unlock structure.

```typescript
const HviUnlockSchema = z.object({
  key: z.string(),
  label: z.string(),
  penalty_locked: z.number(),
  unlocked_value: z.number(),
  is_locked: z.boolean(),
  unlock_action: z.string().optional(),
});
```

---

### RiskSummarySchema

Risk gate evaluation results.

```typescript
const RiskSummarySchema = z.object({
  overall: GateStatusSchema,
  gates: z.record(z.object({
    status: GateStatusSchema,
    reason: z.string().optional(),
  })),
  any_blocking: z.boolean().optional(),
});
```

---

### EvidenceSummarySchema

Evidence freshness tracking.

```typescript
const EvidenceSummarySchema = z.object({
  freshness_by_kind: z.record(z.object({
    status: GateStatusSchema,
    age_days: z.number().optional(),
    expires_at: z.string().optional(),
  })),
  any_blocking: z.boolean().optional(),
  missing_critical: z.array(z.string()).optional(),
});
```

---

### GateStatusSchema

Common gate status enum.

```typescript
const GateStatusSchema = z.enum(['GO', 'WATCH', 'STOP', 'UNKNOWN']);
```

---

## Valuation Contracts (valuation.ts)

### ValuationRunRequestSchema

```typescript
const ValuationRunRequestSchema = z.object({
  deal_id: z.string().uuid(),
  override_market: z.object({
    arv: z.number().optional(),
    aiv: z.number().optional(),
  }).optional(),
});
```

### ValuationRunResponseSchema

```typescript
const ValuationRunResponseSchema = z.object({
  run_id: z.string().uuid(),
  arv: z.number().nullable(),
  aiv: z.number().nullable(),
  confidence: z.object({
    overall: z.string(),
    arv_confidence: z.string().optional(),
    aiv_confidence: z.string().optional(),
  }).optional(),
  comps: z.array(CompSchema).optional(),
  trace: z.array(TraceFrameSchema).optional(),
});
```

---

## Evidence Contracts (evidence.ts)

### EvidenceKind Enum

```typescript
const EvidenceKind = z.enum([
  'payoff_letter',
  'title_commitment',
  'insurance_quote',
  'four_point_inspection',
  'repair_estimate',
  'photos',
  'contract',
  'addendum',
  'other',
]);
```

### EvidenceStartRequestSchema

```typescript
const EvidenceStartRequestSchema = z.object({
  deal_id: z.string().uuid(),
  kind: EvidenceKind,
  filename: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
});
```

---

## Intake Contracts (intake.ts)

### SendIntakeLinkRequestSchema

```typescript
const SendIntakeLinkRequestSchema = z.object({
  deal_id: z.string().uuid().optional(),
  recipient_name: z.string().min(1),
  recipient_email: z.string().email().optional(),
  recipient_phone: z.string().optional(),
  expires_in_days: z.number().min(1).max(90).optional(),
  schema_key: z.string().optional(),
  send_method: z.enum(['email', 'sms', 'both', 'none']).optional(),
});
```

### IntakeSubmissionSchema

```typescript
const IntakeSubmissionSchema = z.object({
  payload: z.record(z.unknown()),
});
```

---

## Bulk Import Contracts (bulkImport.ts)

### ImportJobCreateRequestSchema

```typescript
const ImportJobCreateRequestSchema = z.object({
  label: z.string().optional(),
  source_type: z.string(),
  source_meta: z.record(z.unknown()).optional(),
});
```

### ImportItemSchema

```typescript
const ImportItemSchema = z.object({
  row_number: z.number(),
  payload: z.object({
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    }),
    client_name: z.string().optional(),
    client_phone: z.string().optional(),
    client_email: z.string().optional(),
    // Additional fields...
  }),
});
```

---

## Snapshot Contracts (snapshot.ts)

### SnapshotGenerateRequestSchema

```typescript
const SnapshotGenerateRequestSchema = z.object({
  snapshot_type: z.enum(['portfolio', 'deal_summary']),
  deal_ids: z.array(z.string().uuid()).optional(),
  as_of_date: z.string().optional(),
});
```

### PortfolioSnapshotSchema

```typescript
const PortfolioSnapshotSchema = z.object({
  summary: z.object({
    total_deals: z.number(),
    total_arv: z.number(),
    total_potential_profit: z.number(),
    avg_confidence: z.number(),
  }),
  by_workflow_state: z.record(z.number()),
  by_risk_status: z.record(z.number()),
  deals: z.array(DealSnapshotSchema),
});
```

---

## Deal Contracts (dealContracts.ts)

### DealContractUpsertSchema

```typescript
const DealContractUpsertSchema = z.object({
  deal_id: z.string().uuid(),
  executed_contract_price: z.number().optional(),
  status: z.enum(['under_contract', 'closed', 'cancelled']),
  notes: z.string().optional(),
});
```

---

## Policy Contracts (policyOverrides.ts)

### PolicyOverrideSchema

```typescript
const PolicyOverrideSchema = z.object({
  token_path: z.string(),
  value: z.union([z.number(), z.string(), z.boolean()]),
  reason: z.string().optional(),
});
```

---

## Sandbox Settings (sandboxSettings.ts)

### SandboxOptionsSchema

Large schema with ~50+ configurable policy tokens organized by category:
- valuation (aivSafetyCapPercentage, etc.)
- floors (floorInvestorAivDiscountP20Zip, etc.)
- spreads (wholesaleTargetMarginPct, etc.)
- carry (carryMonthsMaximumCap, etc.)
- workflow (cashPresentationGateMinSpread, etc.)

---

## Type Inference Pattern

All schemas use Zod's type inference:

```typescript
type AnalyzeOutputs = z.infer<typeof AnalyzeOutputsSchema>;
type OfferMenuCash = z.infer<typeof OfferMenuCashSchema>;
type HviUnlock = z.infer<typeof HviUnlockSchema>;
```

---

## Summary

| Category | Schema Count |
|----------|-------------|
| Analyze/Output | 8 |
| Valuation | 6 |
| Evidence | 4 |
| Intake | 5 |
| Import | 4 |
| Snapshot | 3 |
| Deal Contracts | 2 |
| Policy/Sandbox | 5 |
| **Total** | **37+** |
