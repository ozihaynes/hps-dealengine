/**
 * useReducedMotion Hook
 *
 * Detects user's preference for reduced motion.
 * Returns true if user prefers reduced motion (accessibility).
 *
 * Used to disable or simplify animations for users with
 * vestibular disorders or motion sensitivity.
 *
 * @module lib/hooks/useReducedMotion
 * @version 1.0.0 (Slice 14 Polish)
 */

"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect reduced motion preference.
 *
 * @returns true if user prefers reduced motion
 *
 * @example
 * const prefersReducedMotion = useReducedMotion();
 *
 * <motion.div
 *   variants={prefersReducedMotion ? undefined : animationVariants}
 *   initial={prefersReducedMotion ? false : "hidden"}
 *   animate="visible"
 * />
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR guard)
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, []);

  return prefersReducedMotion;
}

export default useReducedMotion;
