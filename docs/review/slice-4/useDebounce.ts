"use client";

import { useCallback, useRef, useState, useEffect } from "react";

/**
 * Debounce a value
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function
 * EC-4.2: Prevent rapid form submissions
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

/**
 * Track submission state with automatic reset
 * Prevents double-clicks and shows loading state
 */
export function useSubmitState(minInterval = 300) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitTimeRef = useRef(0);

  const startSubmit = useCallback((): boolean => {
    const now = Date.now();

    // EC-4.2: Prevent rapid submissions (min interval between)
    if (now - lastSubmitTimeRef.current < minInterval) {
      return false;
    }

    setIsSubmitting(true);
    lastSubmitTimeRef.current = now;
    return true;
  }, [minInterval]);

  const endSubmit = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const withSubmit = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      if (!startSubmit()) return null;

      try {
        return await fn();
      } finally {
        endSubmit();
      }
    },
    [startSubmit, endSubmit]
  );

  return {
    isSubmitting,
    startSubmit,
    endSubmit,
    withSubmit,
  };
}
