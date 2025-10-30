// apps/hps-dealengine/app/underwrite/run/page.tsx
'use client';

import { useState } from 'react';
import { runUnderwrite } from '@/lib/api';

const sampleDeal = {
  market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
  costs: {
    repairs_base: 40000,
    contingency_pct: 0.15,
    monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
    essentials_moveout_cash: 2000,
  },
  debt: { senior_principal: 180000, juniors: [{ label: 'HELOC', amount: 10000 }] },
  timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
  status: { insurance_bindable: true },
};

export default function UnderwriteRunPage() {
  const [dealJson, setDealJson] = useState<string>(JSON.stringify(sampleDeal, null, 2));
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRun() {
    setBusy(true);
    setErr(null);
    setOut(null);
    try {
      const parsed = JSON.parse(dealJson);
      const res = await runUnderwrite(parsed);
      if (!res.ok) throw new Error('Underwrite failed');
      setOut(res.results);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function resetSample() {
    setDealJson(JSON.stringify(sampleDeal, null, 2));
  }

  return (
    <main className="app-container">
      <h2 className="title" style={{ marginBottom: 12 }}>
        Underwrite — Run
      </h2>
      <p className="opacity-80 text-sm">Paste or edit the deal JSON, then click Run.</p>

      <textarea
        className="w-full h-64 p-3 rounded border font-mono"
        value={dealJson}
        onChange={(e) => setDealJson(e.target.value)}
      />

      <div className="mt-3 flex gap-2">
        <button onClick={onRun} disabled={busy} className="rounded-xl px-4 py-2 border">
          {busy ? 'Running…' : 'Run Underwrite'}
        </button>
        <button onClick={resetSample} disabled={busy} className="rounded-xl px-3 py-2 border">
          Reset sample
        </button>
      </div>

      {err && (
        <pre className="mt-4 p-3 rounded-xl border text-red-600 whitespace-pre-wrap">{err}</pre>
      )}

      {out && (
        <details open className="mt-4">
          <summary className="cursor-pointer font-medium">Results</summary>
          <pre className="mt-2 p-3 rounded-xl border overflow-auto text-sm">
            {JSON.stringify(out, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
