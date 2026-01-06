// apps/hps-dealengine/components/OverviewKPI.tsx
// Simple KPI panel driven by the v1-analyze Edge Function (stub inputs for now).

"use client";

import { useState } from "react";
import { analyze, type AnalyzeInput } from "../lib/edge";

export function OverviewKPI() {
  const [aivCap, setAivCap] = useState<string | number>("—");
  const [carryMonths, setCarryMonths] = useState<string | number>("—");
  const [status, setStatus] = useState<"Idle" | "Analyzing" | "OK" | "Error">("Idle");

  const handleAnalyzeClick = async () => {
    setStatus("Analyzing");
    try {
      const input: AnalyzeInput = {
        options: { trace: true },
        aiv: 300_000,
        dom_zip_days: 45,
      };

      const resp = await analyze(input);
      const out = (resp as any).outputs ?? {};

      setAivCap(out.aivSafetyCap ?? "—");
      setCarryMonths(out.carryMonths ?? "—");
      setStatus("OK");
    } catch (err) {
      console.error("[OverviewKPI] analyze failed", err);
      setStatus("Error");
    }
  };

  const formatCurrency = (value: string | number) => {
    if (typeof value !== "number") return value;
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Deal snapshot &amp; corridor
          </h2>
          <p className="text-xs text-slate-400">
            Quick view of AIV safety cap and carry window (stubbed demo).
          </p>
        </div>
        <button
          type="button"
          onClick={handleAnalyzeClick}
          className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/80"
        >
          {status === "Analyzing" ? "Analyzing…" : "Run analysis"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-emerald-300">
            AIV safety cap
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(aivCap)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Max offer target based on current policy snapshot.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Carry months cap
            </div>
            <div className="mt-1 text-lg font-semibold">
              {carryMonths}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Status
            </div>
            <div className="mt-1 text-xs font-medium text-slate-200">
              {status === "Idle" && "Idle"}
              {status === "Analyzing" && "Running v1-analyze…"}
              {status === "OK" && "OK — using latest analysis"}
              {status === "Error" && "Error — check console"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
