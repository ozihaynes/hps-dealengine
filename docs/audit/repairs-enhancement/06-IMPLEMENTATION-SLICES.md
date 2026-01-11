# Implementation Slices

**Created:** 2026-01-09
**Total Slices:** 6
**Estimated Total:** ~2-3 days of work
**Risk Level:** All Low (styling/animation only)

---

## Slice H: Foundation — Token Additions + Reduced Motion

### Risk: Low
### Dependencies: None

### Files to Modify
1. `designTokens.ts` (additive only)

### Changes

#### 1. Add Motion Variants Token
```typescript
// Add to designTokens.ts

export const motionVariants = {
  // Page section enter
  section: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: [0, 0, 0.2, 1] },
  },
  // Card enter
  card: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
  },
  // Item enter (for staggered lists)
  item: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.15, ease: [0, 0, 0.2, 1] },
  },
  // Modal enter
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
    },
  },
  // Stagger container
  stagger: {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
    item: {
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0 },
    },
  },
};

// Helper hook for reduced motion
export function useMotion() {
  const prefersReducedMotion = useReducedMotion();
  return {
    // Returns empty variants if user prefers reduced motion
    getVariant: <T extends Record<string, unknown>>(variant: T): T | {} =>
      prefersReducedMotion ? {} : variant,
    // Returns 0 duration if reduced motion
    getDuration: (duration: number) => (prefersReducedMotion ? 0 : duration),
  };
}
```

#### 2. Add Hero Typography Token
```typescript
// Enhance typography section
typography: {
  // ... existing
  hero: {
    fontSize: '36px',
    fontWeight: 700,
    lineHeight: 1.1,
    fontFeatureSettings: "'tnum' on, 'lnum' on",
  },
},
```

#### 3. Add Glow Effect Token
```typescript
export const glowEffects = {
  emerald: {
    sm: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    md: 'shadow-[0_0_16px_rgba(16,185,129,0.4)]',
    lg: 'shadow-[0_0_24px_rgba(16,185,129,0.5)]',
    pulse: {
      keyframes: {
        '0%, 100%': { boxShadow: '0 0 8px rgba(16,185,129,0.3)' },
        '50%': { boxShadow: '0 0 16px rgba(16,185,129,0.5)' },
      },
      animation: 'glow-pulse 2s ease-in-out infinite',
    },
  },
};
```

### Verification
```powershell
pnpm -w typecheck
pnpm -w test
pnpm -w build
```

### Acceptance Criteria
- [ ] New tokens added without breaking existing imports
- [ ] useReducedMotion hook available
- [ ] No TypeScript errors
- [ ] Existing tests pass

---

## Slice I: Hero Polish — Budget Prominence + Glow

### Risk: Low
### Dependencies: Slice H (tokens)

### Files to Modify
1. `EstimateSummaryCard.tsx`
2. `RepairsSummary.tsx`

### Changes

#### EstimateSummaryCard.tsx
```tsx
// Import new tokens
import { glowEffects, motionVariants } from './designTokens';
import { useReducedMotion } from 'framer-motion';

// Add reduced motion check
const prefersReducedMotion = useReducedMotion();

// Enhance total display
<motion.div
  className={`
    text-3xl tabular-nums font-bold text-emerald-400
    ${glowEffects.emerald.md}
  `}
  animate={
    prefersReducedMotion
      ? {}
      : {
          textShadow: [
            '0 0 8px rgba(16,185,129,0.3)',
            '0 0 12px rgba(16,185,129,0.5)',
            '0 0 8px rgba(16,185,129,0.3)',
          ],
        }
  }
  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
>
  {formatCurrency(totalBudget)}
</motion.div>
```

#### Add Value Pulse Effect
```tsx
// Add state for pulse animation
const [prevTotal, setPrevTotal] = useState(totalBudget);
const [shouldPulse, setShouldPulse] = useState(false);

useEffect(() => {
  if (totalBudget !== prevTotal && totalBudget > 0) {
    setShouldPulse(true);
    setPrevTotal(totalBudget);
    const timer = setTimeout(() => setShouldPulse(false), 400);
    return () => clearTimeout(timer);
  }
}, [totalBudget, prevTotal]);

<motion.div
  animate={
    shouldPulse && !prefersReducedMotion
      ? { scale: [1, 1.03, 1] }
      : {}
  }
  transition={{ duration: 0.3 }}
>
  {/* Total display */}
</motion.div>
```

