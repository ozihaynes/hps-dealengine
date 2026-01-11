/**
 * RiskStatusCard — Slice 17
 *
 * Summary card showing risk gate status at a glance.
 * Displays 8 gate icons with overall status summary.
 * Click opens Detail Drawer with full gate details.
 *
 * Principles Applied:
 * - Miller's Law: 8 gates is within cognitive limit
 * - Preattentive Processing: Color-coded status
 * - Progressive Disclosure: Summary -> Details in drawer
 *
 * @module components/dashboard/status/RiskStatusCard
 * @version 1.0.0 (Slice 17)
 */

"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import type { EnhancedRiskSummary, RiskGatesResult } from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useDrawer } from "@/components/dashboard/drawer";

// Sub-components
import { GateIcon, type GateStatus } from "./GateIcon";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RiskStatusCardProps {
  /** Enhanced risk summary from engine */
  riskSummary: EnhancedRiskSummary | null | undefined;
  /** Legacy risk gates (fallback) */
  riskGates?: RiskGatesResult | null;
  /** Whether showing demo data */
  isDemoMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface GateData {
  id: string;
  label: string;
  status: GateStatus;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const GATE_LABELS: Record<string, string> = {
  insurability: "Insurability",
  title: "Title",
  flood: "Flood Zone",
  bankruptcy: "Bankruptcy",
  liens: "Liens",
  condition: "Condition",
  market: "Market",
  compliance: "Compliance",
};

const GATE_ORDER = [
  "insurability",
  "title",
  "flood",
  "bankruptcy",
  "liens",
  "condition",
  "market",
  "compliance",
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeGateStatus(status: string | undefined | null): GateStatus {
  if (!status) return "unknown";
  const normalized = status.toLowerCase().trim();
  if (normalized === "pass" || normalized === "passed") return "pass";
  if (normalized === "warning" || normalized === "watch") return "watch";
  if (normalized === "fail" || normalized === "failed" || normalized === "stop") return "fail";
  if (normalized === "blocking" || normalized === "block") return "blocking";
  return "unknown";
}

function extractGatesFromSummary(summary: EnhancedRiskSummary | null): GateData[] {
  if (!summary?.gates) return [];

  return GATE_ORDER.map((gateId) => {
    const gate = summary.gates[gateId as keyof typeof summary.gates];
    const isBlocking = gate?.is_blocking === true;
    let status = normalizeGateStatus(gate?.status);

    // Override to blocking if is_blocking is true
    if (isBlocking && status === "fail") {
      status = "blocking";
    }

    return {
      id: gateId,
      label: GATE_LABELS[gateId] ?? gateId,
      status,
      reason: gate?.reason ?? undefined,
    };
  });
}

function extractGatesFromLegacy(gates: RiskGatesResult | null): GateData[] {
  if (!gates?.gates || !Array.isArray(gates.gates)) return [];

  return GATE_ORDER.map((gateId) => {
    const gate = gates.gates.find((g) => g.gate === gateId);
    if (!gate) {
      return {
        id: gateId,
        label: GATE_LABELS[gateId] ?? gateId,
        status: "unknown" as GateStatus,
      };
    }

    let status = normalizeGateStatus(gate.status);
    if (gate.is_blocking && status === "fail") {
      status = "blocking";
    }

    return {
      id: gateId,
      label: gate.label || GATE_LABELS[gateId] || gateId,
      status,
      reason: gate.reason ?? undefined,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAWER CONTENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function RiskGatesDetailContent({ gates }: { gates: GateData[] }): JSX.Element {
  const STATUS_COLORS: Record<GateStatus, string> = {
    pass: "border-emerald-500/30 bg-emerald-500/10",
    watch: "border-amber-500/30 bg-amber-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    fail: "border-red-500/30 bg-red-500/10",
    blocking: "border-red-500/50 bg-red-500/20",
    unknown: "border-slate-500/30 bg-slate-500/10",
  };

  const STATUS_LABELS: Record<GateStatus, string> = {
    pass: "Passed",
    watch: "Watch",
    warning: "Warning",
    fail: "Failed",
    blocking: "BLOCKING",
    unknown: "Unknown",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Detailed status of all risk assessment gates for this deal.
      </p>

      <div className="space-y-3">
        {gates.map((gate) => (
          <div
            key={gate.id}
            className={cn(
              "rounded-lg border p-3",
              STATUS_COLORS[gate.status]
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{gate.label}</span>
              <GateIcon
                gateId={gate.id}
                label={gate.label}
                status={gate.status}
                size="sm"
              />
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Status: <span className="font-medium">{STATUS_LABELS[gate.status]}</span>
            </div>
            {gate.reason && (
              <div className="mt-2 text-sm text-slate-300">
                {gate.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const RiskStatusCard = memo(function RiskStatusCard({
  riskSummary,
  riskGates,
  isDemoMode = false,
  className,
}: RiskStatusCardProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { openDrawer } = useDrawer();

  // Extract gate data from summary or legacy format
  const gates = useMemo(() => {
    if (riskSummary) {
      return extractGatesFromSummary(riskSummary);
    }
    if (riskGates) {
      return extractGatesFromLegacy(riskGates);
    }
    // Default empty gates
    return GATE_ORDER.map((id): GateData => ({
      id,
      label: GATE_LABELS[id] ?? id,
      status: "unknown",
      reason: undefined,
    }));
  }, [riskSummary, riskGates]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const passCount = gates.filter((g) => g.status === "pass").length;
    const blockingCount = gates.filter((g) => g.status === "blocking").length;
    const failCount = gates.filter((g) => g.status === "fail").length;
    const watchCount = gates.filter((g) => g.status === "watch" || g.status === "warning").length;
    const total = gates.length;

    return { passCount, blockingCount, failCount, watchCount, total };
  }, [gates]);

  // Determine overall status
  const overallStatus = useMemo(() => {
    if (stats.blockingCount > 0) return "blocking";
    if (stats.failCount > 0) return "fail";
    if (stats.watchCount > 0) return "watch";
    if (stats.passCount === stats.total) return "pass";
    return "unknown";
  }, [stats]);

  // Handle click to open drawer
  const handleClick = () => {
    openDrawer({
      title: "Risk Assessment",
      subtitle: `${stats.passCount}/${stats.total} gates passed`,
      content: <RiskGatesDetailContent gates={gates} />,
    });
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className={cn(
        // Layout — min-h ensures alignment with EvidenceStatusCard
        "flex flex-col gap-3 p-4",
        "w-full min-h-[140px]",
        // Styling
        "rounded-xl border",
        "backdrop-blur-xl",
        "border-white/10",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        // Interaction
        "transition-all duration-200",
        "hover:border-white/15 hover:bg-slate-800/70",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900",
        // Cursor
        "cursor-pointer",
        className
      )}
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
      }}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: TIMING.standard, ease: EASING.decelerate }}
      data-testid="risk-status-card"
      data-overall-status={overallStatus}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Risk Gates</span>
          {isDemoMode && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Demo
            </span>
          )}
        </div>
        <span className={cn(
          "text-sm font-bold",
          overallStatus === "pass" && "text-emerald-400",
          overallStatus === "watch" && "text-amber-400",
          overallStatus === "fail" && "text-red-400",
          overallStatus === "blocking" && "text-red-400",
          overallStatus === "unknown" && "text-slate-400"
        )}>
          {stats.passCount}/{stats.total}
        </span>
      </div>

      {/* Gate Icons Row — fixed height for alignment with EvidenceStatusCard */}
      <div className="flex items-center justify-between gap-1 min-h-[32px]">
        {gates.map((gate) => (
          <GateIcon
            key={gate.id}
            gateId={gate.id}
            label={gate.label}
            status={gate.status}
            reason={gate.reason}
            size="sm"
          />
        ))}
      </div>

      {/* Status Summary — flex-1 ensures footer alignment with EvidenceStatusCard */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mt-auto">
        {stats.blockingCount > 0 && (
          <span className="text-red-400 font-medium animate-pulse">
            {stats.blockingCount} blocking
          </span>
        )}
        {stats.failCount > 0 && (
          <span className="text-red-400">
            {stats.failCount} failed
          </span>
        )}
        {stats.watchCount > 0 && (
          <span className="text-amber-400">
            {stats.watchCount} watch
          </span>
        )}
        {stats.passCount === stats.total && (
          <span className="text-emerald-400">All clear ✓</span>
        )}
        {stats.blockingCount === 0 && stats.failCount === 0 && stats.watchCount === 0 && stats.passCount < stats.total && (
          <span>Pending evaluation</span>
        )}
      </div>
    </motion.button>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default RiskStatusCard;
