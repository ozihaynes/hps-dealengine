/**
 * PipelineSummary — Verdict counts display
 *
 * @module components/deals/PipelineSummary
 * @version 1.0.0 (Slice 19)
 */

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/components/ui";
import type { PipelineCounts } from "@/lib/hooks/useDealsFilter";

export interface PipelineSummaryProps {
  counts: PipelineCounts;
  className?: string;
  testId?: string;
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

interface CountItemProps {
  label: string;
  count: number;
  colorClass: string;
  dotClass: string;
}

function CountItem({ label, count, colorClass, dotClass }: CountItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn("w-2 h-2 rounded-full", dotClass)}
        aria-hidden="true"
      />
      <span className={cn("text-sm font-semibold", colorClass)}>{count}</span>
      <span className="text-xs text-zinc-500 hidden sm:inline">{label}</span>
    </div>
  );
}

export const PipelineSummary = memo(function PipelineSummary({
  counts,
  className,
  testId,
}: PipelineSummaryProps) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex flex-wrap items-center gap-4 sm:gap-6",
        "p-4 rounded-lg",
        "bg-zinc-900/60 border border-zinc-700/50",
        className
      )}
      data-testid={testId ?? "pipeline-summary"}
      role="region"
      aria-label="Deal pipeline summary"
    >
      {/* Total */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-zinc-100">{counts.total}</span>
        <span className="text-sm text-zinc-400">Deals</span>
      </div>

      <div className="h-6 w-px bg-zinc-700" aria-hidden="true" />

      {/* Pursue */}
      <CountItem
        label="Pursue"
        count={counts.pursue}
        colorClass="text-emerald-400"
        dotClass="bg-emerald-500"
      />

      {/* Needs Evidence */}
      <CountItem
        label="Needs"
        count={counts.needsEvidence}
        colorClass="text-amber-400"
        dotClass="bg-amber-500"
      />

      {/* Pass */}
      <CountItem
        label="Pass"
        count={counts.pass}
        colorClass="text-zinc-400"
        dotClass="bg-zinc-500"
      />

      {/* Pending */}
      <CountItem
        label="Pending"
        count={counts.pending}
        colorClass="text-zinc-500"
        dotClass="bg-zinc-600"
      />
    </motion.div>
  );
});

export default PipelineSummary;
