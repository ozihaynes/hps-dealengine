# BEFORE STATE - Slice 08: Compute Foreclosure Timeline
Generated: 2026-01-10

## Existing engine files:
- computeMotivationScore.ts
- computeMotivationScore.test.ts
- index.ts
- portfolio-utils.ts

## Current engine barrel exports:
- computeMotivationScore
- REASON_SCORES
- TIMELINE_MULTIPLIERS
- DECISION_MAKER_FACTORS
- DEFAULT_BASE_SCORE
- DISTRESS_BONUS
- MAX_FORECLOSURE_BOOST
- deriveVerdict
- computeMetrics
- groupByVerdict
- formatCurrency
- formatPercent
- formatTimeAgo
- clampScore
- extractNumber
- DEFAULT_METRICS

## Contracts foreclosure types (already exist):
- ForeclosureStatus (7 values: none, pre_foreclosure, lis_pendens_filed, judgment_entered, sale_scheduled, post_sale_redemption, reo_bank_owned)
- FL_TIMELINE_STAGES (basic structure in contracts)
- TimelinePosition (7 values)
- UrgencyLevel (5 values: none, low, medium, high, critical)

## Notes:
- ForeclosureStatus does NOT include 'unknown' - will handle as extended type locally
- FL_TIMELINE_STAGES in contracts has different structure than what slice 08 needs
- Will create engine-specific constants with additional fields (position, urgency, description, etc.)
