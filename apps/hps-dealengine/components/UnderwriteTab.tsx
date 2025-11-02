'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

type InfoNeeded = {
  path: string;
  token?: string | null;
  reason: string;
  source_of_truth?: 'investor_set' | 'team_policy_set' | 'external_feed' | 'unknown';
};

type TraceEntry = {
  rule: string;
  used: string[];
  details?: Record<string, unknown>;
};

type UnderwriteOutputs = {
  caps: { aivCapApplied: boolean; aivCapValue: number | null };
  carry: {
    monthsRule: string | null;
    monthsCap: number | null;
    rawMonths: number | null;
    carryMonths: number | null;
  };
  fees?: {
    rates: {
      list_commission_pct: number;
      concessions_pct: number;
      sell_close_pct: number;
    };
    preview: {
      base_price: number;
      list_commission_amount: number;
      concessions_amount: number;
      sell_close_amount: number;
      total_seller_side_costs: number;
    };
  };
  summaryNotes: string[];
};

type AnalyzeResult = {
  ok: true;
  infoNeeded: InfoNeeded[];
  trace: TraceEntry[];
  outputs: UnderwriteOutputs;
};

type AnalyzeResponse = { ok: true; result: AnalyzeResult };

type DebugHeaders = {
  tokenRegistryPath?: string | null;
  tokenRegistryExists?: string | null;
  tokenResolvedCount?: string | null;
  capType?: string | null;
  capValue?: string | null;
  feeListCommissionPct?: string | null;
  feeConcessionsPct?: string | null;
  feeSellClosePct?: string | null;
};

function useDebouncedCallback(cb: () => void, delayMs: number) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (t.current) clearTimeout(t.current);
    },
    []
  );
  return () => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(cb, delayMs);
  };
}

function usd(n: number | null | undefined) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function pct(n: number | null | undefined) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

