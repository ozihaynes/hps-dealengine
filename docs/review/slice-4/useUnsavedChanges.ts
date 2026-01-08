"use client";

import { useEffect, useCallback, useState } from "react";

interface UseUnsavedChangesOptions {
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Message to show in the confirmation dialog */
  message?: string;
}

interface UseUnsavedChangesReturn {
  /** Whether to show the confirmation dialog */
  showDialog: boolean;
  /** Call this when user confirms they want to leave */
  confirmDiscard: () => void;
  /** Call this when user cancels navigation */
  cancelDiscard: () => void;
  /** The warning message */
  dialogMessage: string;
  /** Programmatically trigger the unsaved changes dialog */
  triggerDialog: () => boolean;
}

/**
 * Hook to warn users about unsaved changes before browser navigation
 *
 * NOTE: This handles browser refresh/close via beforeunload.
 * For Next.js App Router client-side navigation, use triggerDialog()
 * before calling router.push() and handle the dialog response.
 *
 * @example
 * const { showDialog, confirmDiscard, cancelDiscard, dialogMessage, triggerDialog } = useUnsavedChanges({
 *   hasChanges: isDirty,
 *   message: "You have unsaved changes. Discard them?",
 * });
 *
 * // Before navigation:
 * const handleNavigate = (path: string) => {
 *   if (triggerDialog()) return; // Has changes, dialog shown
 *   router.push(path);
 * };
 */
export function useUnsavedChanges({
  hasChanges,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [showDialog, setShowDialog] = useState(false);

  // EC-4.1: Browser beforeunload event (handles refresh, close, external nav)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasChanges) return;

      e.preventDefault();
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges, message]);

  const confirmDiscard = useCallback(() => {
    setShowDialog(false);
  }, []);

  const cancelDiscard = useCallback(() => {
    setShowDialog(false);
  }, []);

  // Expose a way to trigger the dialog programmatically
  const triggerDialog = useCallback(() => {
    if (hasChanges) {
      setShowDialog(true);
      return true;
    }
    return false;
  }, [hasChanges]);

  return {
    showDialog,
    confirmDiscard,
    cancelDiscard,
    dialogMessage: message,
    triggerDialog, // P0-001 FIX: Now exported
  };
}
