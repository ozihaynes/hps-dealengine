// ============================================================================
// EMPTY COCKPIT — Empty State with CTA
// ============================================================================
// Principles Applied:
// - uiux-art-director: Engaging empty state, clear next action
// - ux-writer: Helpful, actionable copy
// - behavioral-design-strategist: Reduces anxiety, guides action
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { FileText, Mail, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

// ============================================================================
// TYPES
// ============================================================================

interface EmptyCockpitProps {
  /** Deal has repair data but no estimates yet */
  hasRepairData?: boolean;
  /** Callbacks for actions */
  onRequestEstimate?: () => void;
  onManualUpload?: () => void;
  /** Whether to show disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EmptyCockpit = memo(function EmptyCockpit({
  hasRepairData = false,
  onRequestEstimate,
  onManualUpload,
  disabled = false,
  className = "",
}: EmptyCockpitProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      className={`
        bg-slate-900/60 backdrop-blur-sm border border-slate-800 border-dashed
        rounded-xl p-8 md:p-12
        flex flex-col items-center justify-center text-center
        min-h-[300px]
        ${className}
      `}
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          {/* Background glow */}
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl" />

          {/* Icon container */}
          <div className="relative w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-400" />

            {/* Plus badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Plus className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Copy */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mb-6"
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          {hasRepairData
            ? "Ready to Collect Estimates"
            : "No Repair Estimates Yet"}
        </h3>
        <p className="text-sm text-slate-400 max-w-md">
          {hasRepairData
            ? "Your repair scope is ready. Request estimates from contractors or upload estimates you've already received."
            : "Start by defining your repair scope, then collect estimates from contractors to compare bids."}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          type="button"
          onClick={onRequestEstimate}
          disabled={disabled}
          className="
            bg-emerald-600 hover:bg-emerald-500
            text-white font-medium
            px-5 py-2.5
            rounded-lg
            inline-flex items-center gap-2
            transition-all duration-200
            shadow-lg shadow-emerald-500/20
            hover:shadow-emerald-500/30
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <Mail size={16} />
          Request Estimate
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onManualUpload}
          disabled={disabled}
          className="
            bg-transparent
            border border-slate-700 hover:border-slate-600
            text-slate-300 hover:text-slate-200
            font-medium
            px-5 py-2.5
            rounded-lg
            inline-flex items-center gap-2
            transition-all duration-200
          "
        >
          <Upload size={16} />
          Manual Upload
        </Button>
      </motion.div>

      {/* Helper text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-6 text-xs text-slate-500"
      >
        Estimates are stored securely and linked to this deal
      </motion.p>
    </motion.div>
  );
});

export default EmptyCockpit;
