/**
 * Detail Drawer System — Slice 16
 *
 * Slide-out drawer for deep-dive views of dashboard components.
 *
 * Features:
 * - Slides in from right edge
 * - Backdrop with click-outside-to-close
 * - Focus trap when open
 * - Keyboard navigation (Escape to close)
 * - Body scroll lock
 * - Responsive (480px desktop, full screen mobile)
 * - Reduced motion support
 *
 * Usage:
 * ```tsx
 * // 1. Wrap app with DrawerProvider (in layout)
 * import { DrawerProvider, DetailDrawer } from "@/components/dashboard/drawer";
 *
 * <DrawerProvider>
 *   <App />
 *   <DetailDrawer />
 * </DrawerProvider>
 *
 * // 2. Use drawer in any component
 * import { useDrawer } from "@/components/dashboard/drawer";
 *
 * const { openDrawer, closeDrawer } = useDrawer();
 *
 * openDrawer({
 *   title: "Deal Details",
 *   subtitle: "123 Main St",
 *   content: <DealDetailsContent deal={deal} />,
 * });
 * ```
 *
 * Principles Applied:
 * - Progressive Disclosure: Show details on demand
 * - Fitts's Law: Large close target area (44x44px)
 * - Doherty Threshold: 300ms slide animation
 * - WCAG 2.1 AA: Focus trap, keyboard nav, ARIA
 *
 * @module components/dashboard/drawer
 * @version 1.0.0 (Slice 16)
 */

// Main components
export { DetailDrawer, default } from "./DetailDrawer";

// Context and hooks
export {
  DrawerProvider,
  DrawerContext,
  useDrawerContext,
  type DrawerOptions,
  type DrawerState,
  type DrawerContextValue,
  type DrawerProviderProps,
} from "./DrawerContext";

export { useDrawer, type UseDrawerReturn } from "./useDrawer";

// Sub-components (for advanced customization)
export { DrawerHeader, type DrawerHeaderProps } from "./DrawerHeader";
export {
  DrawerContent,
  DrawerSection,
  type DrawerContentProps,
} from "./DrawerContent";
