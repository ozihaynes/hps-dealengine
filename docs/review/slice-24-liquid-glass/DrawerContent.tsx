/**
 * DrawerContent — Slice 16
 *
 * Scrollable content area for drawer body.
 * Supports staggered child animations.
 *
 * Principles Applied:
 * - Progressive Disclosure: Content reveals on demand
 * - Motion Choreography: Staggered children for visual flow
 * - Reduced Motion: Respects user preferences
 *
 * @module components/dashboard/drawer/DrawerContent
 * @version 1.0.0 (Slice 16)
 */

"use client";

import { memo, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DrawerContentProps {
  /** Content to render */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Disable padding (for custom layouts) */
  noPadding?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: TIMING.standard,
      ease: EASING.decelerate,
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.standard,
      ease: EASING.decelerate,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DrawerContent = memo(function DrawerContent({
  children,
  className,
  noPadding = false,
}: DrawerContentProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        // Layout
        "flex-1 overflow-y-auto",
        // Scrollbar styling (works with scrollbar-hide/thin plugins)
        "scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent",
        // Padding (unless disabled)
        !noPadding && "px-6 py-4",
        className
      )}
      variants={prefersReducedMotion ? undefined : contentVariants}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      data-testid="drawer-content"
    >
      {children}
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrapper for drawer content children that need staggered animation.
 * Use this to wrap sections within DrawerContent for coordinated reveals.
 *
 * @example
 * <DrawerContent>
 *   <DrawerSection>First section</DrawerSection>
 *   <DrawerSection>Second section</DrawerSection>
 * </DrawerContent>
 */
export const DrawerSection = memo(function DrawerSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={prefersReducedMotion ? undefined : childVariants}
    >
      {children}
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default DrawerContent;
