# SLICE 19 — Deals List (Cards) — Review Manifest

## Overview

Transform the `/deals` page from table-based to responsive card-based layout with verdict theming, URL-synced filtering, and pipeline summary.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `lib/constants/verdictThemes.ts` | 99 | Verdict theming (PURSUE, NEEDS_EVIDENCE, PASS, PENDING) |
| `lib/hooks/useDealsFilter.ts` | 326 | URL-synced filter state management |
| `components/deals/DealCard.tsx` | 236 | Individual deal card with verdict accent |
| `components/deals/DealsList.tsx` | 144 | Responsive grid (1-4 columns) |
| `components/deals/DealsFilter.tsx` | 169 | Filter controls (verdict, date, status, sort) |
| `components/deals/PipelineSummary.tsx` | 110 | Pipeline counts by verdict type |
| `components/deals/EmptyDeals.tsx` | 96 | Empty state with illustrations |
| `components/deals/index.ts` | 26 | Barrel exports |
| `tests/dealsList.test.ts` | ~800 | 122 test assertions |

## Files Modified

| File | Changes |
|------|---------|
| `app/(app)/deals/page.tsx` | Complete rewrite: table → card layout |

## Key Features

### 1. Verdict Theming (`verdictThemes.ts`)
- Four verdict states: PURSUE, NEEDS_EVIDENCE, PASS, PENDING
- Card-specific styling: left border, background tint, chip styles
- `getVerdictTheme()` and `normalizeVerdict()` helpers

### 2. Filter System (`useDealsFilter.ts`)
- URL state sync via `useSearchParams`
- Filters: verdict, date range, status, sort order, search
- `filterDeals()` for applying filters
- `getPipelineCounts()` for summary stats

### 3. Card Components
- **DealCard**: Verdict-themed card with metrics (Net, ZOPA, Gates)
- **DealsList**: Responsive grid with loading skeleton
- **DealsFilter**: Search + 4 filter dropdowns
- **PipelineSummary**: Colored dots with counts
- **EmptyDeals**: Context-aware empty state

### 4. Accessibility (WCAG AAA)
- All touch targets ≥ 44px
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators (3px ring)

## Verification

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript | ✅ Pass | `pnpm -w typecheck` |
| Build | ✅ Pass | `pnpm -w build` |
| Tests | ⚠️ Ready | 122 assertions (jsdom not installed) |

## Design Tokens Used

- **Colors**: emerald-500 (PURSUE), amber-500 (NEEDS), zinc-500 (PASS/PENDING)
- **Spacing**: 4px grid (p-4, gap-4, gap-6)
- **Border Radius**: rounded-lg, rounded-md
- **Shadows**: None (glass morphism style)
- **Animation**: 200-300ms, ease [0, 0, 0.2, 1]

## Grid Breakpoints

| Breakpoint | Columns | Width |
|------------|---------|-------|
| Default | 1 | < 640px |
| sm | 2 | ≥ 640px |
| lg | 3 | ≥ 1024px |
| xl | 4 | ≥ 1280px |

## Dependencies

- `framer-motion` (animations)
- `next/navigation` (URL state)
- `lucide-react` (icons)

## Known Limitations

1. Status filter assumes all deals are "active" (DbDeal lacks `archived_at`)
2. Test runner requires `jsdom` package to be installed
3. Gates data assumes 8 total gates

## Review Checklist

- [ ] Verdict colors match design system
- [ ] Cards responsive at all breakpoints
- [ ] Filters sync with URL correctly
- [ ] Empty states display appropriately
- [ ] Touch targets meet 44px minimum
- [ ] Animations respect prefers-reduced-motion
