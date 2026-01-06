/**
 * useDrawer — Slice 16
 *
 * Simplified hook for drawer operations.
 * Provides convenient methods for opening/closing drawer.
 *
 * Usage:
 * ```tsx
 * const { openDrawer, closeDrawer, isOpen } = useDrawer();
 *
 * // Open with content
 * openDrawer({
 *   title: "Comp Details",
 *   content: <CompDetailsView comp={selectedComp} />
 * });
 *
 * // Close programmatically
 * closeDrawer();
 * ```
 *
 * @module components/dashboard/drawer/useDrawer
 * @version 1.0.0 (Slice 16)
 */

"use client";

import { useCallback } from "react";
import { useDrawerContext, type DrawerOptions } from "./DrawerContext";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UseDrawerReturn {
  /** Whether drawer is currently open */
  isOpen: boolean;
  /** Current drawer title (null if closed) */
  title: string | null;
  /** Open drawer with options */
  openDrawer: (options: DrawerOptions) => void;
  /** Close drawer */
  closeDrawer: () => void;
  /** Update drawer while open */
  updateDrawer: (options: Partial<DrawerOptions>) => void;
  /** Toggle drawer open/closed */
  toggleDrawer: (options?: DrawerOptions) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDrawer(): UseDrawerReturn {
  const context = useDrawerContext();

  const toggleDrawer = useCallback(
    (options?: DrawerOptions) => {
      if (context.isOpen) {
        context.closeDrawer();
      } else if (options) {
        context.openDrawer(options);
      }
    },
    [context]
  );

  return {
    isOpen: context.isOpen,
    title: context.options?.title ?? null,
    openDrawer: context.openDrawer,
    closeDrawer: context.closeDrawer,
    updateDrawer: context.updateDrawer,
    toggleDrawer,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default useDrawer;
