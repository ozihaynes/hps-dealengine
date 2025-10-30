'use client';

import { useEffect, useMemo, useState } from 'react';
import { runUnderwrite } from '@/lib/api';

type UiDeal = {
  market: {
    aiv: number | string;
    arv: number | string;
    dom_zip: number | string;
    moi_zip: number | string;
  };
  costs: {
    repairs_base: number | string;
    contingency_pct: number | string;
    monthly: {
      taxes: number | string;
      insurance: number | string;
      hoa: number | string;
      utilities: number | string;
    };
    essentials_moveout_cash: number | string;
  };
  debt: {
    senior_principal: number | string;
    juniors?: Array<{ label: string; amount: number | string }>;
  };
  timeline: { days_to_ready_list: number | string; days_to_sale_manual: number | string };
  status: { insurance_bindable: boolean };
};

export default function UnderwriteTab() {
  const [deal, setDeal] = useState<UiDeal>({
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
  });

  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  function setDealValue(path: string, v: any) {
    setDeal((prev) => {
      const next: any = structuredClone(prev);
      const parts = path.split('.');
      let ref = next;
      for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]];
      ref[parts.at(-1)!] = v;
      return next;
    });
  }

  async function onRun() {
    setLoading(true);
    setErr(null);
    try {
      // Convert numeric strings to numbers where possible
      const normalized = JSON.parse(JSON.stringify(deal), (_k, val) =>
        typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)) ? Number(val) : val
      );
      const out = await runUnderwrite(normalized);
      if (!out.ok) throw new Error(out.error || 'Engine returned !ok');
      setResults(out.results ?? null);
    } catch (e: any) {
      setErr(e.message || String(e));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  // Auto-run with debounce when inputs change
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => onRun(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal, auto]);

  const headline = useMemo(() => results?.headlines ?? {}, [results]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={onRun} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8 }}>
          {loading ? 'Running…' : 'Run Underwrite'}
        </button>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Auto-run
        </label>
        {error && <span style={{ color: 'tomato' }}>Error: {error}</span>}
      </div>

      {/* Basic inputs (add more as needed) */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 12 }}
      >
        <Field
          label="AIV"
          value={deal.market.aiv}
          onChange={(v) => setDealValue('market.aiv', v)}
        />
        <Field
          label="ARV"
          value={deal.market.arv}
          onChange={(v) => setDealValue('market.arv', v)}
        />
        <Field
          label="DOM (ZIP)"
          value={deal.market.dom_zip}
          onChange={(v) => setDealValue('market.dom_zip', v)}
        />
        <Field
          label="MOI (ZIP)"
          value={deal.market.moi_zip}
          onChange={(v) => setDealValue('market.moi_zip', v)}
        />

        <Field
          label="Repairs Base"
          value={deal.costs.repairs_base}
          onChange={(v) => setDealValue('costs.repairs_base', v)}
        />
        <Field
          label="Contingency %"
          value={deal.costs.contingency_pct}
          onChange={(v) => setDealValue('costs.contingency_pct', v)}
        />
        <Field
          label="Taxes (yr)"
          value={deal.costs.monthly.taxes}
          onChange={(v) => setDealValue('costs.monthly.taxes', v)}
        />
        <Field
          label="Insurance (yr)"
          value={deal.costs.monthly.insurance}
          onChange={(v) => setDealValue('costs.monthly.insurance', v)}
        />

        <Field
          label="Senior Principal"
          value={deal.debt.senior_principal}
          onChange={(v) => setDealValue('debt.senior_principal', v)}
        />
        <Field
          label="Ready-to-List (days)"
          value={deal.timeline.days_to_ready_list}
          onChange={(v) => setDealValue('timeline.days_to_ready_list', v)}
        />
        <Field
          label="Days-to-Sale (manual)"
          value={deal.timeline.days_to_sale_manual}
          onChange={(v) => setDealValue('timeline.days_to_sale_manual', v)}
        />
        <Field
          label="Essentials / Move-out $"
          value={deal.costs.essentials_moveout_cash}
          onChange={(v) => setDealValue('costs.essentials_moveout_cash', v)}
        />
      </section>

      {/* Quick headline snapshot */}
      <section
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))', gap: 12 }}
      >
        <Metric title="Buyer Ceiling" value={headline?.buyer_ceiling} />
        <Metric title="Respect Floor" value={headline?.respect_floor} />
        <Metric title="Recommendation" value={headline?.recommendation} />
      </section>

      {/* Raw JSON (dev) */}
      <details>
        <summary>Show full results JSON</summary>
        <pre
          style={{
            background: '#0b1220',
            color: '#d2f2ff',
            padding: 12,
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(results ?? {}, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.9 }}>{label}</span>
      <input
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 10px',
          border: '1px solid #234',
          background: '#06101e',
          color: 'white',
          borderRadius: 8,
        }}
      />
    </label>
  );
}

function Metric({ title, value }: { title: string; value: any }) {
  const v = value ?? '—';
  return (
    <div
      style={{
        padding: 12,
        border: '1px solid #234',
        background: '#06101e',
        color: 'white',
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: 18, marginTop: 4 }}>
        {typeof v === 'number' ? v.toLocaleString() : String(v)}
      </div>
    </div>
  );
}
