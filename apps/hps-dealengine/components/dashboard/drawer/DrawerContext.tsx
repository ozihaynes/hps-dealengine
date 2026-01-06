/**
 * DrawerContext — Slice 16
 *
 * Context provider for drawer state management.
 * Enables any component to open/close the drawer with custom content.
 *
 * Usage:
 * ```tsx
 * // In app layout
 * <DrawerProvider>
 *   <App />
 * </DrawerProvider>
 *
 * // In any component
 * const { openDrawer, closeDrawer } = useDrawer();
 * openDrawer({
 *   title: "Deal Details",
 *   content: <DealDetailsContent deal={deal} />
 * });
 * ```
 *
 * Principles Applied:
 * - State Management: Single source of truth for drawer state
 * - Separation of Concerns: Context separate from UI
 * - Type Safety: Full TypeScript coverage
 *
 * @module components/dashboard/drawer/DrawerContext
 * @version 1.0.0 (Slice 16)
 */

"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  type ReactNode,
} from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DrawerOptions {
  /** Drawer title displayed in header */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Content to render in drawer body */
  content: ReactNode;
  /** Width override (default: 480px desktop, 100vw mobile) */
  width?: "sm" | "md" | "lg" | "full";
  /** Callback when drawer closes */
  onClose?: () => void;
  /** Prevent closing via backdrop click or escape */
  preventClose?: boolean;
}

export interface DrawerState {
  /** Whether drawer is open */
  isOpen: boolean;
  /** Current drawer options (null when closed) */
  options: DrawerOptions | null;
}

export interface DrawerContextValue extends DrawerState {
  /** Open drawer with options */
  openDrawer: (options: DrawerOptions) => void;
  /** Close drawer */
  closeDrawer: () => void;
  /** Update drawer options while open */
  updateDrawer: (options: Partial<DrawerOptions>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const DrawerContext = createContext<DrawerContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export interface DrawerProviderProps {
  children: ReactNode;
}

export function DrawerProvider({ children }: DrawerProviderProps): JSX.Element {
  const [state, setState] = useState<DrawerState>({
    isOpen: false,
    options: null,
  });

  const openDrawer = useCallback((options: DrawerOptions) => {
    setState({ isOpen: true, options });
  }, []);

  const closeDrawer = useCallback(() => {
    setState((prev) => {
      // Schedule the callback to run after state update
      // Using queueMicrotask ensures it runs after React commits
      // (Avoids side effects inside setState updater - React anti-pattern)
      if (prev.options?.onClose) {
        queueMicrotask(() => prev.options?.onClose?.());
      }
      return { isOpen: false, options: null };
    });
  }, []);

  const updateDrawer = useCallback((updates: Partial<DrawerOptions>) => {
    setState((prev) => ({
      ...prev,
      options: prev.options ? { ...prev.options, ...updates } : null,
    }));
  }, []);

  const value = useMemo<DrawerContextValue>(
    () => ({
      ...state,
      openDrawer,
      closeDrawer,
      updateDrawer,
    }),
    [state, openDrawer, closeDrawer, updateDrawer]
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to access drawer context
 * @throws Error if used outside DrawerProvider
 */
export function useDrawerContext(): DrawerContextValue {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawerContext must be used within a DrawerProvider");
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { DrawerContext };
export default DrawerProvider;