### Verification
```powershell
pnpm -w typecheck
pnpm -w test
# Visual check: Total should glow and pulse on change
```

### Acceptance Criteria
- [ ] Total has subtle glow effect
- [ ] Pulse animation on value change
- [ ] No animation if prefers-reduced-motion
- [ ] No functional changes

---

## Slice J: Modal Animations

### Risk: Low
### Dependencies: Slice H (tokens)

### Files to Modify
1. `RequestEstimateModal.tsx`
2. `ManualUploadModal.tsx`

### Changes

#### Both Modals
```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { motionVariants } from './designTokens';

// Wrap entire return in AnimatePresence
<AnimatePresence>
  {isOpen && (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      {...motionVariants.modal.overlay}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden"
        {...motionVariants.modal.content}
        role="dialog"
        aria-modal="true"
      >
        {/* Content unchanged */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

#### Success State Enhancement
```tsx
{state === 'success' && (
  <motion.div
    className="text-center py-6"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  >
    <motion.div
      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
    >
      <CheckCircle className="h-8 w-8 text-emerald-400" />
    </motion.div>
    {/* ... rest of success content */}
  </motion.div>
)}
```

### Verification
```powershell
pnpm -w typecheck
pnpm -w test
# Visual check: Modals should scale/fade in and out smoothly
```

### Acceptance Criteria
- [ ] Modals animate on open (scale + fade)
- [ ] Modals animate on close (reverse)
- [ ] Success state has spring animation
- [ ] Escape key still works
- [ ] Click outside still works

---

## Slice K: List Stagger + Entry Animations

### Risk: Low
### Dependencies: Slice H (tokens)

### Files to Modify
1. `GCEstimatesPanel.tsx`
2. `EnhancedBreakdownPanel.tsx`
3. `BiddingCockpit.tsx`

### Changes

#### GCEstimatesPanel.tsx
```tsx
import { motion } from 'framer-motion';
import { motionVariants } from './designTokens';

// Stagger container for cards
<motion.div
  variants={motionVariants.stagger.container}
  initial="hidden"
  animate="show"
  className="flex gap-4 overflow-x-auto"
>
  {requests.map((req) => (
    <motion.div
      key={req.id}
      variants={motionVariants.stagger.item}
    >
      <GCEstimateCard {...} />
    </motion.div>
  ))}
</motion.div>
```

#### EnhancedBreakdownPanel.tsx
```tsx
// Stagger for category rows
<motion.div
  variants={motionVariants.stagger.container}
  initial="hidden"
  animate="show"
  className="space-y-2"
>
  {categories.map((category) => (
    <motion.div
      key={category.id}
      variants={motionVariants.stagger.item}
    >
      <CategoryRow {...} />
    </motion.div>
  ))}
</motion.div>
```

#### BiddingCockpit.tsx
```tsx
// Add section entry animation
<motion.div
  {...motionVariants.section}
  className="space-y-6"
>
  {/* Header row */}
  <motion.div
    {...motionVariants.card}
    className="grid grid-cols-1 md:grid-cols-2 gap-6"
  >
    <EstimateSummaryCard {...} />
    <RepairVelocityCard {...} />
  </motion.div>

  {/* Rest of content */}
</motion.div>
```

### Verification
```powershell
pnpm -w typecheck
pnpm -w test
# Visual check: Items should stagger in, sections should fade in
```

### Acceptance Criteria
- [ ] GC cards stagger in on load
- [ ] Category rows stagger in
- [ ] BiddingCockpit sections animate
- [ ] Smooth performance (no jank)

---

## Slice L: Accessibility Enhancements

### Risk: Low
### Dependencies: None

### Files to Modify
1. `GCEstimatesPanel.tsx`
2. `RepairVelocityCard.tsx`

### Changes

#### GCEstimatesPanel.tsx — Scroll Region
```tsx
const scrollRef = useRef<HTMLDivElement>(null);