export default function UnderwriteTab() {
  // Inputs (MVP)
  const [aiv, setAiv] = useState<number | ''>('');
  const [domZip, setDomZip] = useState<number | ''>('');

  // Live data & status
  const [prefs, setPrefs] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [policyPath, setPolicyPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugHeaders | null>(null);

  // Debounce from prefs (fallback 400ms)
  const debounceMs = useMemo(() => {
    const v = Number(prefs?.autorun_debounce_ms);
    return Number.isFinite(v) ? v : 400;
  }, [prefs]);

  const debouncedRun = useDebouncedCallback(runAnalyze, debounceMs);

  // Boot: prefs + policy (+ policy path header)
  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        const prefsResp = await fetch('/api/user-prefs', {
          headers: { Accept: 'application/json' },
        });
        if (!prefsResp.ok) throw new Error('Failed to load user prefs');
        const prefsJson = await prefsResp.json();
        if (alive) setPrefs(prefsJson?.prefs ?? {});

        const policyResp = await fetch('/api/policy', { headers: { Accept: 'application/json' } });
        if (!policyResp.ok) throw new Error('Failed to load policy');
        const px = await policyResp.json();
        if (alive) setPolicy(px?.policy ?? {});
        const path = policyResp.headers.get('x-policy-path') ?? '';
        if (alive) setPolicyPath(path);
      } catch (err: any) {
        if (alive) setError(err?.message ?? 'Failed to initialize');
      }
    }
    boot();
    return () => {
      alive = false;
    };
  }, []);

  // Auto-run when inputs change (after policy present)
  useEffect(() => {
    if (!policy) return;
    if (aiv === '' && domZip === '') return;
    debouncedRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiv, domZip, policy, debounceMs]);

  async function runAnalyze() {
    if (!policy) return;
    setLoading(true);
    setError(null);
    try {
      const deal: any = { market: {} };
      if (aiv !== '') deal.market.aiv = aiv;
      if (domZip !== '') deal.market.dom_zip = domZip;

      const payload = { deal, policy, options: { provenance: true } };
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error(`Analyze failed (${r.status})`);

      // Capture debug headers from server (if present)
      const dbg: DebugHeaders = {
        tokenRegistryPath: r.headers.get('x-token-registry-path'),
        tokenRegistryExists: r.headers.get('x-token-registry-exists'),
        tokenResolvedCount: r.headers.get('x-token-resolved-count'),
        capType: r.headers.get('x-cap-type'),
        capValue: r.headers.get('x-cap-value'),
        feeListCommissionPct: r.headers.get('x-fee-list-commission-pct'),
        feeConcessionsPct: r.headers.get('x-fee-concessions-pct'),
        feeSellClosePct: r.headers.get('x-fee-sell-close-pct'),
      };
      setDebug(dbg);

      const data = (await r.json()) as AnalyzeResponse;
      setResult(data.result);
    } catch (err: any) {
      setError(err?.message ?? 'Analyze error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Inputs */}
      <section className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur">
        <div className="mb-3 text-xl font-semibold">Inputs</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm opacity-80">AIV (number)</span>
            <input
              className="rounded-xl px-3 py-2 bg-black/30 border border-white/10 focus:outline-none"
              type="number"
              placeholder="e.g., 300000"
              value={aiv}
              onChange={(e) => setAiv(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm opacity-80">DOM (ZIP) days (number)</span>
            <input
              className="rounded-xl px-3 py-2 bg-black/30 border border-white/10 focus:outline-none"
              type="number"
              placeholder="e.g., 45"
              value={domZip}
              onChange={(e) => setDomZip(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runAnalyze}
            className="rounded-2xl px-4 py-2 border border-white/10 bg-white/10 hover:bg-white/20 active:scale-[0.99]"
            disabled={loading || !policy}
          >
            {loading ? 'Running…' : 'Run analyze'}
          </button>
          <div className="text-xs opacity-60">
            Autorun debounce: {debounceMs} ms • Policy file: {policyPath || 'in-memory'}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur">
        <div className="mb-3 text-xl font-semibold">Results</div>
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        {!result && !error && (
          <div className="text-sm opacity-70">Change an input or press “Run analyze”.</div>
        )}
        {result && (
          <div className="space-y-6">
            <div>
              <div className="font-semibold mb-2">Summary</div>
              <ul className="list-disc pl-6 text-sm">
                {result.outputs.summaryNotes.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-semibold mb-2">Caps</div>
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  AIV Cap Applied:{' '}
                  <span className="opacity-80">{String(result.outputs.caps.aivCapApplied)}</span>
                </div>
                <div>
                  AIV Cap Value:{' '}
                  <span className="opacity-80">
                    {result.outputs.caps.aivCapValue === null
                      ? '—'
                      : usd(result.outputs.caps.aivCapValue)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">Carry Months</div>
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  Rule: <span className="opacity-80">{result.outputs.carry.monthsRule ?? '—'}</span>
                </div>
                <div>
                  Cap: <span className="opacity-80">{result.outputs.carry.monthsCap ?? '—'}</span>
                </div>
                <div>
                  Raw months:{' '}
                  <span className="opacity-80">
                    {result.outputs.carry.rawMonths == null
                      ? '—'
                      : result.outputs.carry.rawMonths.toFixed(2)}
                  </span>
                </div>
                <div>
                  Carry months:{' '}
                  <span className="opacity-80">
                    {result.outputs.carry.carryMonths == null
                      ? '—'
                      : result.outputs.carry.carryMonths.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {result.outputs.fees && (
              <>
                <div>
                  <div className="font-semibold mb-2">Fee Rates</div>
                  <div className="text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      List commission:{' '}
                      <span className="opacity-80">
                        {pct(result.outputs.fees.rates.list_commission_pct)}
                      </span>
                    </div>
                    <div>
                      Concessions:{' '}
                      <span className="opacity-80">
                        {pct(result.outputs.fees.rates.concessions_pct)}
                      </span>
                    </div>
                    <div>
                      Seller close:{' '}
                      <span className="opacity-80">
                        {pct(result.outputs.fees.rates.sell_close_pct)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold mb-2">Fee Preview</div>
                  <div className="text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      Base price:{' '}
                      <span className="opacity-80">
                        {usd(result.outputs.fees.preview.base_price)}
                      </span>
                    </div>
                    <div>
                      List commission:{' '}
                      <span className="opacity-80">
                        {usd(result.outputs.fees.preview.list_commission_amount)}
                      </span>
                    </div>
                    <div>
                      Concessions:{' '}
                      <span className="opacity-80">
                        {usd(result.outputs.fees.preview.concessions_amount)}
                      </span>
                    </div>
                    <div>
                      Seller close:{' '}
                      <span className="opacity-80">
                        {usd(result.outputs.fees.preview.sell_close_amount)}
                      </span>
                    </div>
                    <div className="col-span-1 lg:col-span-4">
                      Total seller-side:{' '}
                      <span className="opacity-80">
                        {usd(result.outputs.fees.preview.total_seller_side_costs)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Debug */}
            <div>
              <div className="font-semibold mb-2">Debug (Analyze headers)</div>
              <div className="text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  Token registry path:{' '}
                  <span className="opacity-80">{debug?.tokenRegistryPath ?? '—'}</span>
                </div>
                <div>
                  Registry exists:{' '}
                  <span className="opacity-80">{debug?.tokenRegistryExists ?? '—'}</span>
                </div>
                <div>
                  Tokens resolved:{' '}
                  <span className="opacity-80">{debug?.tokenResolvedCount ?? '0'}</span>
                </div>
                <div>
                  Cap type: <span className="opacity-80">{debug?.capType ?? '—'}</span>
                </div>
                <div>
                  Cap value: <span className="opacity-80">{debug?.capValue ?? '—'}</span>
                </div>
                <div>
                  List commission pct:{' '}
                  <span className="opacity-80">{debug?.feeListCommissionPct ?? '—'}</span>
                </div>
                <div>
                  Concessions pct:{' '}
                  <span className="opacity-80">{debug?.feeConcessionsPct ?? '—'}</span>
                </div>
                <div>
                  Sell-close pct:{' '}
                  <span className="opacity-80">{debug?.feeSellClosePct ?? '—'}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">Trace ({result.trace.length})</div>
              <div className="text-xs overflow-auto max-h-64 rounded-lg border border-white/10">
                <table className="w-full">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="text-left p-2">Rule</th>
                      <th className="text-left p-2">Used</th>
                      <th className="text-left p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trace.map((t, i) => (
                      <tr key={i} className="odd:bg-white/5 align-top">
                        <td className="p-2">{t.rule}</td>
                        <td className="p-2 font-mono text-[11px]">{t.used.join(', ')}</td>
                        <td className="p-2 font-mono text-[11px]">
                          {t.details ? JSON.stringify(t.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
