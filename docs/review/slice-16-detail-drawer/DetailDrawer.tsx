/**
 * DetailDrawer — Slice 16
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
 * Principles Applied:
 * - Progressive Disclosure: Show details on demand
 * - Fitts's Law: Large close target area
 * - Doherty Threshold: 300ms slide animation
 * - WCAG 2.1 AA: Focus trap, keyboard nav, ARIA
 *
 * @module components/dashboard/drawer/DetailDrawer
 * @version 1.0.0 (Slice 16)
 */

"use client";

import { memo, useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// Sub-components
import { DrawerHeader } from "./DrawerHeader";
import { DrawerContent } from "./DrawerContent";
import { useDrawerContext } from "./DrawerContext";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const WIDTH_CLASSES = {
  sm: "sm:max-w-sm", // 384px
  md: "sm:max-w-md", // 448px
  lg: "sm:max-w-lg", // 512px
  full: "sm:max-w-full",
} as const;

const DRAWER_WIDTH_DEFAULT = "w-full sm:w-[480px] sm:max-w-[480px]";

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: "linear" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: "linear" },
  },
};

const drawerVariants: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: {
      type: "tween",
      duration: TIMING.standard,
      ease: [0.32, 0.72, 0, 1], // Custom ease-out curve
    },
  },
  exit: {
    x: "100%",
    transition: {
      type: "tween",
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS TRAP HOOK
// ═══════════════════════════════════════════════════════════════════════════

function useFocusTrap(
  isOpen: boolean,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Find all focusable elements in the drawer
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    };

    // Focus the first focusable element (usually close button)
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Small delay to ensure element is ready
      requestAnimationFrame(() => {
        focusableElements[0]?.focus();
      });
    }

    // Handle tab key for focus trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: If on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: If on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus when drawer closes
      previousActiveElement.current?.focus();
    };
  }, [isOpen, containerRef]);
}

// ═══════════════════════════════════════════════════════════════════════════
// BODY SCROLL LOCK HOOK
// ═══════════════════════════════════════════════════════════════════════════

function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DetailDrawer = memo(function DetailDrawer(): JSX.Element | null {
  const { isOpen, options, closeDrawer } = useDrawerContext();
  const prefersReducedMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);

  // State to track if we're mounted (for portal)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Custom hooks
  useFocusTrap(isOpen, drawerRef);
  useBodyScrollLock(isOpen);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !options?.preventClose) {
        closeDrawer();
      }
    },
    [isOpen, options?.preventClose, closeDrawer]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !options?.preventClose) {
        closeDrawer();
      }
    },
    [options?.preventClose, closeDrawer]
  );

  // Don't render until mounted (SSR safety)
  if (!isMounted) return null;

  // Width class based on options
  const widthClass = options?.width
    ? `w-full ${WIDTH_CLASSES[options.width]}`
    : DRAWER_WIDTH_DEFAULT;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && options && (
        <>
          {/* ─────────────────────────────────────────────────────────────────
              BACKDROP
              ───────────────────────────────────────────────────────────────── */}
          <motion.div
            className={cn(
              "fixed inset-0 z-40",
              "bg-black/50 backdrop-blur-sm",
              // Mobile: slightly more opaque for focus
              "sm:bg-black/50 bg-black/60"
            )}
            variants={prefersReducedMotion ? undefined : backdropVariants}
            initial={prefersReducedMotion ? { opacity: 1 } : "hidden"}
            animate="visible"
            exit="exit"
            onClick={handleBackdropClick}
            aria-hidden="true"
            data-testid="drawer-backdrop"
          />

          {/* ─────────────────────────────────────────────────────────────────
              DRAWER PANEL
              ───────────────────────────────────────────────────────────────── */}
          <motion.div
            ref={drawerRef}
            className={cn(
              // Positioning
              "fixed inset-y-0 right-0 z-50",
              // Sizing
              widthClass,
              // Layout
              "flex flex-col",
              // Styling
              "bg-zinc-900",
              "border-l border-zinc-700/50",
              "shadow-2xl shadow-black/50"
            )}
            variants={prefersReducedMotion ? undefined : drawerVariants}
            initial={prefersReducedMotion ? { x: 0 } : "hidden"}
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            data-testid="detail-drawer"
          >
            {/* Header */}
            <DrawerHeader
              title={options.title}
              subtitle={options.subtitle}
              onClose={closeDrawer}
            />

            {/* Content */}
            <DrawerContent>{options.content}</DrawerContent>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default DetailDrawer;
