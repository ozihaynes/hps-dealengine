import React from "react";
import { GlassCard, Badge } from "@/components/ui";
import { fmt$ } from "@/utils/helpers";

/**
 * Safely extract a displayable string from engine output values.
 * Engine outputs may be strings, objects with status/note fields, or null.
 */
function safeDisplayValue(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    // Prefer status field for workflow-like objects
    if (typeof obj.status === "string") return obj.status;
    // Fall back to note if present
    if (typeof obj.note === "string") return obj.note;
    // Last resort: stringify
    return null;
  }
  return null;
}

type Props = {
  runOutput: any;
  title?: string;
};

const Pill = ({ label, tone }: { label: string; tone: "pass" | "watch" | "fail" | "neutral" }) => {
  const palette: Record<string, string> = {
    pass: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
    watch: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
    fail: "bg-red-500/15 text-red-200 border border-red-500/30",
    neutral: "bg-white/5 text-text-secondary border border-white/10",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${palette[tone]}`}>
      {label}
    </span>
  );
};

const Bar = ({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  max: number;
  suffix?: string;
}) => {
  const safeVal = typeof value === "number" && Number.isFinite(value) ? value : null;
  const pct = max > 0 && safeVal != null ? Math.min(100, Math.max(0, (safeVal / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px] text-text-secondary">
        <span>{label}</span>
        <span className="font-mono text-text-primary">
          {safeVal != null ? fmt$(safeVal, 0) : "—"}
          {suffix}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5">
        <div className="h-1.5 rounded-full bg-accent-blue transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default function KnobFamilySummary({ runOutput, title = "Quick Glance" }: Props) {
  const outputs = runOutput?.outputs ?? {};
  const traces: any[] = runOutput?.trace ?? [];
  const findTrace = (rule: string) => traces.find((t) => t?.rule === rule) ?? null;

  const timeline = outputs?.timeline_summary ?? {};
  const risk = outputs?.risk_summary ?? {};
  const evidence = outputs?.evidence_summary ?? {};
  const workflowState = safeDisplayValue(outputs?.workflow_state);
  const workflowReasons: string[] = outputs?.workflow_reasons ?? [];
  const confidenceGrade = safeDisplayValue(outputs?.confidence_grade);
  const cashGateStatus = safeDisplayValue(outputs?.cash_gate_status);
  const borderlineFlag = outputs?.borderline_flag ?? null;

  const valuationTrace = findTrace("VALUATION_BOUNDS") as any;
  const floorInvestor = outputs?.floor_investor ?? null;
  const respectFloor = outputs?.respect_floor ?? null;
  const buyerCeiling = outputs?.buyer_ceiling ?? null;
  const maoCap = outputs?.mao_as_is_cap ?? outputs?.mao_cap_wholesale ?? null;

  const carryMonths = timeline?.carry_months ?? null;
  const carryRaw = timeline?.carry_months_raw ?? null;
  const carryCap = timeline?.carry_months_capped ?? null;
  const holdMonthly = timeline?.hold_monthly_dollars ?? null;

  const profitWholesale = outputs?.mao_wholesale ?? null;
  const spreadCash = outputs?.spread_cash ?? null;
  const minSpread = outputs?.min_spread_required ?? null;

  const workflowPolicy = (findTrace("WORKFLOW_STATE_POLICY") as any)?.details?.workflow_policy ?? null;

  const barMax = Math.max(
    1,
    ...[buyerCeiling, maoCap, respectFloor, floorInvestor].filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    ),
  );

  return (
    <GlassCard className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <div className="flex items-center gap-2">
          {confidenceGrade && <Badge color="blue">Confidence {confidenceGrade}</Badge>}
          {workflowState && <Badge color="orange">{workflowState}</Badge>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[12px] uppercase text-text-secondary">Valuation & Floors</p>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 p-3">
            <Bar label="Buyer Ceiling" value={buyerCeiling} max={barMax} />
            <Bar label="MAO / AIV Cap" value={maoCap} max={barMax} />
            <Bar label="Respect Floor" value={respectFloor} max={barMax} />
            <Bar label="Investor Floor" value={floorInvestor} max={barMax} />
            {valuationTrace?.details?.aiv_cap_pct != null && (
              <div className="text-[11px] text-text-secondary">
                AIV cap pct {Math.round(valuationTrace.details.aiv_cap_pct * 10000) / 100}%
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[12px] uppercase text-text-secondary">Carry / DTM</p>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 p-3">
            <Bar label="Carry Months (raw)" value={carryRaw} max={(carryCap ?? carryRaw ?? 1) as number} suffix=" mo" />
            <Bar label="Carry Months (capped)" value={carryCap} max={(carryCap ?? carryRaw ?? 1) as number} suffix=" mo" />
            <div className="flex items-center justify-between text-[12px] text-text-secondary">
              <span>Hold monthly</span>
              <span className="font-mono text-text-primary">{holdMonthly != null ? fmt$(holdMonthly, 0) : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-text-secondary">
              <span>DTM selected</span>
              <span className="font-mono text-text-primary">
                {timeline?.dtm_selected_days != null ? `${timeline.dtm_selected_days}d` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-text-secondary">
              <Pill label={timeline?.speed_band ?? "speed"} tone="neutral" />
              <Pill label={timeline?.urgency ?? "urgency"} tone="neutral" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[12px] uppercase text-text-secondary">Profit & Disposition</p>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 p-3">
            <Bar label="Wholesale MAO" value={profitWholesale} max={barMax} />
            <div className="flex items-center justify-between text-[12px] text-text-secondary">
              <span>Spread vs min ladder</span>
              <span className="font-mono text-text-primary">
                {spreadCash != null && minSpread != null ? fmt$(spreadCash - minSpread, 0) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-text-secondary">
              <Pill label={cashGateStatus ? `Cash gate: ${cashGateStatus}` : "Cash gate"} tone="neutral" />
              {borderlineFlag && <Pill label="Borderline" tone="watch" />}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[12px] uppercase text-text-secondary">Risk & Workflow</p>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex flex-wrap gap-2">
              <Pill label={`Risk ${risk?.overall ?? "?"}`} tone={(risk?.overall as any) ?? "neutral"} />
              <Pill label={`Confidence ${confidenceGrade ?? "?"}`} tone="neutral" />
              {workflowState && (
                <Pill label={workflowState} tone={workflowState === "NeedsInfo" ? "fail" : "watch"} />
              )}
            </div>
            {workflowPolicy?.analyst_review_borderline_threshold != null && (
              <div className="text-[11px] text-text-secondary">
                Borderline band ±{fmt$(workflowPolicy.analyst_review_borderline_threshold, 0)}
              </div>
            )}
            {workflowPolicy?.cash_presentation_min_spread_over_payoff != null && (
              <div className="text-[11px] text-text-secondary">
                Cash gate requires spread ≥ {fmt$(workflowPolicy.cash_presentation_min_spread_over_payoff, 0)}
              </div>
            )}
            {workflowReasons?.length > 0 && (
              <ul className="list-disc pl-4 text-[11px] text-text-secondary">
                {workflowReasons.map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

    </GlassCard>
  );
}
