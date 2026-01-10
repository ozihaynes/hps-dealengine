# Changes Log - Slice 08: Compute Foreclosure Timeline

## Generated
2026-01-10

## Summary
Created the second engine function for calculating foreclosure timeline position,
urgency level, and motivation boost. Includes FL statute references for compliance.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| computeForeclosureTimeline.ts | lib/engine/ | Main engine function |
| computeForeclosureTimeline.test.ts | lib/engine/ | Unit tests (59 tests) |

## Files Modified

| File | Change |
|------|--------|
| lib/engine/index.ts | Added foreclosure timeline exports |

## FL Foreclosure Stages

| Status | Position | Typical Days | FL Statute | Urgency |
|--------|----------|--------------|------------|---------|
| none | not_in_foreclosure | null | null | none |
| pre_foreclosure | pre_foreclosure | 90 | FL 702.10 | medium |
| lis_pendens_filed | lis_pendens | 180 | FL 702.10(1) | high |
| judgment_entered | judgment | 45 | FL 702.10(5) | high |
| sale_scheduled | sale_scheduled | 30 | FL 45.031(1) | critical |
| post_sale_redemption | redemption_period | 10 | FL 45.0315 | critical |
| reo_bank_owned | reo_bank_owned | null | null | none |
| unknown | pre_foreclosure | null | null | medium |

## Urgency Thresholds

- CRITICAL: <= 30 days
- HIGH: 31-60 days
- MEDIUM: 61-120 days
- LOW: > 120 days

## Motivation Boost

| Urgency | Boost |
|---------|-------|
| critical | +25 |
| high | +15 |
| medium | +10 |
| low | +5 |
| none | 0 |

## Key Features

- Pure function with injectable referenceDate for testing
- Tracks auction_date_source (confirmed/estimated/unknown)
- Returns FL statute references for compliance
- Calculates estimated days from current stage
- Handles past auction dates (negative days)
- Handles null dates, invalid strings gracefully
- Uses existing ForeclosureStatus/TimelinePosition/UrgencyLevel from contracts
- Adds ForeclosureStatusExtended locally to support 'unknown' status

## Integration Notes

- Imports TimelinePosition, UrgencyLevel, ForeclosureStatus from @hps-internal/contracts
- Creates ForeclosureStatusExtended locally (adds 'unknown')
- Uses contracts' TimelinePosition values (redemption_period, reo_bank_owned)
- FL_FORECLOSURE_STAGES is local constant (different structure from contracts' FL_TIMELINE_STAGES)
