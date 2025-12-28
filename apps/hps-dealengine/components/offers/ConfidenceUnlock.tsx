import React from "react";

import { GlassCard } from "@/components/ui";
import type { AnalyzeOutputs } from "@hps-internal/contracts";

type HviUnlocks = AnalyzeOutputs["hvi_unlocks"];
type HviUnlock = NonNullable<HviUnlocks>[number];

type ConfidenceUnlockProps = {
  hviUnlocks: HviUnlocks;
};

const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmtUsd0(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return USD0.format(value);
}

function fmtText(value: string | null | undefined): string {
  if (typeof value !== "string" || value.trim().length === 0) return "-";
  return value;
}

function StatusPill(props: { status: HviUnlock["status"] | null | undefined }) {
  const status = props.status ?? null;

  if (status == null) {
    return <span className="text-xs text-muted-foreground">Status: -</span>;
  }

  if (status === "locked") {
    return (
      <span className="rounded-full bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-200">
        Locked
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-200">
      Unlocked
    </span>
  );
}

function PenaltyPill(props: { amount: number | null | undefined }) {
  const amount = props.amount ?? null;
  const hasPenalty = typeof amount === "number" && Number.isFinite(amount) && amount > 0;

  if (!hasPenalty) return null;

  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-200">
      Penalty: -{fmtUsd0(amount)}
    </span>
  );
}

function UnlockCard(props: { unlock: HviUnlock }) {
  const unlock = props.unlock;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">{fmtText(unlock.title)}</div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill status={unlock.status} />
          <PenaltyPill amount={unlock.penalty_delta_dollars} />
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Why: {fmtText(unlock.why)}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Missing field: {fmtText(unlock.missing_field_path)}
      </div>
    </div>
  );
}

export default function ConfidenceUnlock(props: ConfidenceUnlockProps) {
  const unlocks = props.hviUnlocks ?? null;

  return (
    <GlassCard className="p-4">
      <div>
        <div className="text-sm font-semibold">Confidence Unlocks</div>
        <div className="text-xs text-muted-foreground">Engine-driven action cards.</div>
      </div>

      {unlocks && unlocks.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {unlocks.map((unlock) => (
            <UnlockCard key={unlock.key} unlock={unlock} />
          ))}
        </div>
      ) : (
        <div className="mt-3 text-xs text-muted-foreground">No unlocks yet.</div>
      )}
    </GlassCard>
  );
}
