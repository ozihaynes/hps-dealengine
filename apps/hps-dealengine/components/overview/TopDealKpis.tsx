"use client";

import React from "react";
import { GlassCard, Badge } from "@/components/ui";
import { fmt$, roundHeadline } from "@/utils/helpers";

export type TopDealKpisProps = {
  arv: number | null;
  maoFinal: number | null;
  offer: number | null;
  discountToArvPct: number | null;
  discountToArvDollars: number | null;
  assignmentFee: number | null;
  assignmentPolicyTargetPct?: number | null;
  assignmentPolicyMaxPct?: number | null;
  dtmDays: number | null;
  speedBand?: string | null;
  riskOverall?: string | null;
  confidenceGrade?: string | null;
  workflowState?: string | null;
};

const Tile = ({
  label,
  value,
  sub,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tooltip?: string;
}) => (
  <div
    className="rounded-lg border border-white/5 bg-white/5 p-3 md:p-4"
    title={tooltip}
  >
    <p className="label-xs uppercase text-text-secondary">{label}</p>
    <div className="text-lg font-semibold text-text-primary">{value}</div>
    {sub ? <p className="text-[12px] text-text-secondary mt-1">{sub}</p> : null}
  </div>
);

const formatPct = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "-" : `${(n * 100).toFixed(1)}%`;

const workflowBadgeColor = (state?: string | null) => {
  if (!state) return "blue" as const;
  const s = state.toLowerCase();
  if (s.includes("ready")) return "green" as const;
  if (s.includes("review")) return "orange" as const;
  if (s.includes("info")) return "blue" as const;
  return "blue" as const;
};

export function TopDealKpis(props: TopDealKpisProps) {
  const discountPctLabel = formatPct(props.discountToArvPct);
  const discountDollarLabel =
    props.discountToArvDollars != null && Number.isFinite(props.discountToArvDollars)
      ? fmt$(roundHeadline(props.discountToArvDollars), 0)
      : "-";
  const assignmentPct =
    props.assignmentFee != null && props.arv
      ? props.assignmentFee / props.arv
      : null;
  const offerLabel =
    props.offer != null && Number.isFinite(props.offer)
      ? fmt$(roundHeadline(props.offer), 0)
      : "—";

  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="label-xs uppercase text-text-secondary">Deal KPIs</p>
          <h2 className="text-xl font-semibold text-text-primary">OVERVIEW</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {props.confidenceGrade && (
            <Badge color="blue">Conf {props.confidenceGrade}</Badge>
          )}
          {props.workflowState && (
            <Badge color={workflowBadgeColor(props.workflowState)}>
              {props.workflowState}
            </Badge>
          )}
          {props.riskOverall && (
            <Badge
              color={
                props.riskOverall === "pass"
                  ? "green"
                  : props.riskOverall === "watch"
                  ? "orange"
                  : "red"
              }
            >
              Risk: {props.riskOverall}
            </Badge>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Tile
          label="Valuation"
          value={
            <span>
              ARV {props.arv != null ? fmt$(roundHeadline(props.arv), 0) : "-"} / MAO{" "}
              {props.maoFinal != null ? fmt$(roundHeadline(props.maoFinal), 0) : "-"}
            </span>
          }
          sub={`Discount vs ARV: ${discountPctLabel} (${discountDollarLabel})`}
          tooltip="See Valuation & Floors in Trace"
        />
        <Tile
          label="Offer (Computed)"
          value={offerLabel}
          sub="From latest underwriting run"
          tooltip="Computed from the latest underwriting run"
        />
        <Tile
          label="Assignment / Spread"
          value={
            <span>
              {props.assignmentFee != null
                ? fmt$(roundHeadline(props.assignmentFee), 0)
                : "-"}{" "}
              {assignmentPct != null && Number.isFinite(assignmentPct)
                ? `(${(assignmentPct * 100).toFixed(1)}% ARV)`
                : ""}
            </span>
          }
          sub={`Target ${formatPct(props.assignmentPolicyTargetPct)} / Max ${formatPct(
            props.assignmentPolicyMaxPct,
          )}`}
          tooltip="See Profit & Assignment Policy in Trace"
        />
        <Tile
          label="Timeline"
          value={
            <span>
              {props.dtmDays != null ? `${props.dtmDays} days` : "-"}{" "}
              {props.speedBand ? `/ ${props.speedBand}` : ""}
            </span>
          }
          sub="See Timeline & Carry in Trace"
        />
      </div>
    </GlassCard>
  );
}

export default TopDealKpis;