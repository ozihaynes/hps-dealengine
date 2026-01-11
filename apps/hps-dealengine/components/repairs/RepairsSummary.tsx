'use client';

// ============================================================================
// REPAIRS SUMMARY COMPONENT
// ============================================================================
// Principles Applied:
// - Visual Hierarchy: Grand total most prominent (24px, emerald)
// - Information Architecture: Progressive detail (subtotal -> contingency -> total)
// - Action Clarity: Clear CTA buttons with loading states
// - Gestalt Closure: Card boundary creates visual grouping
// ============================================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Download, Send, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/repairsMathEnhanced';
import { repairsDesignTokens } from './designTokens';

interface RepairsSummaryProps {
  /** Sum of all category subtotals */
  grandTotal: number;
  /** Contingency percentage (0-100) */
  contingencyPercent: number;
  /** Computed contingency amount */
  contingencyAmount: number;
  /** Grand total + contingency */
  totalWithContingency: number;
  /** Current rehab level */
  rehabLevel: string;
  /** Export PDF callback */
  onExportPdf: () => void;
  /** Request estimate callback */
  onRequestEstimate?: () => void;
  /** PDF export in progress */
  isExporting?: boolean;
  /** Demo mode */
  isDemoMode?: boolean;
}

const REHAB_LABELS: Record<string, string> = {
  none: 'No Rehab',
  light: 'Light Rehab',
  medium: 'Medium Rehab',
  heavy: 'Heavy Rehab',
  structural: 'Structural',
};

export const RepairsSummary = memo(function RepairsSummary({
  grandTotal,
  contingencyPercent,
  contingencyAmount,
  totalWithContingency,
  rehabLevel,
  onExportPdf,
  onRequestEstimate,
  isExporting = false,
  isDemoMode = false,
}: RepairsSummaryProps) {
  const hasValues = grandTotal > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        ${repairsDesignTokens.card.base}
        ${repairsDesignTokens.card.padding}
        ${isDemoMode ? 'border-2 border-dashed border-amber-500/50' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Repair Summary
        </h3>
        {isDemoMode && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            Demo Mode
          </span>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-3 mb-6">
        {/* Base Estimate */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Detailed Estimate</span>
          <span className="text-base tabular-nums font-medium text-slate-200">
            {formatCurrency(grandTotal)}
          </span>
        </div>

        {/* Contingency */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-400">Contingency</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                color: '#fde047',
              }}
            >
              {contingencyPercent}%
            </span>
            <span className="text-xs text-slate-500">
              ({REHAB_LABELS[rehabLevel] ?? rehabLevel})
            </span>
          </div>
          <span className="text-base tabular-nums font-medium text-amber-400">
            +{formatCurrency(contingencyAmount)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/50" />

        {/* Grand Total */}
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-white">
            Total Repair Budget
          </span>
          <span
            className="text-2xl tabular-nums font-bold text-emerald-400"
            style={repairsDesignTokens.typography.grandTotal}
          >
            {formatCurrency(totalWithContingency)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {/* Export PDF */}
        <button
          type="button"
          onClick={onExportPdf}
          disabled={!hasValues || isExporting}
          className={`
            flex-1 flex items-center justify-center gap-2
            px-4 py-3 rounded-lg font-medium text-sm
            transition-all duration-200
            ${repairsDesignTokens.focus.className}
            ${
              hasValues && !isExporting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }
          `}
          aria-label="Export repair estimate as PDF"
          aria-disabled={!hasValues || isExporting}
          style={{ minHeight: repairsDesignTokens.touchTargets.comfortable }}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" aria-hidden="true" />
              Export PDF
            </>
          )}
        </button>

        {/* Request Estimate (optional) */}
        {onRequestEstimate && (
          <button
            type="button"
            onClick={onRequestEstimate}
            className={`
              flex items-center justify-center gap-2
              px-4 py-3 rounded-lg font-medium text-sm
              bg-slate-700 hover:bg-slate-600 text-white
              transition-all duration-200
              ${repairsDesignTokens.focus.className}
            `}
            aria-label="Request estimate from contractor"
            style={{ minHeight: repairsDesignTokens.touchTargets.comfortable }}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Request GC
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default RepairsSummary;
