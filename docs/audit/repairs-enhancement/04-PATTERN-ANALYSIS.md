# Pattern Analysis

**Audit Date:** 2026-01-09
**Components Analyzed:** 18 components + 1 page

---

## Consistent Patterns (PRESERVE)

| Pattern | Components Using | Notes |
|---------|------------------|-------|
| `memo()` wrapper | All 18 components | Performance optimization |
| `designTokens` import | 14/18 components | Central token usage |
| `getCategoryColors()` | CategoryRow, CategorySubtotal, EnhancedLineItemRow, EnhancedBreakdownPanel | Category color coding |
| `statusColors` | StatusBadge, RepairVelocityCard, GCEstimateCard | Status color coding |
| `focus.className` | All interactive components | Consistent focus rings |
| `touchTargets.min` (44px) | Buttons, inputs | WCAG AA compliance |
| `tabular-nums` class | All financial displays | Aligned numbers |
| `AnimatePresence` | Expand/collapse sections | Framer Motion pattern |
| `role="button"` + `tabIndex` | Custom clickable divs | A11y compliance |
| `aria-expanded` | Expandable sections | Screen reader support |
| `aria-label` | Icon-only buttons | Descriptive labels |
| `aria-hidden="true"` | Decorative icons | Hide from screen readers |
| Template literal classNames | All components | Clean conditional styling |
| Callback + useCallback | All handlers | Memoized callbacks |
| `"use client"` directive | All components | Client-side rendering |

---

## Inconsistent Patterns (ENHANCE)

| Issue | Components Affected | Current State | Recommendation |
|-------|---------------------|---------------|----------------|
| Entry animations | BiddingCockpit, GCEstimatesPanel, GCEstimateCard, EnhancedRepairsSection | Missing or incomplete | Add consistent `initial={{ opacity: 0, y: 8 }}` |
| Modal animations | RequestEstimateModal, ManualUploadModal | No enter/exit | Add scale + opacity transition |
| Value update pulse | EstimateSummaryCard, RepairVelocityCard, RepairsSummary | Missing | Add `subtotalUpdate` animation token |
| List stagger | GCEstimatesPanel, EnhancedRepairsSection | No stagger | Add `staggerChildren: 0.05` |
| Reduced motion | Most components | Only CategorySubtotal checks | Add `useReducedMotion()` hook |
| Error states | BiddingCockpit, GCEstimatesPanel | Missing error display | Add error boundary pattern |
| Loading skeleton | Individual components | Some inline, some separate | Standardize on SkeletonCockpit pattern |
| Card elevation | Various cards | Inconsistent shadow | Standardize on `shadow-lg shadow-emerald-500/5` |
| Section headers | EnhancedRepairsSection vs RepairsSummary | Different styling | Unify text-sm uppercase pattern |

---

## Inconsistent Styling Details

### Border Opacity Inconsistency
```tsx
// Some use:
border border-slate-800

// Others use:
border border-slate-700

// And some inline:
border: `1px solid ${colors.border}30` // 30% opacity
```

**Recommendation:** Standardize on `border-slate-800` with `border-opacity-50` for emphasis.

### Background Opacity Inconsistency
```tsx
// Various patterns found:
bg-slate-900/80    // EstimateSummaryCard
bg-slate-900/60    // CategoryRow
bg-slate-900/40    // GCEstimatesPanel

// Direct rgba:
rgba(51, 65, 85, 0.5)  // ProgressBar trackColor
```

**Recommendation:** Standardize on `/80` for primary cards, `/60` for nested, `/40` for containers.

### Padding Patterns
```tsx
// Most use:
p-6     // 24px - Primary cards

// Some use:
p-4     // 16px - Nested elements
p-8     // 32px - Empty states
```

**Recommendation:** Current pattern is correct (p-6 primary, p-4 nested). Document in tokens.

---

## Missing Patterns (ADD)

| Pattern | Should Apply To | Priority | Implementation |
|---------|-----------------|----------|----------------|
| `prefers-reduced-motion` | All animated components | P0 | Add `useReducedMotion()` check |
| Error boundary | BiddingCockpit, GCEstimatesPanel | P0 | Add `<ErrorBoundary>` wrapper |
| Scroll region a11y | GCEstimatesPanel | P1 | Add `role="region"` + `aria-label` |
| Stagger animation | All list renders | P1 | Add `staggerChildren` variant |
| Value update glow | Financial totals | P2 | Add subtle border glow on change |
| Skeleton gradient | SkeletonCockpit | P2 | Add gradient shimmer effect |
| Modal backdrop blur | Both modals | P2 | Add `backdrop-blur-md` |
| Success toast | After modal actions | P2 | Add toast notification pattern |

