"use client";

import { useContext, useCallback } from "react";
import { ToastContext } from "@/components/ui/ToastProvider";
import type { ToastType } from "@/components/ui/Toast";

interface UseToastReturn {
  toast: {
    success: (title: string, message?: string) => string;
    error: (title: string, message?: string) => string;
    warning: (title: string, message?: string) => string;
    info: (title: string, message?: string) => string;
    custom: (type: ToastType, title: string, message?: string, duration?: number) => string;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/**
 * Hook for displaying toast notifications
 *
 * @example
 * const { toast } = useToast();
 * toast.success("Saved!", "Your changes have been saved.");
 * toast.error("Failed", "Could not save changes.");
 */
export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast, removeToast, clearAll } = context;

  const success = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "success", title, message, duration: 4000 }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "error", title, message, duration: 0 }), // EC-4.6: No auto-dismiss
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "warning", title, message, duration: 6000 }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "info", title, message, duration: 5000 }),
    [addToast]
  );

  const custom = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) =>
      addToast({ type, title, message, duration }),
    [addToast]
  );

  return {
    toast: { success, error, warning, info, custom },
    dismiss: removeToast,
    dismissAll: clearAll,
  };
}
