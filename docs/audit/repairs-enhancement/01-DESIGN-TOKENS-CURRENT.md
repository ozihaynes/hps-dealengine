# Design Tokens Current State

**File:** `apps/hps-dealengine/components/repairs/designTokens.ts`
**Lines:** 269
**Last Updated:** 2026-01-09

---

## Principles Documented in File
- 8pt Grid System (spacing)
- WCAG AA Compliance (contrast, touch targets)
- Consistent Category Color Coding (13 distinct colors)
- Framer Motion Standards (150-300ms durations)

---

## 1. Spacing Tokens (8pt Grid)

| Token | Value | Grid Units | Usage |
|-------|-------|------------|-------|
| `xs` | 4px | 0.5 | Tight internal spacing |
| `sm` | 8px | 1 | Standard small gap |
| `md` | 16px | 2 | Standard spacing |
| `lg` | 24px | 3 | Section spacing |
| `xl` | 32px | 4 | Large gaps |
| `2xl` | 48px | 6 | Major section breaks |

### Gaps Identified
- **Missing:** `3xl` (64px / 8 units) for page-level margins
- **Missing:** `0` token for zero spacing
- **Missing:** Responsive spacing variants

---

## 2. Category Colors (13 Categories)

Each category has 4 color properties:
- `bg` — 10% opacity background
- `border` — Full saturation border
- `text` — Light tint for text
- `accent` — Darker shade for emphasis

| Category | BG (rgba) | Border | Text | Accent |
|----------|-----------|--------|------|--------|
| `demolition` | rgba(239,68,68,0.1) | #ef4444 | #fca5a5 | #dc2626 |
| `roofing` | rgba(249,115,22,0.1) | #f97316 | #fdba74 | #ea580c |
| `exterior` | rgba(234,179,8,0.1) | #eab308 | #fde047 | #ca8a04 |
| `windowsDoors` | rgba(132,204,22,0.1) | #84cc16 | #bef264 | #65a30d |
| `foundation` | rgba(34,197,94,0.1) | #22c55e | #86efac | #16a34a |
| `plumbing` | rgba(20,184,166,0.1) | #14b8a6 | #5eead4 | #0d9488 |
| `electrical` | rgba(6,182,212,0.1) | #06b6d4 | #67e8f9 | #0891b2 |
| `hvac` | rgba(59,130,246,0.1) | #3b82f6 | #93c5fd | #2563eb |
| `interior` | rgba(99,102,241,0.1) | #6366f1 | #a5b4fc | #4f46e5 |
| `flooring` | rgba(139,92,246,0.1) | #8b5cf6 | #c4b5fd | #7c3aed |
| `kitchen` | rgba(168,85,247,0.1) | #a855f7 | #d8b4fe | #9333ea |
| `bathrooms` | rgba(236,72,153,0.1) | #ec4899 | #f9a8d4 | #db2777 |
| `permits` | rgba(107,114,128,0.1) | #6b7280 | #d1d5db | #4b5563 |

### Helper Function
```typescript
getCategoryColors(categoryKey: string) // Returns colors with fallback to permits
```

### Gaps Identified
- **Missing:** `general`/`miscellaneous` category
- **Missing:** Category icon mapping
- **Missing:** Dark mode variants (currently optimized for dark only)

---

## 3. Typography Tokens

| Token | Font Size | Weight | Line Height | Special |
|-------|-----------|--------|-------------|---------|
| `sectionTitle` | 14px | 600 | 1.4 | letter-spacing: 0.025em |
| `subtotal` | 16px | 700 | 1.2 | tabular-nums |
| `lineItemLabel` | 14px | 400 | 1.5 | — |
| `currency` | 14px | 500 | — | tabular-nums |
| `grandTotal` | 24px | 700 | 1.2 | tabular-nums |

### Gaps Identified
- **Missing:** Body text token
- **Missing:** Caption/helper text token
- **Missing:** Heading hierarchy (h1-h6)
- **Missing:** Error text token
- **Missing:** Responsive font scaling

---

## 4. Animation Tokens (Framer Motion)

| Animation | Duration | Easing | Purpose |
|-----------|----------|--------|---------|
| `subtotalUpdate` | 200ms | easeOut | Pulse effect [1, 1.05, 1] |
| `categoryExpand` | 150ms | easeOut | Height/opacity toggle |
| `fadeIn` | 200ms | easeOut | Enter animation (y: 8 → 0) |
| `cardHover` | 150ms | — | Lift effect (y: -2) + scale 0.98 on tap |

