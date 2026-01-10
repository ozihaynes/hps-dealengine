# Changes Log - Slice 02: Type Definitions

## Generated
2026-01-10

## Summary
Created TypeScript type definitions in `packages/contracts/src/underwrite/` to match the database schema from Slice 01. All types are strictly typed with no `any` types.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| enums.ts | packages/contracts/src/underwrite/ | Enum types + option arrays |
| inputs.ts | packages/contracts/src/underwrite/ | Engine input interfaces |
| outputs.ts | packages/contracts/src/underwrite/ | Engine output interfaces |
| constants.ts | packages/contracts/src/underwrite/ | Policy-backed thresholds |
| index.ts | packages/contracts/src/underwrite/ | Barrel export |

## Files Modified

| File | Change |
|------|--------|
| packages/contracts/src/index.ts | Added `export * from "./underwrite";` |

## Type Definitions

### enums.ts (8 DB enums + 6 engine output types)

**Database Enums (match Slice 01 exactly)**
1. `ReasonForSelling` - 14 values with weight scoring
2. `SellerTimeline` - 5 values with multipliers
3. `DecisionMakerStatus` - 6 values with multipliers
4. `ForeclosureStatus` - 7 FL-specific stages
5. `LienStatus` - 5 values with multipliers
6. `TaxStatus` - 6 values with multipliers
7. `PropertyCondition` - 6 values with multipliers
8. `DeferredMaintenance` - 5 values with multipliers

**Engine Output Types**
1. `TimelinePosition` - 7 values (none through post_sale)
2. `UrgencyLevel` - 4 values (low, medium, high, critical)
3. `RiskLevel` - 4 values (low, medium, high, critical)
4. `MotivationLevel` - 4 values (low, medium, high, critical)
5. `ConfidenceLevel` - 4 values (low, medium, high, very_high)
6. `SystemCondition` - 5 values (new through failed)

**Option Arrays (9 total)**
- All include label, description, weight/multiplier
- `FL_TIMELINE_STAGES` includes statute references

### inputs.ts (4 interfaces)

1. `MotivationScoreInput` - 8 fields for motivation calculation
2. `ForeclosureTimelineInput` - 5 fields for FL timeline
3. `LienRiskInput` - 8 fields for lien assessment
4. `SystemsStatusInput` - 3 fields for property systems

### outputs.ts (9 interfaces)

1. `MotivationScoreOutput` - score + level + confidence + red_flags + breakdown
2. `ForeclosureTimelineOutput` - position + days + urgency + boost + dates
3. `LienRiskOutput` - totals + risk_level + warnings + breakdown
4. `SystemScore` - per-system status (roof/hvac/water_heater)
5. `SystemsStatusOutput` - aggregated RUL + costs + urgent_replacements
6. `UnderwriteRiskGateType` - blocking | warning | evidence
7. `UnderwriteRiskGateResult` - gate_id + type + passed + message + values
8. `UnderwriteRiskGatesOutput` - totals + counts + results array

### constants.ts (22 constants)

**Motivation Thresholds**
- `MOTIVATION_LOW_MIN` = 0
- `MOTIVATION_MEDIUM_MIN` = 40
- `MOTIVATION_HIGH_MIN` = 65
- `MOTIVATION_CRITICAL_MIN` = 85

**Urgency Thresholds (Days)**
- `URGENCY_CRITICAL_DAYS` = 30
- `URGENCY_HIGH_DAYS` = 60
- `URGENCY_MEDIUM_DAYS` = 120

**Foreclosure Boosts (Points)**
- `FORECLOSURE_BOOST_CRITICAL` = 25
- `FORECLOSURE_BOOST_HIGH` = 15
- `FORECLOSURE_BOOST_MEDIUM` = 10
- `FORECLOSURE_BOOST_LOW` = 5

**Lien Thresholds (Dollars)**
- `LIEN_BLOCKING_THRESHOLD` = 10,000
- `LIEN_LOW_THRESHOLD` = 2,500
- `LIEN_MEDIUM_THRESHOLD` = 5,000
- `LIEN_HIGH_THRESHOLD` = 10,000

**System Expected Life (Years - Central FL)**
- `ROOF_EXPECTED_LIFE` = 25
- `HVAC_EXPECTED_LIFE` = 15
- `WATER_HEATER_EXPECTED_LIFE` = 12

**Replacement Costs (2024 Prices)**
- `ROOF_REPLACEMENT_COST` = 15,000
- `HVAC_REPLACEMENT_COST` = 8,000
- `WATER_HEATER_REPLACEMENT_COST` = 1,500

**Reference**
- `REFERENCE_YEAR` = new Date().getFullYear()

## Naming Resolution

Fixed naming conflict with existing `riskGates.ts` exports:

| Original Name | Renamed To | Reason |
|---------------|------------|--------|
| RiskGateType | UnderwriteRiskGateType | Avoid conflict with riskGates.ts |
| RiskGateResult | UnderwriteRiskGateResult | Avoid conflict with riskGates.ts |
| EnhancedRiskGatesOutput | UnderwriteRiskGatesOutput | Consistency with prefixed names |

## FL Statute References

- FL 702.10 - Lis pendens filing
- FL 45.031 - Final judgment procedure
- FL 720.3085 - HOA joint and several liability

## Verification

```powershell
pnpm -w typecheck  # PASS
```
