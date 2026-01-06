# SLICE 21 — Loading & Empty States — Review

**Date:** 2026-01-05
**Status:** Complete
**Verification:** Typecheck + Build Pass

---

## Summary

Comprehensive loading skeletons and empty state components for HPS DealEngine dashboard. All components support reduced motion, multiple variants, and accessible markup.

---

## Files Created/Modified

### Loading Components (`components/loading/`)

| File | Lines | Purpose |
|------|-------|---------|
| `ShimmerEffect.tsx` | 221 | Base shimmer + 5 presets |
| `CardSkeleton.tsx` | 230 | DealCard skeleton + variants |
| `ListSkeleton.tsx` | 249 | Staggered list skeletons |
| `DashboardSkeleton.tsx` | 373 | Full dashboard skeleton |
| `index.ts` | 69 | Barrel exports |

### Empty State Components (`components/empty/`)

| File | Lines | Purpose |
|------|-------|---------|
| `EmptyState.tsx` | 332 | Base component (4 variants) |
| `EmptyAnalysis.tsx` | 189 | No analysis state + variants |
| `EmptyComps.tsx` | 258 | No comps state + variants |
| `ErrorState.tsx` | 447 | Error display + presets |
| `index.ts` | 64 | Barrel exports |

### Tests

| File | Assertions | Coverage |
|------|------------|----------|
| `tests/loadingStates.test.ts` | 35+ | All exported components |

---

## Components Inventory

### Loading (18 components)

**ShimmerEffect.tsx:**
- `ShimmerEffect` - Base shimmer animation
- `ShimmerText` - Single line skeleton
- `ShimmerHeading` - Heading skeleton
- `ShimmerAvatar` - Circular avatar
- `ShimmerButton` - Button skeleton
- `ShimmerBadge` - Badge/chip skeleton

**CardSkeleton.tsx:**
- `CardSkeleton` - Generic card (3 variants)
- `DealCardSkeleton` - Alias for CardSkeleton
- `MetricCardSkeleton` - Metric card
- `StatCardSkeleton` - Stat with icon

**ListSkeleton.tsx:**
- `ListSkeleton` - Generic list (grid/list layout)
- `DealsListSkeleton` - Deals page skeleton
- `MetricsGridSkeleton` - Metrics grid
- `TableRowsSkeleton` - Table rows
- `CompsListSkeleton` - Comparables list

**DashboardSkeleton.tsx:**
- `DashboardSkeleton` - Full dashboard (3 variants)
- `OverviewSkeleton` - Overview page
- `AnalysisSkeleton` - Analysis section
- `PageSkeleton` - Generic page

### Empty States (13 components)

**EmptyState.tsx:**
- `EmptyState` - Base component (default/compact/minimal/card)

**EmptyAnalysis.tsx:**
- `EmptyAnalysis` - No analysis run
- `EmptyDashboard` - Dashboard without data
- `EmptyVerdictPanel` - Verdict section empty
- `EmptyMetricsPanel` - Metrics section empty

**EmptyComps.tsx:**
- `EmptyComps` - No comps (4 reasons)
- `EmptyCompsList` - Inline comps empty
- `EmptyCompsCard` - Card placeholder
- `EmptyCompsMap` - Map view empty

**ErrorState.tsx:**
- `ErrorState` - Error with retry (4 variants, 3 severities)
- `NetworkError` - Connection error preset
- `NotFoundError` - 404 preset
- `PermissionError` - 403 preset

---

## Design Patterns Applied

### Animation
- GPU-accelerated (transform/opacity only)
- `ease: [0, 0, 0.2, 1] as const` for Framer Motion typing
- Staggered entrance with `staggerChildren`
- Reduced motion fallback via `prefersReducedMotion()`

### Accessibility
- `role="status"` for loading states
- `aria-busy="true"` during loading
- `aria-label` with descriptive text
- `role="alert"` for error states

### Component API
- Multiple variants per component
- Consistent props (className, testId)
- Action handlers (onRetry, onClick, href)
- Composable children support

---

## Verification Commands

```powershell
pnpm -w typecheck  # Pass
pnpm -w build      # Pass
pnpm -w test       # Tests pass
```

---

## Usage Examples

```tsx
// Loading skeleton
import { DashboardSkeleton, DealsListSkeleton } from '@/components/loading';

<DashboardSkeleton variant="compact" />
<DealsListSkeleton count={6} layout="grid" />

// Empty states
import { EmptyAnalysis, EmptyComps, ErrorState } from '@/components/empty';

<EmptyAnalysis onRunAnalysis={runAnalysis} />
<EmptyComps reason="no_matches" onAdjustFilters={openFilters} />
<ErrorState title="Failed to load" onRetry={refetch} />
```

---

## Checklist

- [x] ShimmerEffect with presets
- [x] CardSkeleton matching DealCard
- [x] ListSkeleton with stagger
- [x] DashboardSkeleton full layout
- [x] EmptyState base component
- [x] EmptyAnalysis with feature list
- [x] EmptyComps with 4 reasons
- [x] ErrorState with retry + severity
- [x] Barrel exports for both folders
- [x] Test file with 35+ assertions
- [x] Typecheck passes
- [x] Build passes
- [x] Reduced motion support
- [x] Accessible markup
