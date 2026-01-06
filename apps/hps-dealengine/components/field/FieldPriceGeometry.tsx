"use client";

import React from "react";
import type { FieldModePriceGeometry } from "@/lib/hooks/useFieldModeData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldPriceGeometryProps {
  geometry: FieldModePriceGeometry;
}

interface MetricTileProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: "default" | "success" | "warning" | "muted";
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
    return `${sign}$${(absValue / 1000).toFixed(0)}K`;
  }
  return `${sign}$${absValue.toLocaleString()}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Metric Tile Component
// ---------------------------------------------------------------------------

const VARIANT_STYLES = {
  default: "text-text-primary",
  success: "text-emerald-400",
  warning: "text-amber-400",
  muted: "text-text-tertiary",
};

function MetricTile({ label, value, subtext, variant = "default" }: MetricTileProps) {
  return (
    <div
      className={`
        rounded-lg
        bg-surface-secondary/50
        border border-white/5
        backdrop-blur-sm
        p-4
        min-h-[60px]
        flex flex-col justify-center
      `}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <span className="text-xs text-text-tertiary uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className={`text-lg font-semibold ${VARIANT_STYLES[variant]}`}>
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-text-tertiary mt-0.5">{subtext}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FieldPriceGeometry
 * 
 * 2x2 grid showing ZOPA, Spread, MAO, and Floor.
 * Compact layout optimized for mobile glanceability.
 * 
 * Principles Applied:
 * - Miller's Law: Only 4 metrics (within 7±2)
 * - Gestalt (Proximity): Related metrics grouped in grid
 * - Fitts's Law: Each tile ≥48px height for touch
 * - WCAG: Contrast ≥4.5:1 for text
 */
export function FieldPriceGeometry({ geometry }: FieldPriceGeometryProps) {
  const {
    zopa,
    zopaPercent,
    mao,
    floor,
    hasZopa,
  } = geometry;

  return (
    <div
      className="grid grid-cols-2 gap-3"
      role="region"
      aria-label="Price Geometry"
    >
      {/* ZOPA */}
      <MetricTile
        label="ZOPA"
        value={hasZopa ? formatCurrency(zopa) : "No ZOPA"}
        subtext={hasZopa && zopaPercent !== null ? `${formatPercent(zopaPercent)} of ARV` : undefined}
        variant={hasZopa ? "success" : "muted"}
      />

      {/* Spread (ZOPA %) */}
      <MetricTile
        label="Spread"
        value={zopaPercent !== null ? formatPercent(zopaPercent) : "—"}
        subtext="of ARV"
        variant={zopaPercent !== null && zopaPercent >= 10 ? "success" : "default"}
      />

      {/* MAO */}
      <MetricTile
        label="MAO"
        value={formatCurrency(mao)}
        subtext="max offer"
        variant="default"
      />

      {/* Floor */}
      <MetricTile
        label="Floor"
        value={formatCurrency(floor)}
        subtext="respect floor"
        variant="default"
      />
    </div>
  );
}
