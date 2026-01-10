/**
 * useAccordionState - Manages accordion open/close state with persistence
 * @module components/underwrite/accordion/useAccordionState
 * @slice 06 of 22
 *
 * Features:
 * - Session storage persistence (survives page refresh)
 * - Multi-section support
 * - Expand/collapse all utilities
 */

'use client';

import * as React from 'react';

const STORAGE_KEY = 'underwrite-accordion-state';

interface AccordionState {
  [sectionId: string]: boolean;
}

export interface UseAccordionStateReturn {
  /** Check if a section is expanded */
  isExpanded: (sectionId: string) => boolean;
  /** Toggle a section */
  toggle: (sectionId: string) => void;
  /** Expand a section */
  expand: (sectionId: string) => void;
  /** Collapse a section */
  collapse: (sectionId: string) => void;
  /** Expand all sections */
  expandAll: () => void;
  /** Collapse all sections */
  collapseAll: () => void;
}

/**
 * Hook to manage accordion state with session storage persistence.
 *
 * @param sectionIds - Array of section IDs to manage
 * @param defaultExpanded - Which sections should be expanded by default
 * @returns Accordion state management functions
 *
 * @example
 * ```tsx
 * const { isExpanded, toggle } = useAccordionState(
 *   ['seller', 'foreclosure', 'liens'],
 *   ['seller'] // Seller expanded by default
 * );
 * ```
 */
export function useAccordionState(
  sectionIds: string[],
  defaultExpanded: string[] = []
): UseAccordionStateReturn {
  // Track if we've completed hydration from storage
  const hasHydratedRef = React.useRef(false);
  // Track if we should start persisting (skip first state change from hydration)
  const shouldPersistRef = React.useRef(false);

  const [state, setState] = React.useState<AccordionState>(() => {
    // Build default state (SSR-safe)
    const initial: AccordionState = {};
    sectionIds.forEach((id) => {
      initial[id] = defaultExpanded.includes(id);
    });
    return initial;
  });

  // Hydrate from session storage on mount (client-side only)
  React.useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AccordionState;
        // Merge with defaults (in case new sections were added)
        setState((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch {
      // Invalid JSON or storage error - use defaults
      console.debug('[useAccordionState] Failed to parse session storage');
    }

    // Enable persistence AFTER hydration completes
    // Use setTimeout to ensure this runs after the setState above triggers its effect
    setTimeout(() => {
      shouldPersistRef.current = true;
    }, 0);
  }, []);

  // Persist to session storage on change
  React.useEffect(() => {
    // Skip until hydration is complete and persistence is enabled
    if (!shouldPersistRef.current) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or disabled - continue without persistence
      console.debug('[useAccordionState] Failed to persist to session storage');
    }
  }, [state]);

  const isExpanded = React.useCallback(
    (sectionId: string): boolean => state[sectionId] ?? false,
    [state]
  );

  const toggle = React.useCallback((sectionId: string): void => {
    setState((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const expand = React.useCallback((sectionId: string): void => {
    setState((prev) => ({
      ...prev,
      [sectionId]: true,
    }));
  }, []);

  const collapse = React.useCallback((sectionId: string): void => {
    setState((prev) => ({
      ...prev,
      [sectionId]: false,
    }));
  }, []);

  const expandAll = React.useCallback((): void => {
    setState((prev) => {
      const next: AccordionState = {};
      Object.keys(prev).forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, []);

  const collapseAll = React.useCallback((): void => {
    setState((prev) => {
      const next: AccordionState = {};
      Object.keys(prev).forEach((id) => {
        next[id] = false;
      });
      return next;
    });
  }, []);

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll,
  };
}
