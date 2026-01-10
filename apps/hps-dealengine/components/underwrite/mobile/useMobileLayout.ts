/**
 * useMobileLayout - Detect mobile layout and manage drawer state
 * @module components/underwrite/mobile/useMobileLayout
 * @slice 21 of 22
 *
 * Hook for responsive layout detection and mobile drawer management.
 * Uses lg breakpoint (1024px) to match Tailwind defaults.
 *
 * Principles Applied:
 * - Responsive: Mobile-first detection
 * - Performance: Debounced resize listener
 * - State: Centralized drawer management
 */

'use client';

import * as React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** lg breakpoint in Tailwind (1024px) */
const MOBILE_BREAKPOINT = 1024;

/** Resize debounce delay */
const RESIZE_DEBOUNCE_MS = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseMobileLayoutReturn {
  /** Is viewport below lg breakpoint */
  isMobile: boolean;
  /** Is output drawer open */
  isDrawerOpen: boolean;
  /** Open the output drawer */
  openDrawer: () => void;
  /** Close the output drawer */
  closeDrawer: () => void;
  /** Toggle the output drawer */
  toggleDrawer: () => void;
  /** Current section in view */
  currentSection: string | null;
  /** Set current section */
  setCurrentSection: (section: string | null) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useMobileLayout(): UseMobileLayoutReturn {
  // Default to false to avoid hydration mismatch (SSR assumes desktop)
  const [isMobile, setIsMobile] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [currentSection, setCurrentSection] = React.useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEWPORT DETECTION
  // ─────────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    // Check if we're in browser
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    const debouncedCheck = (): void => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, RESIZE_DEBOUNCE_MS);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', debouncedCheck);

    return () => {
      window.removeEventListener('resize', debouncedCheck);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO-CLOSE DRAWER ON DESKTOP
  // ─────────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    // Close drawer when switching to desktop
    if (!isMobile && isDrawerOpen) {
      setIsDrawerOpen(false);
    }
  }, [isMobile, isDrawerOpen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAWER CONTROLS
  // ─────────────────────────────────────────────────────────────────────────────

  const openDrawer = React.useCallback((): void => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = React.useCallback((): void => {
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawer = React.useCallback((): void => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    isMobile,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    currentSection,
    setCurrentSection,
  };
}
