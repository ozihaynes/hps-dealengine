'use client';

// ============================================================================
// ENHANCED REPAIRS SECTION COMPONENT
// ============================================================================
// Principles Applied:
// - Additive Enhancement: Renders alongside existing Quick Estimate/Big 5
// - Miller's Law: Progressive disclosure via expand/collapse
// - WCAG AA: Full accessibility
// - State Management: Uses callbacks for updates, doesn't manage state
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CategorySubtotal } from './CategorySubtotal';
import { EnhancedLineItemRow } from './EnhancedLineItemRow';
import { RepairsSummary } from './RepairsSummary';
import { estimatorSectionsV2 } from '@/constants';
import { computeLineItemTotal } from '@/lib/repairsMathEnhanced';
import type {
  EnhancedEstimatorState,
  EnhancedLineItem,
  EstimatorItemDefV2,
} from '@hps-internal/contracts';

interface EnhancedRepairsSectionProps {
  /** Enhanced estimator state (V2) */
  enhancedEstimatorState: EnhancedEstimatorState;
  /** Update line item callback */
  onLineItemUpdate: (
    categoryKey: string,
    itemKey: string,
    updates: Partial<EnhancedLineItem>
  ) => void;
  /** Export PDF callback */
  onExportPdf: () => void;
  /** PDF export in progress */
  isExportingPdf: boolean;
  /** Current rehab level */
  rehabLevel: string;
  /** Demo mode */
  isDemoMode?: boolean;
  /** Optional: Request GC estimate callback */
  onRequestEstimate?: () => void;
}

export function EnhancedRepairsSection({
  enhancedEstimatorState,
  onLineItemUpdate,
  onExportPdf,
  isExportingPdf,
  rehabLevel,
  isDemoMode = false,
  onRequestEstimate,
}: EnhancedRepairsSectionProps) {
  // Track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = useCallback((categoryKey: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryKey)
        ? prev.filter((k) => k !== categoryKey)
        : [...prev, categoryKey]
    );
  }, []);

  // Sort categories by displayOrder
  const sortedCategories = useMemo(() => {
    return Object.entries(estimatorSectionsV2).sort(
      ([, a], [, b]) => a.displayOrder - b.displayOrder
    );
  }, []);

  // Count total categories and items
  const { totalCategories, totalItems, activeItems } = useMemo(() => {
    let items = 0;
    let active = 0;

    for (const [, sectionDef] of sortedCategories) {
      items += Object.keys(sectionDef.items).length;
    }

    for (const category of Object.values(enhancedEstimatorState.categories ?? {})) {
      for (const item of category?.items ?? []) {
        if (computeLineItemTotal(item) > 0) {
          active++;
        }
      }
    }

    return {
      totalCategories: sortedCategories.length,
      totalItems: items,
      activeItems: active,
    };
  }, [sortedCategories, enhancedEstimatorState.categories]);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Detailed Estimate
          <span className="ml-2 text-sm text-slate-400 font-normal">
            ({totalCategories} Categories, {totalItems} Items)
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {activeItems > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
              {activeItems} active
            </span>
          )}
          {isDemoMode && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
              Demo Mode
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CATEGORY LIST
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        {sortedCategories.map(([categoryKey, sectionDef]) => {
          const category = enhancedEstimatorState.categories[categoryKey];
          if (!category) return null;

          // Count items with values > 0
          const activeCount = category.items.filter(
            (item) => computeLineItemTotal(item) > 0
          ).length;

          const isExpanded = expandedCategories.includes(categoryKey);

          return (
            <div key={categoryKey}>
              {/* Category Header */}
              <CategorySubtotal
                categoryKey={categoryKey}
                title={sectionDef.title}
                subtotal={category.subtotal}
                itemCount={category.items.length}
                activeItemCount={activeCount}
                isExpanded={isExpanded}
                onToggle={() => toggleCategory(categoryKey)}
                isDemoMode={isDemoMode}
              />

              {/* Expandable Line Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="ml-6 mt-1 mb-2 border-l border-slate-700 pl-4 overflow-hidden"
                  >
                    {category.items.map((item) => {
                      // Get item definition from constants
                      const itemDef = sectionDef.items[
                        item.itemKey
                      ] as EstimatorItemDefV2 | undefined;
                      if (!itemDef) {
                        console.warn(
                          `[EnhancedRepairsSection] Missing itemDef for ${categoryKey}.${item.itemKey}`
                        );
                        return null;
                      }

                      return (
                        <EnhancedLineItemRow
                          key={item.itemKey}
                          item={item}
                          itemDef={itemDef}
                          onUpdate={(updates) =>
                            onLineItemUpdate(categoryKey, item.itemKey, updates)
                          }
                          isDemoMode={isDemoMode}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SUMMARY WITH CONTINGENCY + PDF EXPORT
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="mt-8">
        <RepairsSummary
          grandTotal={enhancedEstimatorState.grandTotal}
          contingencyPercent={enhancedEstimatorState.contingencyPercent}
          contingencyAmount={enhancedEstimatorState.contingencyAmount}
          totalWithContingency={enhancedEstimatorState.totalWithContingency}
          rehabLevel={rehabLevel}
          onExportPdf={onExportPdf}
          onRequestEstimate={onRequestEstimate}
          isExporting={isExportingPdf}
          isDemoMode={isDemoMode}
        />
      </div>
    </div>
  );
}

export default EnhancedRepairsSection;
