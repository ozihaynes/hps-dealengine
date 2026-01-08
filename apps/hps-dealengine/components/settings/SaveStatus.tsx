'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

export type SaveStatusType = 'idle' | 'saving' | 'success' | 'error';

/**
 * Motion configuration for status transitions
 */
const STATUS_MOTION = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
  transition: {
    duration: 0.15,
    ease: [0.16, 1, 0.3, 1],
  },
} as const;

interface SaveStatusProps {
  status: SaveStatusType;
  errorMessage?: string;
}

/**
 * SaveStatus
 *
 * Animated indicator for save operations.
 * Shows saving spinner, success check, or error message.
 *
 * Accessibility:
 * - Uses aria-live="polite" for success announcements
 * - Uses role="alert" for error states
 * - Icons are hidden from screen readers
 * - Respects prefers-reduced-motion
 */
export function SaveStatus({ status, errorMessage }: SaveStatusProps): JSX.Element | null {
  if (status === 'idle') {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {status === 'saving' && (
        <motion.div
          key="saving"
          {...STATUS_MOTION}
          className="flex items-center gap-1.5 text-sm text-text-secondary motion-reduce:animate-none"
        >
          <Loader2
            className="w-4 h-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span>Saving...</span>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          key="success"
          {...STATUS_MOTION}
          className="flex items-center gap-1.5 text-sm text-accent-green motion-reduce:animate-none"
          role="status"
          aria-live="polite"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
          <span>Saved</span>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          key="error"
          {...STATUS_MOTION}
          className="flex items-center gap-1.5 text-sm text-accent-red motion-reduce:animate-none"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span>{errorMessage || 'Failed to save'}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