### Animation Variants Structure
```typescript
{
  initial: { ... },
  animate: { ... },
  exit: { ... },      // for categoryExpand
  transition: { ... },
  whileHover: { ... }, // for cardHover
  whileTap: { ... },   // for cardHover
}
```

### Gaps Identified
- **Missing:** Stagger delay token for lists
- **Missing:** Reduced motion alternatives
- **Missing:** Loading/skeleton animation
- **Missing:** Success/error feedback animations
- **Missing:** Modal enter/exit animations

---

## 5. Touch Target Tokens (WCAG AA)

| Token | Value | Usage |
|-------|-------|-------|
| `min` | 44px | WCAG minimum |
| `comfortable` | 48px | Recommended |

### Gaps Identified
- **Good:** Meets WCAG AA requirements
- **Missing:** Large touch target option (56px)

---

## 6. Focus Tokens (WCAG AA)

| Property | Value |
|----------|-------|
| `ring` | 2px solid #10b981 (emerald-500) |
| `offset` | 2px |
| `className` | `focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900` |

### Gaps Identified
- **Good:** WCAG compliant
- **Missing:** Focus-visible variant (keyboard only)
- **Missing:** Error focus state (red ring)

---

## 7. Card Tokens (Glassmorphic)

| Property | Value |
|----------|-------|
| `base` | `bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl` |
| `hover` | `hover:border-slate-700 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200` |
| `padding` | `p-6` |

### Gaps Identified
- **Missing:** Card variants (elevated, outlined, filled)
- **Missing:** Card sizes (sm, md, lg)
- **Missing:** Active/selected state
- **Missing:** Error state card

---

## 8. Status Colors (Estimate Requests)

| Status | BG (rgba) | Border | Text |
|--------|-----------|--------|------|
| `pending` | rgba(251,191,36,0.1) | #fbbf24 | #fde047 |
| `sent` | rgba(59,130,246,0.1) | #3b82f6 | #93c5fd |
| `viewed` | rgba(168,85,247,0.1) | #a855f7 | #d8b4fe |
| `submitted` | rgba(34,197,94,0.1) | #22c55e | #86efac |
| `expired` | rgba(239,68,68,0.1) | #ef4444 | #fca5a5 |
| `cancelled` | rgba(107,114,128,0.1) | #6b7280 | #9ca3af |

### Gaps Identified
- **Good:** Comprehensive status coverage
- **Missing:** Icon mapping for statuses
- **Missing:** Animation/pulse for active states

---

## Summary of Gaps

### High Priority (P0)
1. Missing reduced motion support in animations
2. Missing error state tokens (focus, card)
3. Missing stagger animation for lists

### Medium Priority (P1)
1. Missing responsive spacing variants
2. Missing typography hierarchy (headings)
3. Missing card variants (size, state)
4. Missing skeleton/loading animation tokens

### Low Priority (P2)
1. Missing `3xl` spacing (64px)
2. Missing icon mappings for categories/statuses
3. Missing light mode variants

---

## Hardcoded Values to Tokenize

During component audit, watch for these patterns:
- Raw pixel values (e.g., `p-4` instead of `spacing.md`)
- Hardcoded hex colors
- Inline transition durations
- Magic number spacing (e.g., `gap-3` instead of token)

---

## Types Documentation (from types.ts)

### Exported Types (MUST PRESERVE)

```typescript
// Re-exported from StatusBadge
type EstimateStatus = 'pending' | 'sent' | 'viewed' | 'submitted' | 'expired' | 'cancelled';

// Line Item
interface LineItem {
  id: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  total: number;
}

// Category
interface CategoryBreakdown {
  id: string;
  name: string;
  subtotal: number;
  itemCount: number;
  items?: LineItem[];
}

// Estimate Request
interface EstimateRequest {
  id: string;
  gc_name: string;
  gc_email?: string;
  status: EstimateStatus;
  submitted_at?: string;
  sent_at?: string;
  file_path?: string;
}

// Estimate Data
interface EstimateData {
  baseEstimate: number;
  contingency: number;
  contingencyPercent: number;
  totalBudget: number;
  categories: CategoryBreakdown[];
  lastUpdated?: string;
}

// Velocity Counts
interface VelocityCounts {
  pending: number;
  sent: number;
  viewed: number;
  submitted: number;
  total: number;
}
```

### Type Safety Notes
- All numeric values are `number` type (not strings)
- Optional fields use `?` consistently
- Status uses union type (exhaustive)
- Arrays are properly typed (`LineItem[]`, `CategoryBreakdown[]`)
