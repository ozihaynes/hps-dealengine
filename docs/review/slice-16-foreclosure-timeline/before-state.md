# BEFORE STATE - Slice 16: Foreclosure Timeline Visualization
Generated: 2026-01-10

## Current visualizations folder:
- MotivationScoreGauge.tsx (from Slice 15)
- index.ts (barrel export)

## Current visualizations exports:
```typescript
export { MotivationScoreGauge } from './MotivationScoreGauge';
export type { MotivationScoreGaugeProps } from './MotivationScoreGauge';
```

## ForeclosureTimelineOutput Interface (from engine):
```typescript
export interface ForeclosureTimelineOutput {
  timeline_position: TimelinePosition;
  days_until_estimated_sale: number | null;
  urgency_level: UrgencyLevel;
  seller_motivation_boost: number;
  statute_reference: string | null;
  auction_date_source: AuctionDateSource;
  key_dates: ForeclosureKeyDates;
}
```

## TimelinePosition enum (from contracts):
```typescript
type TimelinePosition =
  | 'not_in_foreclosure'
  | 'pre_foreclosure'
  | 'lis_pendens'
  | 'judgment'
  | 'sale_scheduled'
  | 'redemption_period'
  | 'reo_bank_owned';
```

## UrgencyLevel enum:
```typescript
type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
```

## FL Statute References:
- FL 702.10(1): Pre-Foreclosure notice requirements
- FL 702.10(2): Lis Pendens filing requirements
- FL 45.031: Final judgment procedure
- FL 45.031(1): Sale notice requirements
- FL 45.0315: Right of redemption (10 days post-sale)
