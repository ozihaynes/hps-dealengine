"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface HelpTooltipProps {
  /** The content that triggers the tooltip */
  children: ReactNode;
  /** Tooltip content */
  content: ReactNode;
  /** Position relative to trigger */
  position?: TooltipPosition;
  /** Delay before showing (ms) */
  delay?: number;
  /** Whether tooltip is disabled */
  disabled?: boolean;
  /** Max width of tooltip */
  maxWidth?: number;
}

const positionStyles: Record<TooltipPosition, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowStyles: Record<TooltipPosition, string> = {
  top: "top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-x-transparent border-b-transparent",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-x-transparent border-t-transparent",
  left: "left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent",
  right: "right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent",
};

/**
 * Accessible tooltip component for help text
 *
 * Uses z-40 to stay below toasts (z-50) but above most content.
 *
 * @example
 * <HelpTooltip content="This is help text">
 *   <button>Hover me</button>
 * </HelpTooltip>
 */
export function HelpTooltip({
  children,
  content,
  position = "top",
  delay = 200,
  disabled = false,
  maxWidth = 250,
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useRef(`help-tooltip-${Math.random().toString(36).slice(2, 9)}`);

  // SSR-safe reduced motion check
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }
  }, []);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.1 },
      };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      <div aria-describedby={isVisible ? tooltipId.current : undefined}>
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            id={tooltipId.current}
            role="tooltip"
            {...animationProps}
            className={`absolute z-40 pointer-events-none ${positionStyles[position]}`}
            style={{ maxWidth }}
          >
            <div className="bg-slate-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
              {content}
            </div>
            <div
              className={`absolute w-0 h-0 border-4 ${arrowStyles[position]}`}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
