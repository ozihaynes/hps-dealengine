# Changes Log - Slice 05: Decision Hero Integration

## Generated
2026-01-10

## Summary
Created DecisionHero integration wrapper with placeholder state and live update support via analyzeBus.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| HeroPlaceholder.tsx | components/underwrite/hero/ | Pre-analysis placeholder |
| UnderwriteHero.tsx | components/underwrite/hero/ | Main wrapper component |
| index.ts | components/underwrite/hero/ | Barrel export |

## Files Modified

| File | Change |
|------|--------|
| components/underwrite/index.ts | Added `export * from './hero'` |

## Component Architecture
```
UnderwriteHero (wrapper)
├── HeroPlaceholder (shown when !hasAnalysisData)
│   ├── Calculator icon
│   ├── "Ready to Analyze" title
│   ├── Description text
│   └── Loading dots (animated, respects reduced motion)
│
└── DecisionHero (imported from dashboard/hero)
    ├── VerdictReveal
    ├── KeyMetricsTrio
    └── PrimaryActionCTA
```

## Key Design Decision: Composition over Duplication

**CRITICAL**: This slice IMPORTS the existing DecisionHero, it does NOT duplicate it.

```typescript
// UnderwriteHero.tsx
import { DecisionHero } from '@/components/dashboard/hero/DecisionHero';

// ...

<DecisionHero
  verdict={verdict}
  priceGeometry={priceGeometry}
  netClearance={netClearance}
  riskSummary={riskSummary}
  onPrimaryAction={onPrimaryAction}
  onSecondaryAction={onSecondaryAction}
  showConfidence={showConfidence}
  showRationale={showRationale}
  compact={compact}
/>
```

## State Management

- Uses `useState` for analyze result
- Initializes from `initialResult` prop OR `getLastAnalyzeResult()`
- Subscribes to `subscribeAnalyzeResult` for live updates
- `isDemoMode` prop disables live updates for testing

## Data Extraction

```typescript
function extractOutputs(result: AnalyzeResult | null | undefined) {
  return {
    verdict: outputs.verdict ?? null,
    priceGeometry: outputs.price_geometry ?? null,
    netClearance: outputs.net_clearance ?? null,
    // Use risk_gates_enhanced for EnhancedRiskSummary type
    riskSummary: outputs.risk_gates_enhanced ?? null,
  };
}
```

## Accessibility Features

- HeroPlaceholder: `role="status"`, `aria-live="polite"`, `aria-label`
- DecisionHero: inherits full ARIA support from original component
- Reduced motion support via `useMotion` hook
- AnimatePresence for smooth transitions

## Design Tokens Used

From Slice 03:
- `card.base` - Glassmorphic card styling for placeholder
- `useMotion()` - Reduced motion support
- `getDurationSeconds()` - Animation timing
