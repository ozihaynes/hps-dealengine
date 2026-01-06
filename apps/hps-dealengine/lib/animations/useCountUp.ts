/**
 * useCountUp Hook — Animated Number Counter
 *
 * Animates a number from start to end value with smooth easing.
 * Respects reduced motion preferences.
 *
 * @module lib/animations/useCountUp
 * @version 2.0.0 (Slice 20 - Animation Library Enhancement)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { DURATION, prefersReducedMotion } from './tokens';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCountUpOptions {
  /** Starting value (default: 0) */
  start?: number;
  /** Ending value (required) */
  end: number;
  /** Animation duration in seconds (default: 0.8) */
  duration?: number;
  /** Delay before animation starts in seconds (default: 0) */
  delay?: number;
  /** Number of decimal places to display (default: 0) */
  decimals?: number;
  /** Custom formatter function */
  formatter?: (value: number) => string;
  /** Whether to animate (useful for triggering re-animation) */
  enabled?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export interface UseCountUpReturn {
  /** Formatted display value */
  value: string;
  /** Raw numeric value */
  rawValue: number;
  /** Whether animation is in progress */
  isAnimating: boolean;
  /** Reset and replay animation */
  reset: () => void;
}

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

/**
 * Ease out cubic - natural deceleration
 * Fast at the start, slows down at the end
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease out quart - more dramatic deceleration
 */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// =============================================================================
// DEFAULT FORMATTER
// =============================================================================

/**
 * Default number formatter
 * Adds commas for thousands and handles decimals
 */
function defaultFormatter(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Animated count-up hook with reduced motion support
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { value } = useCountUp({ end: 18500 });
 *
 * // With currency formatting
 * const { value } = useCountUp({
 *   end: 18500,
 *   formatter: (v) => `$${v.toLocaleString()}`,
 * });
 *
 * // With decimals
 * const { value } = useCountUp({
 *   end: 85.5,
 *   decimals: 1,
 * });
 *
 * // With reset capability
 * const { value, reset } = useCountUp({ end: 100 });
 * <button onClick={reset}>Replay</button>
 * ```
 */
export function useCountUp(options: UseCountUpOptions): UseCountUpReturn {
  const {
    start = 0,
    end,
    duration = DURATION.slower,
    delay = 0,
    decimals = 0,
    formatter,
    enabled = true,
    onComplete,
  } = options;

  // State
  const [rawValue, setRawValue] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const [key, setKey] = useState(0); // For reset functionality

  // Refs for animation frame
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Check reduced motion preference
  const shouldReduceMotion = prefersReducedMotion();

  // Cancel any pending animation
  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Reset function
  const reset = useCallback(() => {
    cancelAnimation();
    setRawValue(start);
    setIsAnimating(false);
    startTimeRef.current = null;
    setKey((k) => k + 1); // Trigger re-animation
  }, [cancelAnimation, start]);

  // Animation effect
  useEffect(() => {
    if (!enabled) {
      setRawValue(end);
      return;
    }

    // If reduced motion, skip to end immediately
    if (shouldReduceMotion) {
      setRawValue(end);
      onComplete?.();
      return;
    }

    // Handle delay
    const delayTimer = setTimeout(() => {
      setIsAnimating(true);
      startTimeRef.current = null;

      const animate = (currentTime: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const durationMs = duration * 1000;
        const progress = Math.min(elapsed / durationMs, 1);

        // Apply easing
        const easedProgress = easeOutCubic(progress);
        const currentValue = start + (end - start) * easedProgress;

        setRawValue(currentValue);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete
          setRawValue(end); // Ensure we end exactly on target
          setIsAnimating(false);
          onComplete?.();
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }, delay * 1000);

    // Cleanup
    return () => {
      clearTimeout(delayTimer);
      cancelAnimation();
    };
  }, [
    start,
    end,
    duration,
    delay,
    enabled,
    shouldReduceMotion,
    onComplete,
    cancelAnimation,
    key, // Re-run when key changes (reset)
  ]);

  // Format the value
  const formattedValue = formatter
    ? formatter(Math.round(rawValue * Math.pow(10, decimals)) / Math.pow(10, decimals))
    : defaultFormatter(
        Math.round(rawValue * Math.pow(10, decimals)) / Math.pow(10, decimals),
        decimals
      );

  return {
    value: formattedValue,
    rawValue,
    isAnimating,
    reset,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook for animated currency display
 *
 * @example
 * ```tsx
 * const { value } = useCurrencyCountUp({ end: 185000 });
 * // Returns "$185,000"
 * ```
 */
export function useCurrencyCountUp(
  options: Omit<UseCountUpOptions, 'formatter' | 'decimals'> & {
    decimals?: number;
    currency?: string;
  }
): UseCountUpReturn {
  const { currency = 'USD', decimals = 0, ...rest } = options;

  return useCountUp({
    ...rest,
    decimals,
    formatter: (value) =>
      value.toLocaleString('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
  });
}

/**
 * Hook for animated percentage display
 *
 * @example
 * ```tsx
 * const { value } = usePercentageCountUp({ end: 85.5 });
 * // Returns "85.5%"
 * ```
 */
export function usePercentageCountUp(
  options: Omit<UseCountUpOptions, 'formatter'> & {
    decimals?: number;
  }
): UseCountUpReturn {
  const { decimals = 0, ...rest } = options;

  return useCountUp({
    ...rest,
    decimals,
    formatter: (value) => `${value.toFixed(decimals)}%`,
  });
}
