# Business Logic Sandbox Knob Audit v2.0

**Status:** ✅ PHASE 7 COMPLETE
**Last Updated:** January 6, 2026
**Phase:** 7 of 8 (Business Logic Sandbox Consolidation Complete)

## Executive Summary

Phase 7 consolidated the Business Logic Sandbox schema, removing unused knobs, adding competitive-parity features, and fixing wiring issues.

## Final Counts

| Metric | Phase 1 Baseline | After Phase 7 | Change |
|--------|------------------|---------------|--------|
| Total KEEP Knobs | 82 | 87 | +5 net |
| DROP_BACKLOG (removed from audit) | 114 | 0 | -114 removed |
| Total Source Definitions | 196 | 223 | +27 |
| Wiring Issues | 5 | 0 | All fixed |

## Phase 7 Changes

### Slice A: Schema Cleanup
- Removed 112 DROP_BACKLOG knobs from sandboxKnobAudit.ts
- Reclassified 2 knobs from DROP to KEEP:
  - `dispositionRecommendationUrgentCashMaxAuctionDays` (consumed by engine)
  - `uninsurableAdderExtraHoldCosts` (consumed by engine)

### Slice B: UX Knob Resolution
- Removed 2 dead UX knobs:
  - `abcConfidenceGradeRubric` (defined but never consumed)
  - `allowAdvisorOverrideWorkflowState` (workflow not implemented)

### Slice C: New Knobs from Research
- Added 2 P0 knobs from competitor research:
  - `arvCompsMaxRadiusMiles` (default 1.0, PropStream/DealMachine parity)
  - `arvCompsSqftVariancePercent` (default 20%, PropStream parity)

### Slice D: speedBands Wiring Fix
- Fixed 5 speedBands knobs that weren't flowing through pipeline:
  - `speedBandsFastMaxDom`
  - `speedBandsFastMaxMoi`
  - `speedBandsBalancedMaxDom`
  - `speedBandsBalancedMaxMoi`
  - `zipSpeedBandDerivationMethod`

### Slice E: Documentation & Sealing
- Updated all documentation with final counts
- Created comprehensive wiring reference
- Quality gates verified

## Current KEEP Knobs (87 total)

| Category | Knobs |
|----------|-------|
| Valuation (AIV/ARV) | 17 |
| Repairs | 4 |
| Buyer Costs | 3 |
| Buyer Segmentation | 2 |
| Buyer Target Margin | 4 |
| Carry/Hold Costs | 9 |
| Double Close | 3 |
| Disposition | 3 |
| Days to Money | 3 |
| Floor/Ceiling | 9 |
| Gates (Risk/Compliance) | 9 |
| Payoff | 4 |
| Spread/Offer | 3 |
| speedBands | 7 |
| ARV Comps | 3 |
| Other | 4 |

## Key KEEP Knobs by Function

### Valuation Controls
- `aivHardMax`, `aivHardMin`, `aivSafetyCapPercentage`
- `arvHardMax`, `arvHardMin`, `arvMinComps`
- `arvCompsMaxRadiusMiles`, `arvCompsSqftVariancePercent`, `arvCompsSetSizeForMedian`
- `arvSoftMaxCompsAgeDays`, `arvSoftMaxVsAivMultiplier`
- `aivSoftMaxVsArvMultiplier`

### Speed & Market Velocity
- `speedBandsFastMaxDom`, `speedBandsFastMaxMoi`
- `speedBandsBalancedMaxDom`, `speedBandsBalancedMaxMoi`
- `speedBandsSlowMinDom`, `speedBandsSlowMinMoi`
- `zipSpeedBandDerivationMethod`

### Repairs & Contingency
- `repairsHardMax`, `repairsSoftMaxVsArvPercentage`
- `repairsContingencyPercentageByClass`

### Hold Costs (6 zip-speed combinations)
- `holdCostsFlipFastZip`, `holdCostsFlipNeutralZip`, `holdCostsFlipSlowZip`
- `holdCostsWholetailFastZip`, `holdCostsWholetailNeutralZip`, `holdCostsWholetailSlowZip`

### Risk Gates
- `bankruptcyStayGateLegalBlock`
- `fha90DayResaleRuleGate`
- `firptaWithholdingGate`
- `flood50RuleGate`
- `scraVerificationGate`
- `stateProgramGateFhaVaOverlays`

## Appendix A: Removed DROP_BACKLOG Knobs (112)

All 112 DROP_BACKLOG knobs were removed from the audit in Slice A.
They remain soft-deleted in the database with a 90-day rollback window.

See `docs/review/slice-a-schema-cleanup/changes-log.md` for the complete list.

## Appendix B: Pipeline Wiring

```
UI (sandboxSettingsSource.ts)
  ↓
Audit (sandboxKnobAudit.ts) — 87 KEEP
  ↓
Mapping (sandboxToAnalyzeOptions.ts)
  ↓
Contracts (analyze.ts)
  ↓
Policy Builder (policy_builder.ts)
  ↓
Engine (compute_underwriting.ts)
  ↓
Trace Frames → UI (/trace)
```

---

*Generated from sandboxKnobAudit.ts. Last verified: 2026-01-06*
