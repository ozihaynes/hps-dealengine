'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

export type SaveStatusType = 'idle' | 'saving' | 'success' | 'error';

interface SaveStatusProps {
  status: SaveStatusType;
  errorMessage?: string;
}

/**
 * SaveStatus
 *
 * Animated indicator for save operations.
 * Shows saving spinner, success check, or error message.
 */
export function SaveStatus({ status, errorMessage }: SaveStatusProps) {
  return (
    <AnimatePresence mode="wait">
      {status === 'saving' && (
        <motion.div
          key="saving"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="flex items-center gap-1.5 text-sm text-text-secondary"
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Saving...</span>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="flex items-center gap-1.5 text-sm text-accent-green"
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
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="flex items-center gap-1.5 text-sm text-accent-red"
          role="alert"
        >
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span>{errorMessage || 'Failed to save'}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
