'use client';

import * as React from 'react';
import { runUnderwriteClient } from '@/lib/client/runUnderwrite';

const DEFAULT_DEAL = {
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

export default function PlaygroundPage() {
  const [text, setText] = React.useState(JSON.stringify(DEFAULT_DEAL, null, 2));
  const [out, setOut] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onRun() {
    setLoading(true);
    setErr(null);
    try {
      const deal = JSON.parse(text);
      const results = await runUnderwriteClient(deal);
      setOut(results);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to run');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 12 }}>Underwrite Playground</h2>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Paste/edit deal JSON on the left, hit <b>Run</b>, see <b>headlines / floors / ceilings</b>.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: '100%', height: 420, fontFamily: 'monospace', fontSize: 13 }}
          />
          <div style={{ marginTop: 12 }}>
            <button onClick={onRun} disabled={loading} style={{ padding: '8px 12px' }}>
              {loading ? 'Running…' : 'Run'}
            </button>
            {err && <div style={{ color: 'crimson', marginTop: 8 }}>{err}</div>}
          </div>
        </section>
        <section>
          <pre
            style={{
              width: '100%',
              height: 470,
              padding: 12,
              background: '#0a0a0a',
              color: '#d7ffd7',
              overflow: 'auto',
              borderRadius: 8,
            }}
          >
            {out ? JSON.stringify(out, null, 2) : '— no results yet —'}
          </pre>
        </section>
      </div>
    </main>
  );
}
