import React from "react";
import type { Comp, PropertySnapshot } from "@hps-internal/contracts";
import { GlassCard, Badge } from "../ui";

type CompsPanelProps = {
  comps: Comp[];
  snapshot?: PropertySnapshot | null;
  minClosedComps?: number | null;
};

export function CompsPanel({ comps, snapshot, minClosedComps }: CompsPanelProps) {
  const provider = snapshot?.provider ?? snapshot?.source ?? "unknown";
  const asOf = snapshot?.as_of
    ? new Date(snapshot.as_of).toLocaleDateString()
    : "unknown";
  const stub = snapshot?.stub ?? false;
  const minRequired = minClosedComps ?? null;
  const gating = minRequired != null ? comps.length < minRequired : false;

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

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-text-primary">
            Comparable sale listings (RentCast)
          </span>
          <Badge color={gating ? "orange" : "green"}>
            {comps.length} listings{" "}
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
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        <span>Active: {statusCounts.active}</span>
        <span>Inactive: {statusCounts.inactive}</span>
        <span>Other: {statusCounts.other}</span>
        <span>Unknown: {statusCounts.unknown}</span>
      </div>

      {gating && (
        <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          Insufficient comparable sale listings (RentCast). Valuation is informational only.
        </div>
      )}

      {comps.length === 0 ? (
        <div className="text-sm text-text-secondary">No comps available yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {comps.map((comp) => (
            <div
              key={comp.id}
              className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-1 text-sm"
            >
              <div className="font-semibold text-text-primary">{comp.address}</div>
              <div className="text-text-secondary">
                {comp.city ?? ""} {comp.state ?? ""} {comp.postal_code ?? ""}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                <span>
                  Price:{" "}
                  {Number.isFinite(Number(comp.price))
                    ? `$${Number(comp.price).toLocaleString()}`
                    : "-"}
                </span>
                <span>Date: {comp.close_date ? new Date(comp.close_date).toLocaleDateString() : "-"}</span>
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
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export default CompsPanel;
