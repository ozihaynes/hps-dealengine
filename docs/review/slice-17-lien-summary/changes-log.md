# Changes Log - Slice 17: Lien Risk Summary

## Generated
2026-01-10

## Summary
Created the third and final visualization component for Phase 4 - a lien risk
summary card showing total exposure, stacked bar by category, blocking
threshold indicator, and FL joint liability warnings.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| LienRiskSummary.tsx | visualizations/ | Main summary component |

## Files Modified

| File | Changes |
|------|---------|
| index.ts | Added LienRiskSummary export |

## Features

### Visual Elements
- Total liens amount (large, prominent)
- Risk level badge (low/medium/high/critical)
- Stacked horizontal bar by category
- Category legend with amounts
- $10K blocking threshold line

### Categories (4 total)
| Category | Color | Label |
|----------|-------|-------|
| hoa | purple-500 | HOA |
| cdd | blue-500 | CDD |
| property_tax | amber-500 | Tax |
| municipal | red-500 | Municipal |

### Risk Level Styling
| Level | Background | Text |
|-------|------------|------|
| low | emerald-500/20 | emerald-400 |
| medium | blue-500/20 | blue-400 |
| high | amber-500/20 | amber-400 |
| critical | red-500/20 | red-400 |

### Warnings
- FL 720.3085 Joint Liability (amber alert)
- Blocking Gate Triggered (red alert)
- Evidence needed list (if available)

### Animation
- Stacked bar segments: width animation (0.5s)
- Staggered delay per segment (0.1s)
- Respects prefers-reduced-motion

### Accessibility (WCAG AA)
- role="region" on container (2 instances)
- aria-label with summary text (2 instances)
- role="alert" on warning sections (2 instances)
- aria-hidden on all decorative icons (8 instances)
- Color not sole indicator (text labels)
- Reduced motion support (isReduced - 3 usages)

### Defensive Programming
- NaN/Infinity guard for total
- Fallback for unknown risk level
- Safe category value extraction with Number.isFinite()
- Division by zero guard for bar widths
- Empty state handling when output is null
- Consistent category order via CATEGORY_ORDER array

## Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| framer-motion | npm | Animation |
| lucide-react | npm | Icons (DollarSign, AlertTriangle, Shield) |
| useMotion | @/components/underwrite/utils | Reduced motion |
| LienRiskOutput | @/lib/engine | Type definition |
| LienRiskLevel | @/lib/engine | Risk level type |
| LienBreakdown | @/lib/engine | Breakdown type |
| LIEN_BLOCKING_THRESHOLD | @/lib/engine | $10,000 constant |
| cn | @/components/underwrite/utils | Class names |
| card, colors, typography | @/components/underwrite/utils | Design tokens |
