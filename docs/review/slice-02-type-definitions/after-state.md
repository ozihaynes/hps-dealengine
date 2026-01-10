# AFTER STATE - Slice 02: Type Definitions

Generated: 2026-01-10

## Verification Results

### Files Created (5 total)

| File | Location | Purpose |
|------|----------|---------|
| enums.ts | packages/contracts/src/underwrite/ | 8 enum types + 9 option arrays + 6 engine output types |
| inputs.ts | packages/contracts/src/underwrite/ | 4 input interfaces |
| outputs.ts | packages/contracts/src/underwrite/ | 6 output interfaces + 3 risk gate types |
| constants.ts | packages/contracts/src/underwrite/ | 22 policy-backed constants |
| index.ts | packages/contracts/src/underwrite/ | Barrel export |

### Enum Types Defined (14 total)

| Type | Values | Category |
|------|--------|----------|
| ReasonForSelling | 14 values | Deal Input |
| SellerTimeline | 5 values | Deal Input |
| DecisionMakerStatus | 6 values | Deal Input |
| ForeclosureStatus | 7 values | Deal Input |
| LienStatus | 5 values | Deal Input |
| TaxStatus | 6 values | Deal Input |
| PropertyCondition | 6 values | Deal Input |
| DeferredMaintenance | 5 values | Deal Input |
| TimelinePosition | 7 values | Engine Output |
| UrgencyLevel | 4 values | Engine Output |
| RiskLevel | 4 values | Engine Output |
| MotivationLevel | 4 values | Engine Output |
| ConfidenceLevel | 4 values | Engine Output |
| SystemCondition | 5 values | Engine Output |

### Option Arrays Defined (9 total)

| Array | Count | Purpose |
|-------|-------|---------|
| REASON_FOR_SELLING_OPTIONS | 14 | Weight-based scoring |
| SELLER_TIMELINE_OPTIONS | 5 | Multiplier-based |
| DECISION_MAKER_OPTIONS | 6 | Multiplier-based |
| FORECLOSURE_STATUS_OPTIONS | 7 | Weight + urgency |
| FL_TIMELINE_STAGES | 7 | Statute references |
| LIEN_STATUS_OPTIONS | 5 | Multiplier-based |
| TAX_STATUS_OPTIONS | 6 | Multiplier-based |
| PROPERTY_CONDITION_OPTIONS | 6 | Multiplier-based |
| DEFERRED_MAINTENANCE_OPTIONS | 5 | Multiplier-based |

### Input Interfaces Defined (4 total)

| Interface | Fields | Purpose |
|-----------|--------|---------|
| MotivationScoreInput | 8 | Seller motivation calculation |
| ForeclosureTimelineInput | 5 | FL foreclosure timeline |
| LienRiskInput | 8 | Lien risk assessment |
| SystemsStatusInput | 3 | Property systems RUL |

### Output Interfaces Defined (9 total)

| Interface | Fields | Purpose |
|-----------|--------|---------|
| MotivationScoreOutput | 5 | Motivation score + breakdown |
| ForeclosureTimelineOutput | 7 | Timeline + urgency |
| LienRiskOutput | 7 | Lien totals + risk |
| SystemScore | 8 | Per-system status |
| SystemsStatusOutput | 6 | Aggregated systems |
| UnderwriteRiskGateType | 3 values | Gate classification |
| UnderwriteRiskGateResult | 6 | Single gate result |
| UnderwriteRiskGatesOutput | 7 | Aggregated gates |

### Constants Defined (22 total)

| Category | Constants | Purpose |
|----------|-----------|---------|
| Motivation Thresholds | 4 | Score → level mapping |
| Urgency Thresholds | 3 | Days → urgency mapping |
| Foreclosure Boosts | 4 | Motivation point additions |
| Lien Thresholds | 4 | Dollar → risk mapping |
| System Expected Life | 3 | Central FL climate |
| System Costs | 3 | 2024 replacement prices |
| Reference | 1 | Current year for RUL |

### Main Index Updated

| Change | Status |
|--------|--------|
| Added `export * from "./underwrite";` | PASS |
| No naming conflicts | PASS |
| Typecheck passes | PASS |

## Summary

| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Files created | 5 | 5 | PASS |
| Enum types | 14 | 14 | PASS |
| Option arrays | 9 | 9 | PASS |
| Input interfaces | 4 | 4 | PASS |
| Output interfaces | 9 | 9 | PASS |
| Constants | 22 | 22 | PASS |
| Typecheck | Pass | Pass | PASS |
