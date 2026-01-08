"use client";

import { createContext, useCallback, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { Toast, type ToastType } from "./Toast";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE_TOASTS = 3; // EC-4.3: Stack with max 3 visible

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setToasts((prev) => {
      const next = [...prev, { ...toast, id }];
      // EC-4.3: Keep only max visible, remove oldest
      if (next.length > MAX_VISIBLE_TOASTS) {
        return next.slice(-MAX_VISIBLE_TOASTS);
      }
      return next;
    });

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAll }}>
      {children}

      {/* Toast container - responsive positioning (EC-4.3) */}
      <div
        className="fixed z-50 flex flex-col gap-2 pointer-events-none
          top-20 right-4 left-4 sm:left-auto sm:top-4 sm:right-4 sm:w-[420px]"
        aria-label="Notifications"
        role="region"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast
                id={toast.id}
                type={toast.type}
                title={toast.title}
                message={toast.message}
                duration={toast.duration}
                onDismiss={removeToast}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
