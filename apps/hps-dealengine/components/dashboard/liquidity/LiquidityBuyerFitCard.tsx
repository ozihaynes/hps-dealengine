/**
 * LiquidityBuyerFitCard — Sub-Slice 9.11
 *
 * Card displaying market liquidity score and buyer fit indicators.
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, NaN, negative values, invalid enums
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import { type MarketVelocity } from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES (BuyerFitTag not in contracts — define inline)
// ─────────────────────────────────────────────────────────────────────

export type BuyerFitTag =
  | "flipper"
  | "brrrr"
  | "landlord"
  | "wholetailer"
  | "owner_occupant";

export interface LiquidityBuyerFitCardProps {
  /** Market velocity from engine (contains liquidity data). Null → empty state */
  marketVelocity: MarketVelocity | null | undefined;
  /** Buyer fit tags from engine */
  buyerFitTags?: BuyerFitTag[] | null;
  /** Show buyer fit section */
  showBuyerFit?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

type LiquidityBandKey = "high" | "medium" | "low" | "unknown";

const LIQUIDITY_BAND_CONFIG: Record<
  LiquidityBandKey,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    barColor: string;
  }
> = {
  high: {
    label: "High Liquidity",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    barColor: "bg-emerald-500",
  },
  medium: {
    label: "Medium Liquidity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
    barColor: "bg-amber-500",
  },
  low: {
    label: "Low Liquidity",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
    barColor: "bg-red-500",
  },
  unknown: {
    label: "Unknown",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    borderColor: "border-slate-500/40",
    barColor: "bg-slate-500",
  },
} as const;

const BUYER_FIT_CONFIG: Record<
  BuyerFitTag,
  {
    label: string;
    icon: string;
    description: string;
  }
> = {
  flipper: {
    label: "Flipper",
    icon: "🔨",
    description: "Fix & flip investor",
  },
  brrrr: {
    label: "BRRRR",
    icon: "🔄",
    description: "Buy, Rehab, Rent, Refinance, Repeat",
  },
  landlord: {
    label: "Landlord",
    icon: "🏠",
    description: "Buy & hold rental investor",
  },
  wholetailer: {
    label: "Wholetailer",
    icon: "📦",
    description: "Light rehab, retail buyer exit",
  },
  owner_occupant: {
    label: "Owner Occ.",
    icon: "👤",
    description: "Primary residence buyer",
  },
} as const;

const VALID_BUYER_FIT_TAGS: readonly BuyerFitTag[] = [
  "flipper",
  "brrrr",
  "landlord",
  "wholetailer",
  "owner_occupant",
] as const;

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null; // Guards NaN and ±Infinity
  return value;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get liquidity band from score
// ─────────────────────────────────────────────────────────────────────

