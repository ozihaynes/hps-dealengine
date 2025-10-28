// apps/dealengine/app/underwrite/run/page.tsx
'use client';

import { useState } from 'react';

export default function UnderwriteRunPage() {
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setErr(null);
    setOut(null);
    try {
      const body = {
        deal: {
          market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
          costs: {
            repairs_base: 40000,
            contingency_pct: 0.15,
            monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
            close_cost_items_seller: [{ label: 'doc stamps (seller)', amount: 2100 }],
            close_cost_items_buyer: [{ label: 'lender/title/buyer items', amount: 18000 }],
            essentials_moveout_cash: 2000,
          },
          debt: {
            senior_principal: 180000,
            senior_per_diem: 45,
            good_thru_date: '2025-10-01',
            juniors: [{ label: 'HELOC', amount: 10000 }],
          },
          timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
        },
      };

      const res = await fetch('/api/underwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setOut(json);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container">
      <h2 className="title">Underwrite — Run</h2>

      <p>
        Need raw JSON only? Use{' '}
        <a href="/underwrite/debug" className="underline">
          /underwrite/debug
        </a>
        .
      </p>

      <button onClick={run} disabled={loading} className="mt-4 rounded-xl px-4 py-2 border">
        {loading ? 'Running…' : 'Run sample underwriting'}
      </button>

      {err && <pre className="mt-4 p-3 rounded-xl border overflow-auto">{err}</pre>}

      {out && (
        <pre className="mt-4 p-3 rounded-xl border overflow-auto">
          {JSON.stringify(out, null, 2)}
        </pre>
      )}
    </main>
  );
}
