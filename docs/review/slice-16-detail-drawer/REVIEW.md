# Slice 16: Detail Drawer System

## Status: COMPLETE

**Date:** 2026-01-05
**Version:** 1.0.0

---

## Overview

Slide-out drawer system for deep-dive views of dashboard components. Built with accessibility-first design, keyboard navigation, and smooth animations.

---

## Features Implemented

### Core Functionality
- [x] Slide-in from right edge animation
- [x] Backdrop with click-outside-to-close
- [x] Focus trap when open
- [x] Keyboard navigation (Escape to close)
- [x] Body scroll lock
- [x] Portal rendering to document.body

### Responsive Design
- [x] Mobile: Full screen width (100vw)
- [x] Desktop: 480px fixed width
- [x] Width variants: sm (384px), md (448px), lg (512px), full

### Accessibility (WCAG 2.1 AA)
- [x] Focus trap implementation
- [x] `role="dialog"` and `aria-modal="true"`
- [x] `aria-labelledby` pointing to drawer title
- [x] Close button with `aria-label`
- [x] 44x44px minimum touch target for close button
- [x] Focus indicators (3px ring)
- [x] `prefers-reduced-motion` support

### Animation
- [x] 300ms slide-in/out with custom easing
- [x] Backdrop fade with blur
- [x] Content stagger animation
- [x] Reduced motion fallback

---

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `DrawerContext.tsx` | ~130 | Global state management |
| `useDrawer.ts` | ~75 | Simplified hook API |
| `DrawerHeader.tsx` | ~120 | Header with title & close |
| `DrawerContent.tsx` | ~115 | Scrollable content container |
| `DetailDrawer.tsx` | ~260 | Main portal-rendered component |
| `index.ts` | ~60 | Barrel exports |

**Total:** ~760 lines

---

## API

### DrawerProvider

Wrap your app with `DrawerProvider` to enable drawer state:

```tsx
import { DrawerProvider, DetailDrawer } from "@/components/dashboard/drawer";

<DrawerProvider>
  <App />
  <DetailDrawer />
</DrawerProvider>
```

### useDrawer Hook

```tsx
import { useDrawer } from "@/components/dashboard/drawer";

const { openDrawer, closeDrawer, isOpen } = useDrawer();

// Open drawer
openDrawer({
  title: "Deal Details",
  subtitle: "123 Main St",
  content: <DealDetailsContent deal={deal} />,
  width: "md", // optional: "sm" | "md" | "lg" | "full"
  onClose: () => console.log("closed"),
  preventClose: false,
});

// Close drawer
closeDrawer();
```

### DrawerOptions Interface

```typescript
interface DrawerOptions {
  title: string;           // Required: Drawer title
  subtitle?: string;       // Optional: Subtitle text
  content: ReactNode;      // Required: Content to render
  width?: "sm" | "md" | "lg" | "full";  // Width variant
  onClose?: () => void;    // Callback when drawer closes
  preventClose?: boolean;  // Prevent backdrop/escape close
}
```

---

## Design Principles Applied

| Principle | Application |
|-----------|-------------|
| **Progressive Disclosure** | Show details on demand |
| **Fitts's Law** | Large close target (44x44px) |
| **Doherty Threshold** | 300ms animation for responsiveness |
| **Focus Management** | Tab trap, restore focus on close |
| **Motion Safety** | Reduced motion support |

---

## Verification

```powershell
pnpm -w typecheck  # ✅ Passed
pnpm -w build      # ✅ Passed (warnings only for <img> in other files)
```

---

## Integration (Not Yet Applied)

To complete integration, add to app layout:

```tsx
// apps/hps-dealengine/app/(app)/layout.tsx
import { DrawerProvider, DetailDrawer } from "@/components/dashboard/drawer";

export default function AppLayout({ children }) {
  return (
    <DrawerProvider>
      {/* existing layout */}
      {children}
      <DetailDrawer />
    </DrawerProvider>
  );
}
```

---

## Test IDs

| Element | Test ID |
|---------|---------|
| Backdrop | `drawer-backdrop` |
| Drawer panel | `detail-drawer` |
| Header | `drawer-header` |
| Close button | `drawer-close-button` |
| Content area | `drawer-content` |

---

## Dependencies

- `framer-motion` - Animation
- `react-dom` (createPortal) - Portal rendering
- `@/lib/animations/tokens` - Timing constants
- `@/lib/hooks/useReducedMotion` - Motion preferences

---

## Next Steps

1. Integrate DrawerProvider into app layout
2. Create drawer content components for specific views:
   - CompDetailDrawer
   - EvidenceDetailDrawer
   - RiskGateDrawer
3. Add unit tests
4. Add Storybook stories
