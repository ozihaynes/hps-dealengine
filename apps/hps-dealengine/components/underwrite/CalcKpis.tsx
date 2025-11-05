"use client";

import React from "react";
import type { EngineCalculations } from "@/types";

type Props = { calc: EngineCalculations };

export default function CalcKpis({ calc }: Props) {
  const n = (x: unknown) => Number(x ?? 0);

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
      <div className="font-semibold mb-1">Deal KPIs</div>
      <div>Instant Cash Offer: ${n(calc.instantCashOffer).toLocaleString()}</div>
      <div>Projected Payoff @ Close: ${n(calc.projectedPayoffClose).toLocaleString()}</div>
      <div>Net to Seller: ${n(calc.netToSeller).toLocaleString()}</div>
      <div>Days to Money: {n(calc.urgencyDays)}</div>
    </div>
  );
}