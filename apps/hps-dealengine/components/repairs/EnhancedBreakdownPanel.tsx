// ============================================================================
// ENHANCED BREAKDOWN PANEL — Category List with Progress Visualization
// ============================================================================
// Principles Applied:
// - uiux-art-director: Clear hierarchy, proportional progress bars
// - behavioral-design-strategist: Progressive disclosure reduces cognitive load
// - motion-choreographer: Staggered reveal, smooth expand/collapse
// ============================================================================

"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Hammer,
  Home,
  Zap,
  Droplets,
  Wind,
  Paintbrush,
  DoorOpen,
  Layers,
  ChefHat,
  Bath,
  TreePine,
  Wrench,
  FileText,
} from "lucide-react";
import { CategoryRow } from "./CategoryRow";
import { MultiProgressBar } from "./ProgressBar";
import { card, getCategoryColors } from "./designTokens";

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

interface CategoryBreakdown {
  id: string;
  name: string;
  subtotal: number;
  itemCount: number;
  items?: LineItem[];
}

interface EnhancedBreakdownPanelProps {
  categories: CategoryBreakdown[];
  totalBudget: number;
  onCategoryClick?: (categoryId: string) => void;
  expandedCategories?: string[];
  isDemoMode?: boolean;
  className?: string;
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const categoryIcons: Record<string, typeof Hammer> = {
  demolition: Hammer,
  roofing: Home,
  electrical: Zap,
  plumbing: Droplets,
  hvac: Wind,
  interior: Paintbrush,
  exterior: TreePine,
  windowsdoors: DoorOpen,
  windows: DoorOpen,
  doors: DoorOpen,
  flooring: Layers,
  kitchen: ChefHat,
  bathrooms: Bath,
  bathroom: Bath,
  foundation: Home,
  permits: FileText,
  misc: Wrench,
  miscellaneous: Wrench,
};

function getCategoryIcon(categoryName: string): typeof Hammer {
  const key = categoryName.toLowerCase().replace(/[^a-z]/g, "");
  return categoryIcons[key] || Wrench;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EnhancedBreakdownPanel = memo(function EnhancedBreakdownPanel({
  categories,
  totalBudget,
  onCategoryClick,
  expandedCategories: controlledExpanded,
  isDemoMode = false,
  className = "",
}: EnhancedBreakdownPanelProps) {
  // Local state for uncontrolled mode
  const [localExpanded, setLocalExpanded] = useState<string[]>([]);
  const expanded = controlledExpanded ?? localExpanded;

  const handleToggle = useCallback(
    (categoryId: string) => {
      if (onCategoryClick) {
        onCategoryClick(categoryId);
      } else {
        setLocalExpanded((prev) =>
          prev.includes(categoryId)
            ? prev.filter((id) => id !== categoryId)
            : [...prev, categoryId]
        );
      }
    },
    [onCategoryClick]
  );

  // Build segments for multi-progress bar
  const progressSegments = useMemo(() => {
    return categories
      .filter((cat) => cat.subtotal > 0)
      .map((cat) => {
        const categoryKey = cat.name.toLowerCase().replace(/[^a-z]/g, "");
        const colors = getCategoryColors(categoryKey);
        return {
          value: cat.subtotal,
          color: colors.border,
          label: cat.name,
        };
      });
  }, [categories]);

  // Sort categories by subtotal (highest first)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => b.subtotal - a.subtotal);
  }, [categories]);

  // Empty state
  if (categories.length === 0) {
    return (
      <div
        className={`
          ${card.base}
          ${card.padding}
          flex flex-col items-center justify-center
          min-h-[200px]
          ${className}
        `}
      >
        <Layers className="w-10 h-10 text-slate-600 mb-3" />
        <p className="text-sm text-slate-400 text-center">
          No repair categories defined
        </p>
        <p className="text-xs text-slate-500 text-center mt-1">
          Add line items to see the breakdown
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25, ease: [0, 0, 0.2, 1] }}
      className={`
        ${card.base}
        p-4
        ${isDemoMode ? "border-dashed" : ""}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">
            Budget Breakdown
          </h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {categories.length} categories
          </span>
        </div>

        {isDemoMode && (
          <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
            Demo
          </span>
        )}
      </div>

      {/* Combined Progress Bar */}
      <div className="mb-4">
        <MultiProgressBar
          segments={progressSegments}
          total={totalBudget}
          height="md"
        />
      </div>

      {/* Category Legend (top categories) */}
      <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-slate-800">
        {sortedCategories.slice(0, 5).map((cat) => {
          const categoryKey = cat.name.toLowerCase().replace(/[^a-z]/g, "");
          const colors = getCategoryColors(categoryKey);
          const percentage =
            totalBudget > 0 ? ((cat.subtotal / totalBudget) * 100).toFixed(0) : 0;

          return (
            <div key={cat.id} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.border }}
              />
              <span className="text-slate-400">{cat.name}</span>
              <span className="text-slate-500 tabular-nums">{percentage}%</span>
            </div>
          );
        })}
        {sortedCategories.length > 5 && (
          <span className="text-xs text-slate-500">
            +{sortedCategories.length - 5} more
          </span>
        )}
      </div>

      {/* Category Rows */}
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.03 },
          },
        }}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {sortedCategories.map((category) => {
          const Icon = getCategoryIcon(category.name);

          return (
            <motion.div
              key={category.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <CategoryRow
                id={category.id}
                name={category.name}
                icon={<Icon size={16} className="text-slate-300" />}
                subtotal={category.subtotal}
                totalBudget={totalBudget}
                itemCount={category.itemCount}
                items={category.items}
                isExpanded={expanded.includes(category.id)}
                onToggle={handleToggle}
                isDemoMode={isDemoMode}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
});

export default EnhancedBreakdownPanel;
