# Changes Log - Slice 16: Foreclosure Timeline Visualization

## Generated
2026-01-10

## Summary
Created the second visualization component for Phase 4 - a horizontal timeline
showing FL foreclosure stages with animated progress, current position indicator,
days until sale countdown, and FL statute references.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| ForeclosureTimelineViz.tsx | visualizations/ | Main timeline component |

## Files Modified

| File | Changes |
|------|---------|
| index.ts | Added ForeclosureTimelineViz export |

## Features

### Timeline Stages (7 total)
Uses `TimelinePosition` type from contracts:

| Stage ID | Label | Statute | Short |
|----------|-------|---------|-------|
| not_in_foreclosure | Not in Foreclosure | - | OK |
| pre_foreclosure | Pre-Foreclosure | FL 702.10(1) | Pre |
| lis_pendens | Lis Pendens Filed | FL 702.10(2) | LP |
| judgment | Judgment Entered | FL 45.031 | Judg |
| sale_scheduled | Sale Scheduled | FL 45.031(1) | Sale |
| redemption_period | Redemption Period | FL 45.0315 | Redm |
| reo_bank_owned | REO Bank Owned | - | REO |

### Visual Elements
- Horizontal track with progress fill
- Stage markers (circles with check/number/home icon)
- Short labels + statute references under markers
- Current stage detail section at bottom
- Days until sale badge in header

### Animation
- Progress bar: scaleX animation (0.5s ease-out)
- Current marker: pulse animation (1.5s infinite easeInOut)
- Respects prefers-reduced-motion via useMotion hook

### Urgency Colors
| Level | Fill | Badge Background |
|-------|------|------------------|
| none | emerald-500 | emerald-500/20 |
| low | slate-500 | slate-500/20 |
| medium | blue-500 | blue-500/20 |
| high | amber-500 | amber-500/20 |
| critical | red-500 | red-500/20 |

### Accessibility (WCAG AA)
- role="progressbar" on container
- aria-valuenow (current stage index + 1)
- aria-valuemin={1}
- aria-valuemax={totalStages} (7)
- aria-label with descriptive text including stage name and position
- aria-hidden on all decorative elements:
  - Background track
  - Progress fill
  - Icon elements (AlertTriangle, Clock, CheckCircle2, Home)
- Reduced motion support via useMotion hook

### Defensive Programming
- NaN/null guard for daysUntilSale
- Fallback for unknown timeline position
- Fallback for unknown urgency level
- Safe index calculation (defaults to 0 if not found)
- Prefers output.statute_reference, falls back to stage definition

## Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| framer-motion | npm | Animation (motion.div) |
| lucide-react | npm | Icons (AlertTriangle, Clock, CheckCircle2, Home) |
| useMotion | @/components/underwrite/utils | Reduced motion detection |
| ForeclosureTimelineOutput | @/lib/engine | Type definition |
| TimelinePosition | @hps-internal/contracts | Stage type enum |
| UrgencyLevel | @hps-internal/contracts | Urgency type enum |
| cn | @/components/underwrite/utils | Class name utility |
| card, colors, typography | @/components/underwrite/utils | Design tokens |

## Type Integration
The component receives `ForeclosureTimelineOutput` from the engine which contains:
- `timeline_position: TimelinePosition` - Current stage in process
- `days_until_estimated_sale: number | null` - Days to auction
- `urgency_level: UrgencyLevel` - Urgency classification
- `statute_reference: string | null` - FL statute for current stage
- `auction_date_source: AuctionDateSource` - 'confirmed' | 'estimated' | 'unknown'
- `key_dates: ForeclosureKeyDates` - All relevant dates
