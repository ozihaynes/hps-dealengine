/**
 * DrawerHeader — Slice 16
 *
 * Header component for drawer with:
 * - Title and optional subtitle
 * - Close button (X)
 * - Sticky positioning
 *
 * Principles Applied:
 * - Fitts's Law: Large close button target (44x44px)
 * - Visual Hierarchy: Title prominent, subtitle secondary
 * - Accessibility: aria-label on close button
 *
 * @module components/dashboard/drawer/DrawerHeader
 * @version 1.0.0 (Slice 16)
 */

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DrawerHeaderProps {
  /** Main title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Close handler */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        d="M18 6L6 18M6 6l12 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DrawerHeader = memo(function DrawerHeader({
  title,
  subtitle,
  onClose,
  className,
}: DrawerHeaderProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.header
      className={cn(
        // Layout
        "sticky top-0 z-10",
        "flex items-start justify-between gap-4",
        "px-6 py-4",
        // Styling
        "bg-zinc-900/95 backdrop-blur-sm",
        "border-b border-zinc-700/50",
        className
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: TIMING.standard,
        ease: EASING.decelerate,
      }}
      data-testid="drawer-header"
    >
      {/* Title area */}
      <div className="flex-1 min-w-0">
        <h2
          id="drawer-title"
          className="text-lg font-semibold text-zinc-100 truncate"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-zinc-400 truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className={cn(
          // Layout - ensure 44x44px touch target
          "shrink-0",
          "w-11 h-11",
          "flex items-center justify-center",
          "-mr-2 -mt-1", // Visual alignment compensation
          // Styling
          "rounded-lg",
          "text-zinc-400 hover:text-zinc-100",
          "hover:bg-zinc-800/50",
          "transition-colors duration-150",
          // Focus
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        )}
        aria-label="Close drawer"
        data-testid="drawer-close-button"
      >
        <CloseIcon className="w-5 h-5" />
      </button>
    </motion.header>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default DrawerHeader;
