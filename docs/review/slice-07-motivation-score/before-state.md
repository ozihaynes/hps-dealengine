# BEFORE STATE - Slice 07: Compute Motivation Score
Generated: 2026-01-10

## Existing engine directory:
- `apps/hps-dealengine/lib/engine/portfolio-utils.ts` exists

## Current engine barrel (if exists):
Does not exist yet (only portfolio-utils.ts present)

## Contracts types already defined:

### Types from contracts/underwrite/enums.ts:
- `ReasonForSelling` (14 values: foreclosure, pre_foreclosure, divorce, probate, relocation, downsizing, financial_distress, tired_landlord, inherited, tax_lien, code_violations, health_issues, job_loss, other)
- `SellerTimeline` (5 values: immediate, urgent, flexible, no_rush, testing_market)
- `DecisionMakerStatus` (6 values: sole_owner, joint_decision, power_of_attorney, estate_executor, multiple_parties, unknown)
- `MotivationLevel` (4 values: low, medium, high, critical)
- `ConfidenceLevel` (3 values: low, medium, high)

### Options with weights from contracts/underwrite/enums.ts:
- `REASON_FOR_SELLING_OPTIONS` with motivationWeight (foreclosure: 100, pre_foreclosure: 90, etc.)
- `SELLER_TIMELINE_OPTIONS` with multiplier (immediate: 1.5, urgent: 1.3, flexible: 1.0, no_rush: 0.7, testing_market: 0.3)
- `DECISION_MAKER_OPTIONS` with factor (sole_owner: 1.0, joint_decision: 0.9, power_of_attorney: 0.85, estate_executor: 0.8, multiple_parties: 0.6, unknown: 0.7)

### Input/Output from contracts/underwrite/inputs.ts & outputs.ts:
- `MotivationScoreInput` interface
- `MotivationScoreOutput` interface with breakdown

### Constants from contracts/underwrite/constants.ts:
- `MOTIVATION_LOW_MIN` = 0
- `MOTIVATION_MEDIUM_MIN` = 40
- `MOTIVATION_HIGH_MIN` = 65
- `MOTIVATION_CRITICAL_MIN` = 85

## Task:
Create `computeMotivationScore` engine function that uses these existing contracts types.