function getLiquidityBand(score: number | null | undefined): LiquidityBandKey {
  const safe = safeNumber(score);
  if (safe === null) return "unknown";
  if (safe < 0) return "unknown"; // DEFENSIVE: Negative check
  if (safe >= 70) return "high";
  if (safe >= 40) return "medium";
  return "low";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format liquidity score for display
// ─────────────────────────────────────────────────────────────────────

function formatScore(score: number | null | undefined): string {
  const safe = safeNumber(score);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // DEFENSIVE: Negative check
  // Clamp for display (score should be 0-100)
  const clamped = Math.max(0, Math.min(100, safe));
  return `${Math.round(clamped)}`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format percentage for display
// ─────────────────────────────────────────────────────────────────────

function formatPercent(pct: number | null | undefined): string {
  const safe = safeNumber(pct);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // DEFENSIVE: Negative check
  // Clamp to 100% max (percentages can't exceed 100)
  const clamped = Math.min(100, safe);
  return `${Math.round(clamped)}%`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format DOM days with singular/plural
// ─────────────────────────────────────────────────────────────────────

function formatDays(days: number | null | undefined): string {
  const safe = safeNumber(days);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // DEFENSIVE: Negative check

  const rounded = Math.round(safe); // ROUND FIRST, then check

  if (rounded === 0) return "0d";
  if (rounded === 1) return "1d";
  return `${rounded}d`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format MOI months
// ─────────────────────────────────────────────────────────────────────

function formatMOI(months: number | null | undefined): string {
  const safe = safeNumber(months);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // DEFENSIVE: Negative check
  return safe.toFixed(1);
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Clamp score for gauge width (0-100)
// ─────────────────────────────────────────────────────────────────────

function clampScoreForGauge(score: number | null | undefined): number {
  const safe = safeNumber(score);
  if (safe === null) return 0;
  return Math.max(0, Math.min(100, safe));
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Validate buyer fit tag
// ─────────────────────────────────────────────────────────────────────

function isValidBuyerFitTag(tag: string | null | undefined): tag is BuyerFitTag {
  if (!tag) return false;
  const lower = tag.trim().toLowerCase(); // ALWAYS trim + lowercase
  return VALID_BUYER_FIT_TAGS.includes(lower as BuyerFitTag);
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Normalize buyer fit tag (trim + lowercase)
// ─────────────────────────────────────────────────────────────────────

function normalizeBuyerFitTag(tag: string): BuyerFitTag {
  return tag.trim().toLowerCase() as BuyerFitTag;
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Buyer Fit Tag Chip
// ─────────────────────────────────────────────────────────────────────

interface BuyerFitChipProps {
  tag: BuyerFitTag;
  isMatch: boolean;
}

function BuyerFitChip({ tag, isMatch }: BuyerFitChipProps): JSX.Element {
  const config = BUYER_FIT_CONFIG[tag];

  return (
    <div
      className={cn(
        "flex flex-col items-center p-2 rounded-lg border min-w-[70px]",
        isMatch
          ? "bg-emerald-500/10 border-emerald-500/40"
          : "bg-slate-800/50 border-slate-700/50 opacity-50"
      )}
      data-testid={`buyer-fit-${tag}`}
      data-match={isMatch}
      title={config.description}
    >
      <span className="text-lg" aria-hidden="true">
        {config.icon}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium mt-1",
          isMatch ? "text-emerald-400" : "text-slate-500"
        )}
      >
        {config.label}
      </span>
      <span
        className={cn(
          "text-xs mt-0.5",
          isMatch ? "text-emerald-400" : "text-slate-600"
        )}
        aria-label={isMatch ? "Matches this deal" : "Does not match"}
      >
        {isMatch ? "✓" : "○"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const LiquidityBuyerFitCard = memo(function LiquidityBuyerFitCard({
  marketVelocity,
  buyerFitTags,
  showBuyerFit = true,
  compact = false,
  className,
}: LiquidityBuyerFitCardProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined market velocity
  // ─────────────────────────────────────────────────────────────────

  if (!marketVelocity) {
    return (
      <div
        data-testid="liquidity-buyer-fit-card"
        data-state="empty"
        className={cn(
          "rounded-xl border border-white/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
        }}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Liquidity & Buyer Fit
        </h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Liquidity data not yet available
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // EXTRACT (all from engine, no calculations)
  // ─────────────────────────────────────────────────────────────────

  const { liquidity_score, cash_buyer_share_pct, dom_zip_days, moi_zip_months } =
    marketVelocity;

  // ─────────────────────────────────────────────────────────────────
  // PROCESS VALUES (with defensive guards)
  // ─────────────────────────────────────────────────────────────────

  const liquidityBand = getLiquidityBand(liquidity_score);
  const bandConfig = LIQUIDITY_BAND_CONFIG[liquidityBand];
  const gaugeWidth = clampScoreForGauge(liquidity_score);
  const displayScore = formatScore(liquidity_score);

  // Normalize buyer fit tags array
  const normalizedTags: BuyerFitTag[] = Array.isArray(buyerFitTags)
    ? buyerFitTags.filter(isValidBuyerFitTag).map(normalizeBuyerFitTag)
    : [];

  const tagSet = new Set(normalizedTags);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="liquidity-buyer-fit-card"
      data-state="loaded"
      data-band={liquidityBand}
      data-score={safeNumber(liquidity_score) ?? "null"}
      className={cn(
        "rounded-xl border border-white/10 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        compact ? "p-3" : "p-4",
        className
      )}
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">
          Liquidity & Buyer Fit
        </h3>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border",
            bandConfig.color,
            bandConfig.bgColor,
            bandConfig.borderColor
          )}
          data-testid="liquidity-band-badge"
        >
          {bandConfig.label}
        </span>
      </div>

      {/* Liquidity Score Section */}
      <div
        className="bg-slate-900/50 rounded-lg p-3 mb-3"
        data-testid="liquidity-score-section"
      >
        {/* Score Label */}
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500">Liquidity Score</span>
          <span className={cn("font-semibold", bandConfig.color)}>
            {displayScore}
            <span className="text-slate-500 font-normal">/100</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              bandConfig.barColor
            )}
            style={{ width: `${gaugeWidth}%` }}
            role="progressbar"
            aria-valuenow={safeNumber(liquidity_score) ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Liquidity score: ${displayScore} out of 100`}
            data-testid="liquidity-gauge"
          />
        </div>

        {/* Supporting Metrics */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span data-testid="liquidity-cash-buyers">
            <span className="text-slate-500">Cash Buyers:</span>{" "}
            <span className="font-medium text-slate-300">
              {formatPercent(cash_buyer_share_pct)}
            </span>
          </span>
          <span className="text-slate-600">•</span>
          <span data-testid="liquidity-dom">
            <span className="text-slate-500">DOM:</span>{" "}
            <span className="font-medium text-slate-300">
              {formatDays(dom_zip_days)}
            </span>
          </span>
          <span className="text-slate-600">•</span>
          <span data-testid="liquidity-moi">
            <span className="text-slate-500">MOI:</span>{" "}
            <span className="font-medium text-slate-300">
              {formatMOI(moi_zip_months)}
            </span>
          </span>
        </div>
      </div>

      {/* Buyer Fit Section */}
      {showBuyerFit && (
        <div data-testid="buyer-fit-section">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Buyer Fit
          </h4>
          <div className="flex flex-wrap gap-2">
            {VALID_BUYER_FIT_TAGS.map((tag) => (
              <BuyerFitChip key={tag} tag={tag} isMatch={tagSet.has(tag)} />
            ))}
          </div>
          {normalizedTags.length === 0 && (
            <p
              className="text-xs text-slate-500 italic mt-2"
              data-testid="buyer-fit-none"
            >
              No buyer fit tags assigned
            </p>
          )}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default LiquidityBuyerFitCard;

// Re-export for testing
export {
  safeNumber,
  getLiquidityBand,
  formatScore,
  formatPercent,
  formatDays,
  formatMOI,
  clampScoreForGauge,
  isValidBuyerFitTag,
  normalizeBuyerFitTag,
  LIQUIDITY_BAND_CONFIG,
  BUYER_FIT_CONFIG,
  VALID_BUYER_FIT_TAGS,
};
