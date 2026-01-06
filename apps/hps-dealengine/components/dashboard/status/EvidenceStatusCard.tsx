/**
 * EvidenceStatusCard — Slice 17
 *
 * Progress bar showing evidence collection status.
 * Displays percentage complete with missing count.
 * Click opens Detail Drawer with evidence checklist.
 *
 * Progress Colors:
 * - 0-25%: Red (critical)
 * - 25-50%: Amber (low)
 * - 50-75%: Yellow (medium)
 * - 75-100%: Emerald (good)
 *
 * Principles Applied:
 * - Progressive Disclosure: Summary -> Checklist in drawer
 * - Status Visibility: Color-coded progress
 * - Accessibility: Screen reader announcements
 *
 * @module components/dashboard/status/EvidenceStatusCard
 * @version 1.0.1 (Slice 17 - Polish)
 */

"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import type { EvidenceHealth } from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useDrawer } from "@/components/dashboard/drawer";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EvidenceStatusCardProps {
  /** Evidence health data from engine */
  evidenceHealth: EvidenceHealth | null | undefined;
  /** Whether showing demo data */
  isDemoMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getProgressColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-yellow-500";
  if (pct >= 25) return "bg-amber-500";
  return "bg-red-500";
}

function getProgressTextColor(pct: number): string {
  if (pct >= 75) return "text-emerald-400";
  if (pct >= 50) return "text-yellow-400";
  if (pct >= 25) return "text-amber-400";
  return "text-red-400";
}

function getProgressLabel(pct: number): string {
  if (pct >= 100) return "Complete";
  if (pct >= 75) return "Good";
  if (pct >= 50) return "Medium";
  if (pct >= 25) return "Low";
  return "Critical";
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAWER CONTENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function EvidenceChecklistContent({ health }: { health: EvidenceHealth }): JSX.Element {
  const items = health.items ?? [];

  const STATUS_STYLES = {
    fresh: { icon: "✓", color: "text-emerald-400", bg: "bg-emerald-500/20" },
    collected: { icon: "✓", color: "text-emerald-400", bg: "bg-emerald-500/20" },
    stale: { icon: "⚠", color: "text-amber-400", bg: "bg-amber-500/20" },
    missing: { icon: "✗", color: "text-red-400", bg: "bg-red-500/20" },
    pending: { icon: "○", color: "text-slate-400", bg: "bg-slate-500/20" },
  } as const;

  // Defensive field access
  const collectedCount = health.fresh_count ?? 0;
  const staleCount = health.stale_count ?? 0;
  const missingCount = health.missing_count ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Evidence documents required for deal underwriting.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-emerald-400 font-bold">
            {collectedCount}
          </div>
          <div className="text-slate-500">Collected</div>
        </div>
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
          <div className="text-amber-400 font-bold">
            {staleCount}
          </div>
          <div className="text-slate-500">Stale</div>
        </div>
        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
          <div className="text-red-400 font-bold">
            {missingCount}
          </div>
          <div className="text-slate-500">Missing</div>
        </div>
      </div>

      {/* Evidence items list */}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const status = item.status ?? "missing";
          const style = STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.missing;

          return (
            <div
              key={item.evidence_type ?? idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-white/10"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm text-slate-200 truncate">
                  {item.label ?? item.evidence_type}
                </span>
                {item.is_critical && (
                  <span className="px-1 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                    Critical
                  </span>
                )}
              </div>
              <span className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0",
                style.bg, style.color
              )}>
                {style.icon} {status}
              </span>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-4 text-sm text-slate-500">
            No evidence items tracked
          </div>
        )}
      </div>

      {/* Recommended action */}
      {health.recommended_action && (
        <div className="pt-2 border-t border-white/10">
          <span className="text-xs text-slate-400">
            Recommended: {health.recommended_action}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const EvidenceStatusCard = memo(function EvidenceStatusCard({
  evidenceHealth,
  isDemoMode = false,
  className,
}: EvidenceStatusCardProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { openDrawer } = useDrawer();

  // Calculate stats with defensive field access
  const stats = useMemo(() => {
    if (!evidenceHealth) {
      return { collected: 0, total: 0, pct: 0, missing: 0, critical: 0 };
    }

    const collected = evidenceHealth.fresh_count ?? 0;
    const total = evidenceHealth.items?.length ?? 0;
    const missing = evidenceHealth.missing_count ?? 0;
    // Use missing_critical array length for accurate count
    const critical = evidenceHealth.missing_critical?.length ??
                     (evidenceHealth.any_critical_missing ? 1 : 0);
    const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

    return { collected, total, pct, missing, critical };
  }, [evidenceHealth]);

  // Handle click to open drawer
  const handleClick = () => {
    if (!evidenceHealth) return;

    openDrawer({
      title: "Evidence Checklist",
      subtitle: `${stats.collected}/${stats.total} documents collected`,
      content: <EvidenceChecklistContent health={evidenceHealth} />,
    });
  };

  const progressColor = getProgressColor(stats.pct);
  const textColor = getProgressTextColor(stats.pct);
  const progressLabel = getProgressLabel(stats.pct);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={!evidenceHealth}
      className={cn(
        // Layout
        "flex flex-col gap-3 p-4",
        "w-full",
        // Styling
        "rounded-xl border",
        "bg-blue-500/10 backdrop-blur-xl",
        "border-white/10",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        // Interaction
        "transition-all duration-200",
        evidenceHealth && "hover:border-white/15 hover:bg-slate-800/70 cursor-pointer",
        !evidenceHealth && "opacity-60 cursor-not-allowed",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900",
        className
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: TIMING.standard, ease: EASING.decelerate }}
      data-testid="evidence-status-card"
      data-progress={stats.pct}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Evidence</span>
          {isDemoMode && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Demo
            </span>
          )}
        </div>
        <span className={cn("text-sm font-bold", textColor)}>
          {stats.pct}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full">
        {/* Track */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          {/* Fill */}
          <motion.div
            className={cn("h-full rounded-full", progressColor)}
            initial={{ width: 0 }}
            animate={{ width: `${stats.pct}%` }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.8,
              ease: EASING.decelerate,
            }}
          />
        </div>

        {/* 100% checkmark */}
        {stats.pct >= 100 && (
          <motion.span
            className="absolute -right-1 -top-1 text-emerald-400 text-sm"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            ✓
          </motion.span>
        )}
      </div>

      {/* Status Summary */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {stats.collected}/{stats.total} collected
        </span>
        <span className={textColor}>
          {progressLabel}
        </span>
      </div>

      {/* Critical Missing Warning */}
      {stats.critical > 0 && (
        <div className="flex items-center gap-1 text-xs text-red-400">
          <span className="animate-pulse">⚠</span>
          <span>{stats.critical} critical missing</span>
        </div>
      )}
    </motion.button>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default EvidenceStatusCard;