const scrollLeft = useCallback(() => {
  scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
}, []);

const scrollRight = useCallback(() => {
  scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
}, []);

<div
  ref={scrollRef}
  role="region"
  aria-label="GC Estimates Gallery - Use arrow keys to scroll"
  tabIndex={0}
  className="flex gap-4 overflow-x-auto scroll-smooth focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
  onKeyDown={(e) => {
    if (e.key === 'ArrowLeft') scrollLeft();
    if (e.key === 'ArrowRight') scrollRight();
  }}
>
  {/* Cards */}
</div>
```

#### RepairVelocityCard.tsx — Count Announcements
```tsx
// Add aria-live for count changes
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {submitted} estimates submitted of {total} total
</div>
```

### Verification
```powershell
pnpm -w typecheck
pnpm -w test
# Manual: Test keyboard navigation on gallery
# Manual: Test screen reader announcements
```

### Acceptance Criteria
- [ ] Gallery scrollable with arrow keys
- [ ] Focus ring visible on gallery
- [ ] Screen reader announces count updates
- [ ] No functionality regression

---

## Slice M: Polish + Skeleton Enhancement

### Risk: Low
### Dependencies: Slices H-L complete

### Files to Modify
1. `SkeletonCockpit.tsx`
2. `CategoryRow.tsx` (hover enhancement)
3. `GCEstimateCard.tsx` (hover enhancement)

### Changes

#### SkeletonCockpit.tsx — Gradient Shimmer
```tsx
const Skeleton = memo(function Skeleton({ className = "", width, height }) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-800 rounded ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
});
```

#### CategoryRow.tsx — Enhanced Hover
```tsx
<motion.div
  whileHover={
    prefersReducedMotion
      ? {}
      : {
          y: -1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
  }
  transition={{ duration: 0.15 }}
  className="..."
>
```

#### GCEstimateCard.tsx — Enhanced Hover
```tsx
<motion.div
  whileHover={
    prefersReducedMotion
      ? {}
      : {
          y: -2,
          borderColor: 'rgb(100 116 139)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }
  }
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15 }}
  className="..."
>
```

### Verification
```powershell
pnpm -w typecheck
pnpm -w test
pnpm -w build
# Visual check: Skeleton shimmer, card hover effects
```

### Acceptance Criteria
- [ ] Skeleton has gradient shimmer
- [ ] Cards have subtle lift on hover
- [ ] Reduced motion respected
- [ ] Build succeeds

---

## Implementation Timeline

| Slice | Name | Files | Effort | Dependencies |
|-------|------|-------|--------|--------------|
| H | Foundation | 1 | 1-2 hrs | None |
| I | Hero Polish | 2 | 2-3 hrs | H |
| J | Modal Animations | 2 | 2-3 hrs | H |
| K | List Stagger | 3 | 2-3 hrs | H |
| L | Accessibility | 2 | 1-2 hrs | None |
| M | Polish | 3 | 2-3 hrs | H-L |

**Recommended Order:** H → L (parallel) → I → J → K → M

---

## Rollback Strategy

Each slice is independently reversible:
1. Revert the specific files to previous commit
2. Run `pnpm -w typecheck && pnpm -w test && pnpm -w build`
3. Deploy

Token additions in Slice H are additive and don't break existing functionality.

---

## Verification Commands

After each slice:
```powershell
# TypeScript compilation
pnpm -w typecheck

# Unit tests
pnpm -w test

# Build check
pnpm -w build

# Visual regression (manual)
# - Load repairs page
# - Check all states (loading, empty, filled)
# - Check modals
# - Check reduced motion setting
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Animation performance | Use `will-change`, test on low-end devices |
| Breaking existing tests | Run full test suite after each slice |
| Reduced motion regression | Test with `prefers-reduced-motion: reduce` |
| Modal focus trap | Verify escape + click-outside still work |
| TypeScript errors | Incremental commits, test after each change |
