import React from "react";
import type { Comp, PropertySnapshot } from "@hps-internal/contracts";
import { GlassCard, Badge } from "../ui";

type CompsPanelProps = {
  comps: Comp[];
  snapshot?: PropertySnapshot | null;
  minClosedComps?: number | null;
  onRefresh?: ((forceRefresh?: boolean) => void) | null;
  refreshing?: boolean;
  selectedCompIds?: string[];
};

type Summary = {
  minDate: Date | null;
  maxDate: Date | null;
  medianDistance: number | null;
  priceVariance: number | null;
};

const summarizeComps = (set: Comp[]): Summary => {
  const dateValues = set
    .map((comp) => {
      const dateStr =
        comp.close_date ??
        (comp as any)?.listed_date ??
        (comp as any)?.listed_at ??
        null;
      const ts = dateStr ? Date.parse(dateStr as string) : NaN;
      return Number.isFinite(ts) ? ts : null;
    })
    .filter((v): v is number => v != null);
  const minDate = dateValues.length ? new Date(Math.min(...dateValues)) : null;
  const maxDate = dateValues.length ? new Date(Math.max(...dateValues)) : null;

  const distanceValues = set
    .map((c) => (Number.isFinite(Number((c as any)?.distance_miles)) ? Number((c as any).distance_miles) : null))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  const medianDistance =
    distanceValues.length === 0
      ? null
      : distanceValues[Math.floor(distanceValues.length / 2)];

  const priced = set
    .map((c) => (Number.isFinite(Number(c.price)) ? Number(c.price) : null))
    .filter((v): v is number => v != null);
  const priceVariance = (() => {
    if (priced.length < 2) return null;
    const mean = priced.reduce((a, b) => a + b, 0) / priced.length;
    if (mean === 0) return null;
    const variance =
      priced.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      priced.length;
    const stddev = Math.sqrt(variance);
    return stddev / mean;
  })();

  return { minDate, maxDate, medianDistance, priceVariance };
};

const CompCard: React.FC<{ comp: Comp; isListing: boolean; isSelected?: boolean }> = ({ comp, isListing, isSelected }) => (
  <div
    key={comp.id}
    className={`rounded-lg border p-3 space-y-1 text-sm ${isSelected ? "border-accent-blue/60 bg-accent-blue/10" : "border-white/5 bg-white/5"}`}
  >
    <div className="font-semibold text-text-primary">{comp.address}</div>
    <div className="text-text-secondary">
      {comp.city ?? ""} {comp.state ?? ""} {comp.postal_code ?? ""}
    </div>
    <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
      {(() => {
        const priceLabel = isListing ? "List Price" : "Close Price";
        const dateLabel = isListing ? "Listed" : "Closed";
        return (
          <>
            <span>
              {priceLabel}:{" "}
              {Number.isFinite(Number(comp.price))
                ? `$${Number(comp.price).toLocaleString()}`
                : "-"}
            </span>
            <span>
              {dateLabel}:{" "}
              {comp.close_date ? new Date(comp.close_date).toLocaleDateString() : "-"}
            </span>
          </>
        );
      })()}
      <span>Correlation: {comp.correlation ?? "-"}</span>
      <span>Days Old: {comp.days_old ?? "-"}</span>
      <span>Status: {comp.status ?? "-"}</span>
      <span>Listing: {comp.listing_type ?? "-"}</span>
      <span>
        Beds/Baths: {comp.beds ?? "-"} / {comp.baths ?? "-"}
      </span>
      <span>Sqft: {comp.sqft ?? "-"}</span>
      <span>Distance: {comp.distance_miles ?? "-"} mi</span>
    </div>
    {(() => {
      const mta: any = (comp as any)?.market_time_adjustment ?? null;
      const adjustedPrice = (comp as any)?.price_adjusted ?? mta?.adjusted_price ?? null;
      const factor = mta?.factor ?? (mta?.applied && mta?.hpi_close && mta?.hpi_asof ? mta.hpi_asof / mta.hpi_close : null);
      if (adjustedPrice && factor) {
        return (
          <div className="text-xs text-accent-blue">
            Adjusted Price: ${Number(adjustedPrice).toLocaleString()} (factor {factor.toFixed(3)})
          </div>
        );
      }
      return null;
    })()}
    {isSelected && (
      <span className="inline-flex items-center rounded-full bg-accent-blue/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-blue">
        Selected
      </span>
    )}
  </div>
);

