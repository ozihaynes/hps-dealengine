/* apps/dealengine/app/underwrite/debug/page.tsx */
"use client";

import { useState } from "react";
import { postUnderwrite } from "@/lib/api";

const sampleDeal = {
  market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
  costs: {
    repairs_base: 40000,
    contingency_pct: 0.15,
    monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
    essentials_moveout_cash: 2000,
  },
  debt: { senior_principal: 180000, juniors: [{ label: "HELOC", amount: 10000 }] },
  timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
};

export default function UnderwriteDebugPage() {
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const data = await postUnderwrite(sampleDeal);
      setOut(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Underwrite Debug</h1>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg px-4 py-2 border border-white/20 hover:bg-white/5"
      >
        {busy ? "Running..." : "POST /api/underwrite"}
      </button>

      {err && <pre className="text-red-400 whitespace-pre-wrap">{err}</pre>}
      {out && (
        <pre className="text-xs whitespace-pre overflow-auto border border-white/10 rounded-lg p-3">
{JSON.stringify(out, null, 2)}
        </pre>
      )}
    </div>
  );
}
