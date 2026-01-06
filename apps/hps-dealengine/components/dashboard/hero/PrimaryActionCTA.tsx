/**
 * PrimaryActionCTA — Slice 14 (Verdict-Contextual Action Button)
 *
 * Primary call-to-action button that adapts to the verdict:
 * - PURSUE: "Generate Offer" (emerald, prominent)
 * - NEEDS_EVIDENCE: "Request Evidence" (amber) + optional secondary
 * - PASS: "Archive Deal" (subdued zinc)
 * - UNKNOWN: "Analyzing..." (disabled)
 *
 * Features:
 * - Animated entrance with scale/fade
 * - Hover/active states with feedback
 * - Loading state support
 * - Secondary action for NEEDS_EVIDENCE
 *
 * @defensive Handles disabled states gracefully
 * @traced data-testid for debugging and test selection
 * @accessible Full keyboard navigation and ARIA
 *
 * @module components/dashboard/hero/PrimaryActionCTA
 * @version 1.0.0 (Slice 14)
 */

"use client";

import { memo, useState, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type VerdictKey = "pursue" | "needs_evidence" | "pass" | "unknown";

export interface PrimaryActionCTAProps {
  /** Normalized verdict recommendation */
  recommendation: VerdictKey;
  /** Callback when primary action is clicked */
  onPrimaryAction?: () => void;
  /** Callback when secondary action is clicked (NEEDS_EVIDENCE only) */
  onSecondaryAction?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Whether user prefers reduced motion (accessibility) */
  prefersReducedMotion?: boolean;
  /**
   * Allow preview mode for Storybook/demos.
   * When true, button appears enabled even without handlers.
   */
  allowPreview?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CTA configuration per verdict
 */
const CTA_CONFIG: Record<
  VerdictKey,
  {
    label: string;
    icon: "arrow" | "evidence" | "archive" | "spinner";
    baseStyles: string;
    hoverStyles: string;
    activeStyles: string;
    focusRing: string;
    showSecondary: boolean;
    secondaryLabel?: string;
    disabled: boolean;
  }
> = {
  pursue: {
    label: "Generate Offer",
    icon: "arrow",
    baseStyles: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25",
    hoverStyles: "hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/30",
    activeStyles: "active:bg-emerald-700 active:scale-[0.98]",
    focusRing: "focus:ring-emerald-500",
    showSecondary: false,
    disabled: false,
  },
  needs_evidence: {
    label: "Request Evidence",
    icon: "evidence",
    baseStyles: "bg-amber-600 text-white shadow-lg shadow-amber-500/20",
    hoverStyles: "hover:bg-amber-500 hover:shadow-xl hover:shadow-amber-500/25",
    activeStyles: "active:bg-amber-700 active:scale-[0.98]",
    focusRing: "focus:ring-amber-500",
    showSecondary: true,
    secondaryLabel: "Skip for Now",
    disabled: false,
  },
  pass: {
    label: "Archive Deal",
    icon: "archive",
    baseStyles: "bg-slate-700 text-slate-200",
    hoverStyles: "hover:bg-slate-600 hover:text-white",
    activeStyles: "active:bg-slate-800 active:scale-[0.98]",
    focusRing: "focus:ring-slate-500",
    showSecondary: false,
    disabled: false,
  },
  unknown: {
    label: "Analyzing...",
    icon: "spinner",
    baseStyles: "bg-slate-700 text-slate-400 cursor-not-allowed",
    hoverStyles: "",
    activeStyles: "",
    focusRing: "",
    showSecondary: false,
    disabled: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const buttonVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: TIMING.standard,
      ease: EASING.bounce,
      delay: 0.1,
    },
  },
};

const iconVariants: Variants = {
  initial: { x: 0 },
  hover: {
    x: 4,
    transition: {
      duration: TIMING.instant,
      ease: EASING.snap,
    },
  },
};

const spinnerVariants: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ICON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      variants={iconVariants}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </motion.svg>
  );
}

function EvidenceIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      variants={spinnerVariants}
      animate="spin"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </motion.svg>
  );
}

function CTAIcon({
  type,
  className,
}: {
  type: "arrow" | "evidence" | "archive" | "spinner";
  className?: string;
}) {
  switch (type) {
    case "arrow":
      return <ArrowRightIcon className={className} />;
    case "evidence":
      return <EvidenceIcon className={className} />;
    case "archive":
      return <ArchiveIcon className={className} />;
    case "spinner":
      return <SpinnerIcon className={className} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const PrimaryActionCTA = memo(function PrimaryActionCTA({
  recommendation,
  onPrimaryAction,
  onSecondaryAction,
  isLoading = false,
  prefersReducedMotion = false,
  allowPreview = false,
  className,
}: PrimaryActionCTAProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const config = CTA_CONFIG[recommendation] ?? CTA_CONFIG.unknown;

  // Determine if button should be disabled
  // In preview mode, don't disable for missing handlers (useful for Storybook)
  const isDisabled = config.disabled || isLoading || (!onPrimaryAction && !allowPreview);

  // Handle primary click
  const handlePrimaryClick = useCallback(() => {
    if (!isDisabled && onPrimaryAction) {
      onPrimaryAction();
    }
  }, [isDisabled, onPrimaryAction]);

  // Handle secondary click
  const handleSecondaryClick = useCallback(() => {
    if (onSecondaryAction) {
      onSecondaryAction();
    }
  }, [onSecondaryAction]);

  return (
    <div
      className={cn("flex flex-col items-center gap-3", className)}
      data-testid="primary-action-cta"
    >
      {/* ─────────────────────────────────────────────────────────────────
          PRIMARY BUTTON
          ───────────────────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        variants={prefersReducedMotion ? undefined : buttonVariants}
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        whileHover={!isDisabled && !prefersReducedMotion ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled && !prefersReducedMotion ? { scale: 0.98 } : undefined}
        onClick={handlePrimaryClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isDisabled}
        className={cn(
          // Base styles
          "flex items-center justify-center gap-3",
          "px-8 py-4 rounded-xl",
          "text-lg font-semibold tracking-wide",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
          // Config-based styles
          config.baseStyles,
          !isDisabled && config.hoverStyles,
          !isDisabled && config.activeStyles,
          config.focusRing,
          // Disabled overrides
          isDisabled && "opacity-60 cursor-not-allowed"
        )}
        data-testid="cta-primary"
        aria-label={config.label}
        aria-disabled={isDisabled}
      >
        {/* Label */}
        <span>{isLoading ? "Processing..." : config.label}</span>

        {/* Icon */}
        <motion.span
          animate={isHovered && !isDisabled ? "hover" : "initial"}
        >
          <CTAIcon
            type={isLoading ? "spinner" : config.icon}
            className="w-5 h-5"
          />
        </motion.span>
      </motion.button>

      {/* ─────────────────────────────────────────────────────────────────
          SECONDARY BUTTON (NEEDS_EVIDENCE only)
          ───────────────────────────────────────────────────────────────── */}
      {config.showSecondary && (onSecondaryAction || allowPreview) && (
        <motion.button
          type="button"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? undefined : { delay: 0.3, duration: TIMING.quick }}
          onClick={handleSecondaryClick}
          className={cn(
            "text-sm font-medium text-slate-400",
            "hover:text-slate-300 hover:underline",
            "focus:outline-none focus:text-slate-300",
            "transition-colors duration-150"
          )}
          data-testid="cta-secondary"
        >
          {config.secondaryLabel}
        </motion.button>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default PrimaryActionCTA;

// Re-export for testing
export { CTA_CONFIG };
