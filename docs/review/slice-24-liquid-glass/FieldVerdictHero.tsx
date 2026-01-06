"use client";

import React from "react";
import { Check, AlertTriangle, X } from "lucide-react";
import type { VerdictType } from "@/lib/hooks/useFieldModeData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldVerdictHeroProps {
  verdict: VerdictType;
  verdictReason: string;
  netClearance: number | null;
  bestExit: string | null;
}

// ---------------------------------------------------------------------------
// Verdict Theme Config
// ---------------------------------------------------------------------------

const VERDICT_THEMES: Record<
  VerdictType,
  {
    label: string;
    bgClass: string;
    textClass: string;
    glowClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PURSUE: {
    label: "PURSUE",
    bgClass: "bg-emerald-500/20",
    textClass: "text-emerald-400",
    glowClass: "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
    Icon: Check,
  },
  NEEDS_EVIDENCE: {
    label: "NEEDS EVIDENCE",
    bgClass: "bg-amber-500/20",
    textClass: "text-amber-400",
    glowClass: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    Icon: AlertTriangle,
  },
  PASS: {
    label: "PASS",
    bgClass: "bg-slate-500/20",
    textClass: "text-slate-400",
    glowClass: "shadow-[0_0_20px_rgba(100,116,139,0.2)]",
    Icon: X,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toLocaleString()}`;
}

function formatExitLabel(strategy: string | null): string {
  if (!strategy) return "";
  const labels: Record<string, string> = {
    double_close: "Double Close",
    assignment: "Assignment",
    flip: "Flip",
    wholetail: "Wholetail",
    novation: "Novation",
    sub_to: "Sub-To",
  };
  return labels[strategy] ?? strategy.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FieldVerdictHero
 * 
 * The hero zone showing the verdict and net clearance.
 * This is the primary decision element - largest, most prominent.
 * 
 * Principles Applied:
 * - Hick's Law: One clear answer (PURSUE/NEEDS/PASS)
 * - Gestalt (Figure-Ground): High contrast verdict badge
 * - Peak-End Rule: This is the "peak" moment
 * - Color Psychology: Emerald=go, Amber=caution, Zinc=stop
 * - WCAG: Contrast ≥4.5:1, touch target = full card width
 */
export function FieldVerdictHero({
  verdict,
  verdictReason,
  netClearance,
  bestExit,
}: FieldVerdictHeroProps) {
  const theme = VERDICT_THEMES[verdict];
  const Icon = theme.Icon;

  const hasPositiveNet = netClearance !== null && netClearance > 0;

  return (
    <div
      className={`
        rounded-xl p-6
        ${theme.bgClass}
        ${theme.glowClass}
        border border-white/10
        backdrop-blur-sm
        transition-all duration-300
        ${verdict === "PURSUE" ? "animate-pulse-subtle" : ""}
      `}
      role="region"
      aria-label={`Verdict: ${theme.label}`}
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        {/* Verdict Badge */}
        <div
          className={`
            flex items-center gap-2
            px-5 py-2.5
            rounded-lg
            bg-black/30
            ${theme.textClass}
            font-bold text-xl tracking-wide
          `}
        >
          <Icon className="w-6 h-6" aria-hidden="true" />
          <span>{theme.label}</span>
        </div>

        {/* Verdict Reason */}
        <p className="text-sm text-text-secondary text-center">
          {verdictReason}
        </p>

        {/* Net Clearance (if available) */}
        {netClearance !== null && (
          <div className="flex flex-col items-center gap-1 mt-2">
            <span
              className={`
                text-2xl font-bold
                ${hasPositiveNet ? "text-emerald-400" : "text-red-400"}
              `}
            >
              {formatCurrency(netClearance)}
            </span>
            {bestExit && (
              <span className="text-xs text-text-tertiary">
                net via {formatExitLabel(bestExit)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle pulse animation for PURSUE */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-pulse-subtle {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
