'use client';

// ============================================================================
// CATEGORY SUBTOTAL COMPONENT
// ============================================================================
// Principles Applied:
// - Gestalt Proximity: Icon + title + count grouped left, subtotal right
// - Visual Hierarchy: Subtotal most prominent (bold, colored)
// - Color Coding: Each category has unique accent from designTokens
// - WCAG AA: Keyboard accessible, ARIA labels, 44px touch target
// - Miller's Law: Progressive disclosure via expand/collapse
// ============================================================================

import { memo, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { repairsDesignTokens, getCategoryColors } from './designTokens';
import { formatCurrency } from '@/lib/repairsMathEnhanced';

interface CategorySubtotalProps {
  /** Category identifier for color coding */
  categoryKey: string;
  /** Display title */
  title: string;
  /** Computed subtotal */
  subtotal: number;
  /** Total items in category */
  itemCount: number;
  /** Items with values > 0 */
  activeItemCount: number;
  /** Is category expanded */
  isExpanded: boolean;
  /** Toggle expand/collapse */
  onToggle: () => void;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Demo mode styling */
  isDemoMode?: boolean;
}

export const CategorySubtotal = memo(function CategorySubtotal({
  categoryKey,
  title,
  subtotal,
  itemCount,
  activeItemCount,
  isExpanded,
  onToggle,
  icon,
  isDemoMode = false,
}: CategorySubtotalProps) {
  const colors = getCategoryColors(categoryKey);
  const prefersReducedMotion = useReducedMotion();

  // Track previous subtotal for animation trigger
  const [prevSubtotal, setPrevSubtotal] = useState(subtotal);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (subtotal !== prevSubtotal && subtotal > 0) {
      setShouldAnimate(true);
      setPrevSubtotal(subtotal);
      const timer = setTimeout(() => setShouldAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [subtotal, prevSubtotal]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`${title} category, ${activeItemCount} of ${itemCount} items, subtotal ${formatCurrency(subtotal)}`}
      className={`
        w-full flex items-center justify-between
        px-4 py-3 rounded-lg
        transition-all duration-200
        ${repairsDesignTokens.focus.className}
        ${isDemoMode ? 'border-2 border-dashed border-amber-500/50' : ''}
      `}
      style={{
        backgroundColor: subtotal > 0 ? colors.bg : 'transparent',
        borderColor: subtotal > 0 ? colors.border : 'transparent',
        borderWidth: subtotal > 0 && !isDemoMode ? '1px' : undefined,
        borderStyle: subtotal > 0 && !isDemoMode ? 'solid' : undefined,
        minHeight: repairsDesignTokens.touchTargets.min,
      }}
    >
      {/* Left side: Icon + Title + Count */}
      <div className="flex items-center gap-3">
        {/* Expand/Collapse Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </motion.div>

        {/* Category Icon */}
        {icon && (
          <span
            className="flex-shrink-0"
            style={{ color: colors.text }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {/* Title + Count */}
        <div className="flex items-center gap-2">
          <span
            className="font-semibold text-sm"
            style={{ color: subtotal > 0 ? colors.text : '#94a3b8' }}
          >
            {title}
          </span>

          {/* Item Count Badge */}
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor:
                activeItemCount > 0
                  ? colors.bg
                  : 'rgba(148, 163, 184, 0.1)',
              color: activeItemCount > 0 ? colors.text : '#64748b',
            }}
          >
            {activeItemCount}/{itemCount}
          </span>

          {isDemoMode && (
            <span className="text-xs text-amber-400 font-medium">(Demo)</span>
          )}
        </div>
      </div>

      {/* Right side: Subtotal */}
      <motion.div
        animate={
          shouldAnimate && !prefersReducedMotion
            ? repairsDesignTokens.animations.subtotalUpdate.animate
            : {}
        }
        transition={repairsDesignTokens.animations.subtotalUpdate.transition}
        className="tabular-nums font-bold text-base"
        style={{
          color: subtotal > 0 ? colors.text : '#64748b',
        }}
      >
        {formatCurrency(subtotal)}
      </motion.div>
    </button>
  );
});

export default CategorySubtotal;