---

## Animation Token Usage

### Currently Defined (in designTokens.ts)
```typescript
animations: {
  subtotalUpdate: { /* pulse effect */ },
  categoryExpand: { /* height + opacity */ },
  fadeIn: { /* opacity + y transform */ },
  cardHover: { /* y lift + scale tap */ },
}
```

### Components Using Each

| Token | Used By |
|-------|---------|
| `subtotalUpdate` | CategorySubtotal only |
| `categoryExpand` | Not directly used (inline AnimatePresence) |
| `fadeIn` | Not directly used (inline) |
| `cardHover` | Not directly used (inline Tailwind) |

**Recommendation:** Refactor components to use tokens directly instead of inline definitions.

---

## Color Token Usage

### Category Colors (13 defined, all used)
- demolition, roofing, exterior, windowsDoors
- foundation, plumbing, electrical, hvac
- interior, flooring, kitchen, bathrooms
- permits

### Status Colors (6 defined, all used)
- pending (amber)
- sent (blue)
- viewed (purple)
- submitted (emerald)
- expired (red)
- cancelled (gray)

### Semantic Colors (consistent usage)
- `emerald-400/500` - Success, primary actions, totals
- `amber-400/500` - Warnings, manual override, contingency
- `red-400/500` - Errors, destructive
- `blue-400/500` - Info, upload actions
- `slate-*` - Backgrounds, borders, secondary text

---

## Typography Patterns

### Consistent
| Element | Classes | Usage |
|---------|---------|-------|
| Section title | `text-sm font-semibold uppercase tracking-wider text-slate-300` | Section headers |
| Financial value | `tabular-nums font-bold` | Totals |
| Secondary text | `text-sm text-slate-400` | Descriptions |
| Helper text | `text-xs text-slate-500` | Footnotes |

### Inconsistent
| Element | Variations Found |
|---------|------------------|
| Card titles | `text-lg font-semibold` vs `text-sm uppercase` |
| Form labels | `text-sm text-slate-400` vs `text-sm font-medium text-slate-300` |

**Recommendation:** Standardize form labels on `text-sm font-medium text-slate-300`.

---

## Accessibility Patterns

### Excellent (5/5)
- Touch targets: All meet 44px minimum
- Focus indicators: Consistent emerald ring
- ARIA labels: Comprehensive on interactive elements
- Keyboard navigation: Enter/Space handlers on custom buttons

### Good (4/5)
- Screen reader: Most statuses announced
- Reduced motion: Only CategorySubtotal checks

### Needs Improvement (3/5)
- Scroll regions: GCEstimatesPanel missing role
- Error announcements: No aria-live regions
- Modal focus trap: Works but could use focus-trap-react

---

## Component API Consistency

### Consistent Props
```typescript
// All components accept:
className?: string;
isDemoMode?: boolean;

// Interactive components:
disabled?: boolean;
onClick?: () => void;
onClose?: () => void;

// Form components:
value: T;
onChange: (value: T) => void;
```

### Inconsistent Props
```typescript
// Loading state naming:
isLoading      // BiddingCockpit
isExporting    // RepairsSummary
isExportingPdf // EnhancedRepairsSection

// Callback naming:
onUpdate       // EnhancedLineItemRow
onLineItemUpdate // EnhancedRepairsSection
onCostChange   // RepairsTab (legacy)
```

**Recommendation:** Standardize on `isLoading` and `onUpdate`.

---

## Summary of Patterns

### Keep As-Is (Excellent)
1. Token-based color system
2. Focus indicator pattern
3. Touch target sizing
4. ARIA label coverage
5. Expand/collapse animation

### Enhance (Good → Excellent)
1. Add reduced motion checks everywhere
2. Standardize entry animations
3. Add value update animations
4. Implement stagger on lists
5. Add modal animations

### Add (Missing)
1. Error boundary pattern
2. Scroll region accessibility
3. Toast notification system
4. Gradient skeleton shimmer