export function CompsPanel({ comps, snapshot, minClosedComps, onRefresh, refreshing, selectedCompIds }: CompsPanelProps) {
  const provider = snapshot?.provider ?? snapshot?.source ?? "unknown";
  const asOf = snapshot?.as_of ? new Date(snapshot.as_of).toLocaleDateString() : "unknown";
  const stub = snapshot?.stub ?? false;
  const [showClosed, setShowClosed] = React.useState(false);
  const [showListings, setShowListings] = React.useState(false);
  const closedSales = comps.filter((c) => (c as any)?.comp_kind === "closed_sale");
  const listings = comps.filter((c) => (c as any)?.comp_kind !== "closed_sale");
  const minRequired = minClosedComps ?? null;
  const gating = minRequired != null ? closedSales.length < minRequired : false;
  const [cooldownUntil, setCooldownUntil] = React.useState<number | null>(null);

  const statusCounts = comps.reduce(
    (acc, comp) => {
      const status = (comp.status || "").toLowerCase();
      if (status.includes("active")) {
        acc.active += 1;
      } else if (
        status.includes("inactive") ||
        status.includes("off") ||
        status.includes("expired")
      ) {
        acc.inactive += 1;
      } else if (status) {
        acc.other += 1;
      } else {
        acc.unknown += 1;
      }
      return acc;
    },
    { active: 0, inactive: 0, other: 0, unknown: 0 },
  );

  React.useEffect(() => {
    if (!cooldownUntil) return;
    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) {
      setCooldownUntil(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setCooldownUntil(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [cooldownUntil]);

  const handleRerun = () => {
    if (!onRefresh) return;
    const now = Date.now();
    if (cooldownUntil && cooldownUntil > now) return;
    setCooldownUntil(now + 30_000);
    onRefresh(true);
  };

  const rerunDisabled = refreshing || !onRefresh || (cooldownUntil != null && cooldownUntil > Date.now());

  const closedSummary = summarizeComps(closedSales);
  const listingSummary = summarizeComps(listings);

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-text-primary">
            Comparable closed sales (RentCast /properties)
          </span>
          <Badge color={gating ? "orange" : "green"}>
            {closedSales.length} comps{" "}
            {minRequired != null
              ? gating
                ? `(min ${minRequired} required)`
                : `(min ${minRequired})`
              : "(policy missing)"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="rounded border border-white/10 px-2 py-1">
            Provider: {provider}
          </span>
          <span className="rounded border border-white/10 px-2 py-1">As of: {asOf}</span>
          {stub && (
            <span className="rounded border border-amber-400/40 px-2 py-1 text-amber-200">
              Stub data
            </span>
          )}
          <button
            type="button"
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-text-primary hover:border-accent-blue/60"
            onClick={handleRerun}
            disabled={rerunDisabled}
          >
            {refreshing ? "Refreshing..." : "Re-run comps"}
          </button>
          <button
            type="button"
            onClick={() => setShowClosed((prev) => !prev)}
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-text-primary hover:border-accent-blue/60"
          >
            {showClosed ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
      </div>

      {showClosed && (
        <>
          <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
            <span>Active: {statusCounts.active}</span>
            <span>Inactive: {statusCounts.inactive}</span>
            <span>Other: {statusCounts.other}</span>
            <span>Unknown: {statusCounts.unknown}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-text-secondary">
            <span className="rounded border border-white/10 px-2 py-1">
              Date range:{" "}
              {closedSummary.minDate && closedSummary.maxDate
                ? `${closedSummary.minDate.toLocaleDateString()} - ${closedSummary.maxDate.toLocaleDateString()}`
                : "-"}
            </span>
            <span className="rounded border border-white/10 px-2 py-1">
              Median distance: {closedSummary.medianDistance != null ? `${closedSummary.medianDistance} mi` : "-"}
            </span>
            <span className="rounded border border-white/10 px-2 py-1">
              Price variance:{" "}
              {closedSummary.priceVariance != null ? `${(closedSummary.priceVariance * 100).toFixed(1)}% (cv)` : "-"}
            </span>
            <span
              className="rounded border border-white/10 px-2 py-1"
              title="Not available from v1 provider; planned in v2."
            >
              Concessions: -
            </span>
          </div>

          {gating && (
            <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              Insufficient comparable closed sales. Valuation is informational only or will fall back to listings.
            </div>
          )}

          {closedSales.length === 0 ? (
            <div className="text-sm text-text-secondary">No closed-sale comps available yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {closedSales.map((comp) => (
                <CompCard
                  key={comp.id}
                  comp={comp}
                  isListing={false}
                  isSelected={selectedCompIds?.includes((comp.id ?? "").toString())}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-text-primary">
              Comparable sale listings (RentCast /avm/value)
            </span>
            <Badge color="blue">{listings.length} listings</Badge>
          </div>
          <button
            type="button"
            onClick={() => setShowListings((prev) => !prev)}
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-text-primary hover:border-accent-blue/60"
          >
            {showListings ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        {showListings && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-text-secondary">
              <span className="rounded border border-white/10 px-2 py-1">
                Date range:{" "}
                {listingSummary.minDate && listingSummary.maxDate
                  ? `${listingSummary.minDate.toLocaleDateString()} - ${listingSummary.maxDate.toLocaleDateString()}`
                  : "-"}
              </span>
              <span className="rounded border border-white/10 px-2 py-1">
                Median distance: {listingSummary.medianDistance != null ? `${listingSummary.medianDistance} mi` : "-"}
              </span>
              <span className="rounded border border-white/10 px-2 py-1">
                Price variance:{" "}
                {listingSummary.priceVariance != null ? `${(listingSummary.priceVariance * 100).toFixed(1)}% (cv)` : "-"}
              </span>
              <span className="rounded border border-white/10 px-2 py-1">Concessions: -</span>
            </div>
            {listings.length === 0 ? (
              <div className="text-sm text-text-secondary">No sale listings available.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {listings.map((comp) => (
                  <CompCard
                    key={comp.id}
                    comp={comp}
                    isListing={true}
                    isSelected={selectedCompIds?.includes((comp.id ?? "").toString())}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </GlassCard>
  );
}

export default CompsPanel;
