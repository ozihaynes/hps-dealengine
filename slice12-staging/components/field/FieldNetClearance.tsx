"use client";

import React from "react";
import { Star } from "lucide-react";
import type { FieldModeExit } from "@/lib/hooks/useFieldModeData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldNetClearanceProps {
  exits: FieldModeExit[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Exit Card Component
// ---------------------------------------------------------------------------

function ExitCard({ exit }: { exit: FieldModeExit }) {
  const hasPositiveNet =
    exit.netClearance !== null && exit.netClearance > 0;
  const hasNegativeNet =
    exit.netClearance !== null && exit.netClearance < 0;

  return (
    <div
      className={`
        flex-shrink-0
        w-28
        rounded-lg
        border
        p-3
        min-h-[72px]
        flex flex-col justify-between
        ${exit.isRecommended
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-surface-secondary/50 border-white/5"
        }
      `}
      role="listitem"
    >
      {/* Strategy Label */}
      <div className="flex items-center gap-1">
        {exit.isRecommended && (
          <Star
            className="w-3 h-3 text-emerald-400 flex-shrink-0"
            fill="currentColor"
            aria-label="Recommended"
          />
        )}
        <span
          className={`
            text-xs font-medium truncate
            ${exit.isRecommended ? "text-emerald-400" : "text-text-secondary"}
          `}
        >
          {exit.label}
        </span>
      </div>

      {/* Net Clearance */}
      <span
        className={`
          text-lg font-bold mt-1
          ${hasPositiveNet
            ? "text-emerald-400"
            : hasNegativeNet
              ? "text-red-400"
              : "text-text-primary"
          }
        `}
      >
        {formatCurrency(exit.netClearance)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FieldNetClearance
 * 
 * Horizontal scrollable cards showing net clearance by exit strategy.
 * Recommended strategy highlighted with star icon.
 * 
 * Principles Applied:
 * - Miller's Law: Usually 3-4 exits (within 7±2)
 * - Gestalt (Similarity): Consistent card structure
 * - Fitts's Law: Cards ≥48px height, horizontal scroll for easy thumb swipe
 * - Color Psychology: Green=profit, Red=loss
 * - WCAG: Color not sole indicator (star icon for recommended)
 */
export function FieldNetClearance({ exits }: FieldNetClearanceProps) {
  if (exits.length === 0) {
    return (
      <div
        className={`
          rounded-xl
          bg-surface-secondary/50
          border border-white/5
          backdrop-blur-sm
          p-4
        `}
      >
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
          Net by Exit
        </h3>
        <p className="text-sm text-text-tertiary">
          No exit strategies calculated
        </p>
      </div>
    );
  }

  // Sort: recommended first, then by net clearance descending
  const sortedExits = [...exits].sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return (b.netClearance ?? 0) - (a.netClearance ?? 0);
  });

  return (
    <div
      className={`
        rounded-xl
        bg-surface-secondary/50
        border border-white/5
        backdrop-blur-sm
        p-4
      `}
      role="region"
      aria-label="Net Clearance by Exit Strategy"
    >
      {/* Header */}
      <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
        Net by Exit
      </h3>

      {/* Horizontal Scroll Container */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin"
        role="list"
        aria-label="Exit strategies"
      >
        {sortedExits.map((exit) => (
          <ExitCard key={exit.strategy} exit={exit} />
        ))}
      </div>

      {/* Scroll hint for small screens */}
      {sortedExits.length > 3 && (
        <p className="text-xs text-text-tertiary mt-2 text-center md:hidden">
          Swipe for more →
        </p>
      )}

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
