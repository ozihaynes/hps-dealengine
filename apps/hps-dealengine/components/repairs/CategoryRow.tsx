// ============================================================================
// CATEGORY ROW — Expandable Category with Progress Bar
// ============================================================================
// Principles Applied:
// - uiux-art-director: Clear hierarchy, proportional visualization
// - motion-choreographer: Smooth expand/collapse with stagger
// - accessibility-champion: Keyboard accessible, ARIA expanded state
// ============================================================================

"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { getCategoryColors, focus } from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

interface LineItem {
  id: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  total: number;
}

interface CategoryRowProps {
  id: string;
  name: string;
  icon?: React.ReactNode;
  subtotal: number;
  totalBudget: number;
  itemCount: number;
  items?: LineItem[];
  isExpanded?: boolean;
  onToggle?: (id: string) => void;
  isDemoMode?: boolean;
  className?: string;
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// LINE ITEM ROW
// ============================================================================

interface LineItemRowProps {
  item: LineItem;
  delay: number;
}

const LineItemRow = memo(function LineItemRow({
  item,
  delay,
}: LineItemRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.15, delay }}
      className="flex items-center justify-between py-2.5 px-4 text-sm border-t border-slate-800/50"
    >
      <div className="flex-1 min-w-0 mr-4">
        <span className="text-slate-300 truncate block">
          {item.description}
        </span>
        {item.quantity && item.unit && (
          <span className="text-xs text-slate-500">
            {item.quantity} {item.unit}
            {item.unitCost && ` × ${formatCurrency(item.unitCost)}`}
          </span>
        )}
      </div>
      <span className="font-mono text-sm text-slate-200 tabular-nums flex-shrink-0">
        {formatCurrency(item.total)}
      </span>
    </motion.div>
  );
});

// ============================================================================
// COMPONENT
// ============================================================================

export const CategoryRow = memo(function CategoryRow({
  id,
  name,
  icon,
  subtotal,
  totalBudget,
  itemCount,
  items = [],
  isExpanded = false,
  onToggle,
  isDemoMode = false,
  className = "",
}: CategoryRowProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggle ? isExpanded : localExpanded;

  const percentage = totalBudget > 0 ? (subtotal / totalBudget) * 100 : 0;
  const categoryKey = name.toLowerCase().replace(/[^a-z]/g, "");
  const colors = getCategoryColors(categoryKey);

  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle(id);
    } else {
      setLocalExpanded((prev) => !prev);
    }
  }, [id, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className={`
        bg-slate-900/60 backdrop-blur-sm
        border border-slate-800
        rounded-lg
        overflow-hidden
        transition-all duration-200
        hover:border-slate-700
        ${isDemoMode ? "border-dashed" : ""}
        ${className}
      `}
    >
      {/* Header Row */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`category-${id}-items`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-3 p-4
          cursor-pointer
          transition-colors duration-150
          hover:bg-slate-800/30
          ${focus.className}
        `}
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}30` }}
        >
          {icon || (
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + Item Count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">
              {name}
            </span>
            {itemCount > 0 && (
              <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
        </div>

        {/* Amount + Percentage */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <span className="font-mono text-sm font-medium text-slate-200 tabular-nums">
              {formatCurrency(subtotal)}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              ({percentage.toFixed(1)}%)
            </span>
          </div>

          {/* Expand Chevron */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-500"
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </div>

      {/* Progress Bar (always visible) */}
      <div className="px-4 pb-3">
        <ProgressBar
          value={subtotal}
          max={totalBudget || 1}
          color={colors.border}
          height="sm"
          label={`${name}: ${percentage.toFixed(1)}% of total budget`}
        />
      </div>

      {/* Expanded Line Items */}
      <AnimatePresence>
        {expanded && items.length > 0 && (
          <motion.div
            id={`category-${id}-items`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="border-t border-slate-800 bg-slate-900/40 overflow-hidden"
          >
            {items.map((item, index) => (
              <LineItemRow
                key={item.id}
                item={item}
                delay={index * 0.03}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default CategoryRow;
