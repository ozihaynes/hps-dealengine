// ============================================================================
// REPAIR VELOCITY CARD — Status Tracking with Progress
// ============================================================================
// Principles Applied:
// - uiux-art-director: Clear status visualization
// - behavioral-design-strategist: Progress indicators reduce anxiety
// - motion-choreographer: Smooth progress animations
// ============================================================================

"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Send, Eye, Check, AlertTriangle, Zap } from "lucide-react";
import { card, statusColors } from "./designTokens";
import { ProgressBar } from "./ProgressBar";

// ============================================================================
// TYPES
// ============================================================================

interface RepairVelocityCardProps {
  counts: {
    pending: number;
    sent: number;
    viewed: number;
    submitted: number;
    total: number;
  };
  isDemoMode?: boolean;
  className?: string;
}

// ============================================================================
// STATUS PILL COMPONENT
// ============================================================================

interface StatusPillProps {
  status: "pending" | "sent" | "viewed" | "submitted";
  count: number;
  icon: typeof Clock;
  delay?: number;
}

const StatusPill = memo(function StatusPill({
  status,
  count,
  icon: Icon,
  delay = 0,
}: StatusPillProps) {
  const colors = statusColors[status];
  const isPending = status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay, ease: [0, 0, 0.2, 1] }}
      className="flex items-center gap-2 px-3 py-2 rounded-full"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}30`,
      }}
    >
      {/* Animated dot for pending */}
      {isPending && count > 0 ? (
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: colors.border }}
          animate={{
            opacity: [1, 0.5, 1],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ) : (
        <Icon size={14} style={{ color: colors.text }} />
      )}

      <span
        className="text-sm font-medium tabular-nums"
        style={{ color: colors.text }}
      >
        {count}
      </span>

      <span className="text-xs capitalize" style={{ color: colors.text }}>
        {status}
      </span>
    </motion.div>
  );
});

// ============================================================================
// VELOCITY INDICATOR
// ============================================================================

type VelocityLevel = "excellent" | "good" | "warning" | "critical";

function getVelocityLevel(
  counts: RepairVelocityCardProps["counts"]
): VelocityLevel {
  const { pending, submitted, total } = counts;

  if (total === 0) return "good";
  if (submitted === total) return "excellent";
  if (pending === 0) return "good";
  if (pending / total < 0.5) return "warning";
  return "critical";
}

const velocityConfig: Record<
  VelocityLevel,
  { color: string; label: string; icon: typeof Check }
> = {
  excellent: { color: "#22c55e", label: "All Complete", icon: Check },
  good: { color: "#3b82f6", label: "On Track", icon: Zap },
  warning: { color: "#f59e0b", label: "Pending Responses", icon: Clock },
  critical: { color: "#ef4444", label: "Needs Attention", icon: AlertTriangle },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const RepairVelocityCard = memo(function RepairVelocityCard({
  counts,
  isDemoMode = false,
  className = "",
}: RepairVelocityCardProps) {
  const { pending, sent, viewed, submitted, total } = counts;

  const completionRate = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((submitted / total) * 100);
  }, [submitted, total]);

  const velocityLevel = useMemo(() => getVelocityLevel(counts), [counts]);
  const velocity = velocityConfig[velocityLevel];
  const VelocityIcon = velocity.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: [0, 0, 0.2, 1] }}
      className={`
        ${card.base}
        ${card.hover}
        ${card.padding}
        relative overflow-hidden
        ${isDemoMode ? "border-dashed" : ""}
        ${className}
      `}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          SCREEN READER STATUS ANNOUNCEMENT
          Principle: POUR-Perceivable — status changes announced to AT users
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Estimate pipeline: {submitted} of {total} submitted.
        {pending > 0 && ` ${pending} pending.`}
        {sent > 0 && ` ${sent} sent.`}
        {viewed > 0 && ` ${viewed} viewed.`}
      </div>

      {/* Demo badge */}
      {isDemoMode && (
        <span className="absolute top-3 right-3 text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
          Demo
        </span>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Zap className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-400">
            Estimate Velocity
          </span>
        </div>

        {/* Velocity Indicator */}
        <div
          className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
          style={{
            backgroundColor: `${velocity.color}20`,
            color: velocity.color,
          }}
        >
          <VelocityIcon size={12} />
          <span>{velocity.label}</span>
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <StatusPill status="pending" count={pending} icon={Clock} delay={0.2} />
        <StatusPill status="sent" count={sent} icon={Send} delay={0.25} />
        <StatusPill status="viewed" count={viewed} icon={Eye} delay={0.3} />
        <StatusPill
          status="submitted"
          count={submitted}
          icon={Check}
          delay={0.35}
        />
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <ProgressBar
          value={submitted}
          max={total || 1}
          color={velocity.color}
          height="md"
          label={`${completionRate}% of estimates submitted`}
        />

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {submitted} of {total} submitted
          </span>
          <span className="font-mono text-slate-400">{completionRate}%</span>
        </div>
      </div>
    </motion.div>
  );
});

export default RepairVelocityCard;
