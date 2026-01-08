"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // 0 = no auto-dismiss (for errors)
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const backgrounds: Record<ToastType, string> = {
  success: "bg-emerald-500/10 border-emerald-500/30",
  error: "bg-red-500/10 border-red-500/30",
  warning: "bg-amber-500/10 border-amber-500/30",
  info: "bg-blue-500/10 border-blue-500/30",
};

export function Toast({ id, type, title, message, duration = 5000, onDismiss }: ToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);
  // EC-4.5: Check reduced motion preference safely (SSR-safe)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  // EC-4.8: Key for animation reset after hover
  const [animationKey, setAnimationKey] = useState(0);

  // SSR-safe reduced motion check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    // EC-4.6: Errors don't auto-dismiss
    if (duration === 0 || type === "error") return;
    // Pause timer on hover
    if (isHovered) return;

    const startTime = Date.now();
    const timer = setTimeout(() => {
      onDismiss(id);
    }, remainingTime);

    return () => {
      clearTimeout(timer);
      // Track remaining time for resume
      const elapsed = Date.now() - startTime;
      setRemainingTime((prev) => Math.max(0, prev - elapsed));
    };
  }, [id, duration, type, isHovered, remainingTime, onDismiss]);

  // EC-4.8: Reset animation when resuming from hover
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setAnimationKey((k) => k + 1);
  }, []);

  const animationProps = prefersReducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -20, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -20, scale: 0.95 },
        transition: { type: "spring" as const, stiffness: 500, damping: 30 },
      };

  return (
    <motion.div
      layout
      {...animationProps}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl
        shadow-lg shadow-black/20 w-full max-w-[420px]
        ${backgrounds[type]}
      `}
      role="alert"
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        {message && <p className="mt-1 text-sm text-slate-400">{message}</p>}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* EC-4.6 & EC-4.8: Progress bar with key for restart */}
      {duration > 0 && type !== "error" && !isHovered && (
        <motion.div
          key={animationKey}
          className="absolute bottom-0 left-0 h-1 bg-white/20 rounded-b-xl"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: remainingTime / 1000, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}
